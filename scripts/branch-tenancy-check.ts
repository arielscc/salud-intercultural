import { existsSync, readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { Prisma } from "../src/generated/prisma/client";
import {
  branchTenancyContract,
  type ModelTenancyContract
} from "../src/features/branches/tenancy-contract";

const projectRoot = process.cwd();
const schemaPath = resolve(projectRoot, "prisma/schema.prisma");
const explicitBranchMigrationPath = resolve(
  projectRoot,
  "prisma/migrations/20260908120000_require_explicit_branch_code/migration.sql"
);
const rlsMigrationPath = resolve(
  projectRoot,
  "prisma/migrations/20260911210000_postgres_row_level_security/migration.sql"
);
const rlsClientPath = resolve(projectRoot, "src/modules/database/client.ts");
const hardenedBranchDefaultTables = [
  "Visit",
  "Sale",
  "Payment",
  "CashMovement",
  "PurchasePayment",
  "InventoryMovement",
  "InventoryAdjustment"
] as const;

type SchemaField = {
  name: string;
  type: string;
  optional: boolean;
  list: boolean;
  attributes: string;
  line: number;
};

type SchemaModel = {
  name: string;
  body: string;
  line: number;
  fields: ReadonlyMap<string, SchemaField>;
};

export type TenancyViolation = {
  code: string;
  message: string;
  location?: string;
};

export type CodeTenancyRule =
  | "hardcoded-branch-literal"
  | "branch-write-fallback"
  | "optional-branch-code"
  | "branch-default-parameter"
  | "branch-fallback";

export type CodeTenancyFinding = {
  path: string;
  owner: string;
  rule: CodeTenancyRule;
  line: number;
  excerpt: string;
};

export type TemporaryCodeException = {
  path: string;
  owner: string;
  rule: CodeTenancyRule;
  expectedCount: number;
  remediationTask: number;
  responsible: string;
  reason: string;
};

type ExceptionDefinition = readonly [
  path: string,
  owner: string,
  rule: Exclude<CodeTenancyRule, "branch-write-fallback">,
  expectedCount?: number
];

function temporaryDebt(
  remediationTask: number,
  responsible: string,
  reason: string,
  definitions: readonly ExceptionDefinition[]
): TemporaryCodeException[] {
  return definitions.map(([path, owner, rule, expectedCount = 1]) => ({
    path,
    owner,
    rule,
    expectedCount,
    remediationTask,
    responsible,
    reason
  }));
}

// Inventario exacto de deuda heredada. No se agregan excepciones para código
// nuevo ni para escrituras con fallback. Cada grupo desaparece en su tarea y
// una excepción que deja de coincidir también hace fallar el chequeo.
export const temporaryCodeExceptions: readonly TemporaryCodeException[] = [
];

function lineNumber(source: string, offset: number) {
  return source.slice(0, offset).split("\n").length;
}

function parseSchemaField(line: string, lineIndex: number): SchemaField | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("@@")) return null;
  const match = trimmed.match(/^(\w+)\s+([A-Za-z][A-Za-z0-9_]*)(\?|\[\])?(?:\s+(.*))?$/);
  if (!match) return null;
  return {
    name: match[1],
    type: match[2],
    optional: match[3] === "?",
    list: match[3] === "[]",
    attributes: match[4] ?? "",
    line: lineIndex
  };
}

export function parsePrismaModels(schema: string): ReadonlyMap<string, SchemaModel> {
  const models = new Map<string, SchemaModel>();
  const pattern = /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
  for (const match of schema.matchAll(pattern)) {
    const name = match[1];
    const body = match[2];
    const modelLine = lineNumber(schema, match.index ?? 0);
    const fields = new Map<string, SchemaField>();
    for (const [index, line] of body.split("\n").entries()) {
      const field = parseSchemaField(line, modelLine + index + 1);
      if (field) fields.set(field.name, field);
    }
    models.set(name, { name, body, line: modelLine, fields });
  }
  return models;
}

function hasRestrictiveBranchRelation(model: SchemaModel, fieldName: string) {
  for (const match of model.body.matchAll(/@relation\(([^)]+)\)/g)) {
    const relation = match[1];
    const fields = relation.match(/fields:\s*\[([^\]]+)]/)?.[1]
      .split(",")
      .map((value) => value.trim());
    if (
      fields?.includes(fieldName) &&
      /references:\s*\[\s*code\s*]/.test(relation) &&
      /onDelete:\s*Restrict/.test(relation)
    ) {
      return true;
    }
  }
  return false;
}

function parseRelationArrays(field: SchemaField) {
  const relation = field.attributes.match(/@relation\((.*)\)/)?.[1];
  if (!relation) return null;
  const fields = relation.match(/fields:\s*\[([^\]]+)]/)?.[1]
    .split(",")
    .map((value) => value.trim());
  const references = relation.match(/references:\s*\[([^\]]+)]/)?.[1]
    .split(",")
    .map((value) => value.trim());
  return fields && references ? { fields, references } : null;
}

function hasBranchScopedIdempotency(model: SchemaModel, branchFields: readonly string[]) {
  return branchFields.some((branchField) => {
    const compound = new RegExp(
      `@@unique\\(\\[\\s*${branchField}\\s*,\\s*idempotencyKey\\s*]\\)`
    );
    return compound.test(model.body);
  });
}

export function validateModelTenancy(input: {
  schema: string;
  generatedModelNames: readonly string[];
  contract?: Readonly<Record<string, ModelTenancyContract>>;
}): TenancyViolation[] {
  const contract: Readonly<Record<string, ModelTenancyContract>> =
    input.contract ?? branchTenancyContract;
  const models = parsePrismaModels(input.schema);
  const violations: TenancyViolation[] = [];
  const schemaNames = [...models.keys()].sort();
  const generatedNames = [...input.generatedModelNames].sort();
  const contractNames = Object.keys(contract).sort();

  for (const name of schemaNames) {
    if (!generatedNames.includes(name)) {
      violations.push({
        code: "generated-client-stale",
        message: `El modelo ${name} existe en Prisma pero no en el cliente generado.`
      });
    }
    if (!contract[name]) {
      violations.push({
        code: "unclassified-model",
        message: `El modelo ${name} no está clasificado en el contrato de tenencia.`,
        location: `prisma/schema.prisma:${models.get(name)?.line}`
      });
    }
  }
  for (const name of generatedNames) {
    if (!models.has(name)) {
      violations.push({
        code: "generated-client-stale",
        message: `El cliente generado conserva ${name}, que no existe en el schema.`
      });
    }
  }
  for (const name of contractNames) {
    if (!models.has(name)) {
      violations.push({
        code: "stale-model-contract",
        message: `El contrato clasifica ${name}, que ya no existe en Prisma.`
      });
    }
  }

  for (const [name, model] of models) {
    const modelContract = contract[name];
    if (!modelContract || modelContract.requiredBranchFields.length === 0) continue;
    let observedLegacyIssue: "missing-branch-field" | "nullable-branch-field" | null = null;

    for (const fieldName of modelContract.requiredBranchFields) {
      const field = model.fields.get(fieldName);
      if (!field) {
        observedLegacyIssue = "missing-branch-field";
        continue;
      }
      if (field.attributes.includes("@default")) {
        violations.push({
          code: "branch-default",
          message: `${name}.${fieldName} no puede tener @default.`,
          location: `prisma/schema.prisma:${field.line}`
        });
      }
      if (field.type !== "String" || field.list) {
        violations.push({
          code: "invalid-branch-field",
          message: `${name}.${fieldName} debe ser String.`,
          location: `prisma/schema.prisma:${field.line}`
        });
      }
      if (field.optional) observedLegacyIssue = "nullable-branch-field";
      if (!hasRestrictiveBranchRelation(model, fieldName) && !modelContract.legacyException) {
        violations.push({
          code: "missing-branch-relation",
          message: `${name}.${fieldName} debe tener FK a ClinicBranch(code) con onDelete: Restrict.`,
          location: `prisma/schema.prisma:${field.line}`
        });
      }
    }

    const exception = modelContract.legacyException;
    if (exception && (!exception.responsible.trim() || !exception.reason.trim())) {
      violations.push({
        code: "invalid-model-exception",
        message: `La excepción temporal de ${name} necesita responsable y motivo.`
      });
    }
    if (observedLegacyIssue) {
      if (!exception || exception.issue !== observedLegacyIssue) {
        violations.push({
          code: observedLegacyIssue,
          message: `${name} presenta ${observedLegacyIssue} sin una excepción temporal exacta.`,
          location: `prisma/schema.prisma:${model.line}`
        });
      }
    } else if (exception) {
      violations.push({
        code: "stale-model-exception",
        message: `La excepción temporal de ${name} ya no corresponde al schema y debe retirarse.`
      });
    }
  }

  for (const [name, model] of models) {
    const sourceContract = contract[name];
    if (sourceContract?.scope !== "branch-operation") continue;

    const idempotencyField = model.fields.get("idempotencyKey");
    if (
      idempotencyField &&
      !hasBranchScopedIdempotency(model, sourceContract.requiredBranchFields)
    ) {
      violations.push({
        code: "global-operational-idempotency",
        message: `${name}.idempotencyKey debe ser único junto a la sucursal propietaria.`,
        location: `prisma/schema.prisma:${idempotencyField.line}`
      });
    }

    for (const field of model.fields.values()) {
      const targetContract = contract[field.type];
      if (targetContract?.scope !== "branch-operation") continue;
      const relation = parseRelationArrays(field);
      if (!relation) continue;
      const carriesSourceBranch = relation.fields.some((relationField) =>
        sourceContract.requiredBranchFields.includes(relationField)
      );
      const referencesTargetBranch = relation.references.some((reference) =>
        targetContract.requiredBranchFields.includes(reference)
      );
      if (!carriesSourceBranch || !referencesTargetBranch) {
        violations.push({
          code: "non-composite-operational-relation",
          message: `${name}.${field.name} debe enlazar ${field.type} mediante ID y sucursal.`,
          location: `prisma/schema.prisma:${field.line}`
        });
      }
    }
  }

  const auditEvent = models.get("AuditEvent");
  if (auditEvent) {
    const scope = auditEvent.fields.get("scope");
    const branchCode = auditEvent.fields.get("branchCode");
    if (!scope || scope.type !== "AuditScope" || scope.optional || scope.list) {
      violations.push({
        code: "invalid-audit-scope",
        message: "AuditEvent.scope debe ser AuditScope obligatorio.",
        location: `prisma/schema.prisma:${scope?.line ?? auditEvent.line}`
      });
    }
    if (!branchCode || branchCode.type !== "String" || !branchCode.optional) {
      violations.push({
        code: "invalid-audit-branch-field",
        message: "AuditEvent.branchCode debe ser String?; el CHECK separa platform de branch.",
        location: `prisma/schema.prisma:${branchCode?.line ?? auditEvent.line}`
      });
    } else if (!hasRestrictiveBranchRelation(auditEvent, "branchCode")) {
      violations.push({
        code: "missing-audit-branch-relation",
        message: "AuditEvent.branchCode necesita FK restrictiva a ClinicBranch(code).",
        location: `prisma/schema.prisma:${branchCode.line}`
      });
    }
  }

  return violations;
}

export function validateExplicitBranchMigration(migrationPath = explicitBranchMigrationPath) {
  if (!existsSync(migrationPath)) {
    return [
      {
        code: "missing-explicit-branch-migration",
        message:
          "Falta la migración 20260908120000_require_explicit_branch_code/migration.sql."
      }
    ] satisfies TenancyViolation[];
  }

  const migration = readFileSync(migrationPath, "utf8");
  return hardenedBranchDefaultTables.flatMap<TenancyViolation>((table) =>
    migration.includes(`ALTER TABLE "${table}" ALTER COLUMN "branchCode" DROP DEFAULT;`)
      ? []
      : [
          {
            code: "incomplete-explicit-branch-migration",
            message: `La migración no elimina el default de ${table}.branchCode.`
          }
        ]
  );
}

export function validateRlsBoundary(input?: {
  migrationPath?: string;
  clientPath?: string;
  contract?: Readonly<Record<string, ModelTenancyContract>>;
}) {
  const migrationFile = input?.migrationPath ?? rlsMigrationPath;
  const clientFile = input?.clientPath ?? rlsClientPath;
  const violations: TenancyViolation[] = [];
  if (!existsSync(migrationFile)) {
    return [
      {
        code: "missing-rls-migration",
        message:
          "Falta la migración 20260911210000_postgres_row_level_security/migration.sql."
      }
    ];
  }
  if (!existsSync(clientFile)) {
    return [
      {
        code: "missing-rls-client-boundary",
        message: "Falta la frontera transaccional RLS del cliente Prisma."
      }
    ];
  }

  const migration = readFileSync(migrationFile, "utf8");
  const client = readFileSync(clientFile, "utf8");
  const requiredMigrationMarkers = [
    "CREATE ROLE sigeco_web LOGIN PASSWORD NULL",
    "CREATE ROLE sigeco_maintenance LOGIN PASSWORD NULL",
    "ALTER ROLE sigeco_web NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS",
    "ALTER ROLE sigeco_maintenance NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT BYPASSRLS",
    "REVOKE sigeco_maintenance FROM sigeco_web",
    "ALTER TABLE %I ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE %I FORCE ROW LEVEL SECURITY",
    "OWNER TO sigeco_maintenance",
    "sigeco_continuity_allows"
  ];
  for (const marker of requiredMigrationMarkers) {
    if (!migration.includes(marker)) {
      violations.push({
        code: "incomplete-rls-migration",
        message: `La migración RLS no contiene el control obligatorio: ${marker}.`
      });
    }
  }

  const contract = input?.contract ?? branchTenancyContract;
  for (const [model, tenancy] of Object.entries(contract)) {
    if (tenancy.scope === "global-master") continue;
    if (!migration.includes(`'${model}'`) && !migration.includes(`"${model}"`)) {
      violations.push({
        code: "model-without-rls-policy",
        message: `${model} no está materializado en la migración RLS.`
      });
    }
  }

  for (const setting of [
    "app.branch_code",
    "app.user_id",
    "app.effective_role",
    "app.access_mode",
    "app.continuity_access_id",
    "app.platform_audit_write"
  ]) {
    const transactionLocalSetting = new RegExp(
      `set_config\\('${setting.replaceAll(".", "\\.")}',[\\s\\S]*?, true\\)`
    );
    if (!transactionLocalSetting.test(client)) {
      violations.push({
        code: "non-transactional-rls-setting",
        message: `${setting} debe configurarse con set_config(..., true).`
      });
    }
  }

  return violations;
}

function applicationFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "generated" ? [] : applicationFiles(path);
    }
    if (!/\.(ts|tsx)$/.test(entry.name) || entry.name.includes(".test.")) return [];
    if (entry.name === "payload-types.ts") return [];
    return [path];
  });
}

function propertyName(node: ts.Node): string | null {
  if (!ts.isIdentifier(node) && !ts.isStringLiteral(node)) return null;
  return node.text;
}

function isBranchName(name: string | null) {
  return Boolean(name && (name === "branchCode" || name.endsWith("BranchCode")));
}

function ownerName(node: ts.Node): string {
  let current: ts.Node | undefined = node;
  while (current) {
    if (
      (ts.isFunctionDeclaration(current) ||
        ts.isClassDeclaration(current) ||
        ts.isInterfaceDeclaration(current) ||
        ts.isTypeAliasDeclaration(current) ||
        ts.isMethodDeclaration(current)) &&
      current.name
    ) {
      return current.name.getText();
    }
    if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) {
      return current.name.text;
    }
    current = current.parent;
  }
  return "module";
}

function excerpt(sourceFile: ts.SourceFile, node: ts.Node) {
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line;
  return sourceFile.text.split("\n")[start]?.trim() ?? "";
}

function finding(
  sourceFile: ts.SourceFile,
  absolutePath: string,
  node: ts.Node,
  rule: CodeTenancyRule
): CodeTenancyFinding {
  return {
    path: relative(projectRoot, absolutePath).replaceAll("\\", "/"),
    owner: ownerName(node),
    rule,
    line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
    excerpt: excerpt(sourceFile, node)
  };
}

function expressionContainsBranchCode(node: ts.Node) {
  let found = false;
  const visit = (child: ts.Node) => {
    if (
      (ts.isIdentifier(child) && isBranchName(child.text)) ||
      (ts.isPropertyAccessExpression(child) && isBranchName(child.name.text))
    ) {
      found = true;
      return;
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return found;
}

function isWriteCall(node: ts.Node) {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isCallExpression(current) && ts.isPropertyAccessExpression(current.expression)) {
      return ["create", "createMany", "update", "updateMany", "upsert"].includes(
        current.expression.name.text
      );
    }
    if (ts.isFunctionLike(current) || ts.isSourceFile(current)) return false;
    current = current.parent;
  }
  return false;
}

function isBranchFallbackTarget(node: ts.BinaryExpression) {
  let current: ts.Node = node;
  while (
    ts.isParenthesizedExpression(current.parent) ||
    (ts.isBinaryExpression(current.parent) &&
      (current.parent.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
        current.parent.operatorToken.kind === ts.SyntaxKind.BarBarToken))
  ) {
    current = current.parent;
  }
  const parent = current.parent;
  if (ts.isPropertyAssignment(parent)) return isBranchName(propertyName(parent.name));
  if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
    return /branch/i.test(parent.name.text);
  }
  if (ts.isJsxExpression(parent) && ts.isJsxAttribute(parent.parent)) {
    return isBranchName(propertyName(parent.parent.name));
  }
  return false;
}

export function scanCodeTenancy(files: readonly string[]): CodeTenancyFinding[] {
  const findings: CodeTenancyFinding[] = [];
  for (const absolutePath of files) {
    const source = readFileSync(absolutePath, "utf8");
    const sourceFile = ts.createSourceFile(
      absolutePath,
      source,
      ts.ScriptTarget.Latest,
      true,
      absolutePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
    const visit = (node: ts.Node) => {
      if (
        ts.isStringLiteral(node) &&
        (node.text === "el-alto" || node.text === "cochabamba")
      ) {
        findings.push(
          finding(
            sourceFile,
            absolutePath,
            node,
            isWriteCall(node) ? "branch-write-fallback" : "hardcoded-branch-literal"
          )
        );
      }
      if (
        ((ts.isPropertySignature(node) || ts.isPropertyDeclaration(node)) &&
          isBranchName(propertyName(node.name)) &&
          node.questionToken) ||
        (ts.isParameter(node) && isBranchName(propertyName(node.name)) && node.questionToken)
      ) {
        findings.push(finding(sourceFile, absolutePath, node, "optional-branch-code"));
      }
      if (
        ts.isParameter(node) &&
        isBranchName(propertyName(node.name)) &&
        node.initializer
      ) {
        findings.push(finding(sourceFile, absolutePath, node, "branch-default-parameter"));
      }
      if (
        ts.isBinaryExpression(node) &&
        (node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
          node.operatorToken.kind === ts.SyntaxKind.BarBarToken) &&
        expressionContainsBranchCode(node.left) &&
        isBranchFallbackTarget(node)
      ) {
        findings.push(
          finding(
            sourceFile,
            absolutePath,
            node,
            isWriteCall(node) ? "branch-write-fallback" : "branch-fallback"
          )
        );
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return findings;
}

function findingKey(value: Pick<CodeTenancyFinding, "path" | "owner" | "rule">) {
  return `${value.path}#${value.owner}#${value.rule}`;
}

export function validateCodeFindings(
  findings: readonly CodeTenancyFinding[],
  exceptions: readonly TemporaryCodeException[] = temporaryCodeExceptions
): TenancyViolation[] {
  const violations: TenancyViolation[] = [];
  const grouped = new Map<string, CodeTenancyFinding[]>();
  for (const item of findings) {
    const key = findingKey(item);
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  const exceptionsByKey = new Map<string, TemporaryCodeException>();
  for (const exception of exceptions) {
    const key = findingKey(exception);
    if (!exception.responsible.trim() || !exception.reason.trim()) {
      violations.push({
        code: "invalid-code-exception",
        message: `La excepción necesita responsable y motivo: ${key}.`
      });
    }
    if (exceptionsByKey.has(key)) {
      violations.push({
        code: "duplicate-code-exception",
        message: `Excepción duplicada: ${key}.`
      });
    }
    exceptionsByKey.set(key, exception);
    if (exception.rule === "branch-write-fallback") {
      violations.push({
        code: "forbidden-code-exception",
        message: `Una escritura con fallback de sucursal no admite excepción: ${key}.`
      });
    }
  }

  for (const [key, items] of grouped) {
    const exception = exceptionsByKey.get(key);
    if (!exception || items.some((item) => item.rule === "branch-write-fallback")) {
      for (const item of items) {
        violations.push({
          code: item.rule,
          message: `${item.excerpt}`,
          location: `${item.path}:${item.line} (${item.owner})`
        });
      }
      continue;
    }
    if (items.length !== exception.expectedCount) {
      violations.push({
        code: "code-exception-count-mismatch",
        message: `${key} esperaba ${exception.expectedCount} hallazgo(s), encontró ${items.length}.`
      });
    }
  }
  for (const [key, exception] of exceptionsByKey) {
    if (!grouped.has(key)) {
      violations.push({
        code: "stale-code-exception",
        message: `La excepción de la Tarea ${exception.remediationTask} ya no corresponde: ${key}.`
      });
    }
  }
  return violations;
}

export function runBranchTenancyCheck() {
  const schema = readFileSync(schemaPath, "utf8");
  const generatedModelNames = Object.values(Prisma.ModelName);
  const modelViolations = validateModelTenancy({ schema, generatedModelNames });
  const migrationViolations = validateExplicitBranchMigration();
  const rlsViolations = validateRlsBoundary();
  const scriptFiles = applicationFiles(resolve(projectRoot, "scripts")).filter(
    (path) => !path.endsWith("/branch-tenancy-check.ts")
  );
  const codeFindings = scanCodeTenancy([
    ...applicationFiles(resolve(projectRoot, "src")),
    ...scriptFiles
  ]);
  const codeViolations = validateCodeFindings(codeFindings);
  const violations = [
    ...modelViolations,
    ...migrationViolations,
    ...rlsViolations,
    ...codeViolations
  ];

  if (violations.length > 0) {
    console.error(`Contrato de tenencia rechazado (${violations.length} problema(s)):`);
    for (const violation of violations) {
      console.error(
        `- [${violation.code}] ${violation.location ? `${violation.location}: ` : ""}${violation.message}`
      );
    }
    return false;
  }

  const scopeCounts = Object.values(branchTenancyContract).reduce<Record<string, number>>(
    (counts, contract) => {
      counts[contract.scope] = (counts[contract.scope] ?? 0) + 1;
      return counts;
    },
    {}
  );
  const modelExceptionCount = Object.values(branchTenancyContract).filter(
    (contract) => contract.legacyException
  ).length;
  console.log(
    [
      `Contrato de tenencia aprobado: ${generatedModelNames.length} modelos clasificados.`,
      `Alcances: ${Object.entries(scopeCounts)
        .map(([scope, count]) => `${scope}=${count}`)
        .join(", ")}.`,
      `Deuda temporal: modelos=${modelExceptionCount}, código=${temporaryCodeExceptions.length}.`
    ].join("\n")
  );
  return true;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain && !runBranchTenancyCheck()) process.exitCode = 1;
