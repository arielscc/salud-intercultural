import { describe, expect, it } from "vitest";
import type { ModelTenancyContract } from "../src/features/branches/tenancy-contract";
import {
  validateCodeFindings,
  validateModelTenancy,
  runBranchTenancyCheck,
  type CodeTenancyFinding,
  type TemporaryCodeException
} from "./branch-tenancy-check";

const globalContract: ModelTenancyContract = {
  scope: "global-master",
  remediationTask: 2,
  requiredBranchFields: []
};

const branchContract: ModelTenancyContract = {
  scope: "branch-operation",
  remediationTask: 7,
  requiredBranchFields: ["branchCode"]
};

function schemaFor(branchField: string) {
  return `
model ClinicBranch {
  code       String      @id
  operations Operation[]
}

model Operation {
  id         String       @id
  ${branchField}
  branch     ClinicBranch @relation(fields: [branchCode], references: [code], onDelete: Restrict)
}
`;
}

describe("validateModelTenancy", () => {
  it("rechaza todo modelo nuevo que no esté clasificado", () => {
    const schema = `${schemaFor("branchCode String")}\nmodel Unclassified {\n  id String @id\n}`;
    const violations = validateModelTenancy({
      schema,
      generatedModelNames: ["ClinicBranch", "Operation", "Unclassified"],
      contract: { ClinicBranch: globalContract, Operation: branchContract }
    });

    expect(violations).toContainEqual(
      expect.objectContaining({ code: "unclassified-model" })
    );
  });

  it("rechaza una operación sin branchCode", () => {
    const violations = validateModelTenancy({
      schema: schemaFor("description String"),
      generatedModelNames: ["ClinicBranch", "Operation"],
      contract: { ClinicBranch: globalContract, Operation: branchContract }
    });

    expect(violations).toContainEqual(
      expect.objectContaining({ code: "missing-branch-field" })
    );
  });

  it("rechaza defaults de sucursal aunque la relación sea válida", () => {
    const violations = validateModelTenancy({
      schema: schemaFor('branchCode String @default("el-alto")'),
      generatedModelNames: ["ClinicBranch", "Operation"],
      contract: { ClinicBranch: globalContract, Operation: branchContract }
    });

    expect(violations).toContainEqual(expect.objectContaining({ code: "branch-default" }));
  });
});

describe("contrato vigente del proyecto", () => {
  it("clasifica y valida todo el schema y el código productivo", () => {
    expect(runBranchTenancyCheck()).toBe(true);
  });
});

describe("validateCodeFindings", () => {
  const finding: CodeTenancyFinding = {
    path: "src/example.ts",
    owner: "createRecord",
    rule: "branch-write-fallback",
    line: 10,
    excerpt: 'branchCode: input.branchCode ?? "el-alto"'
  };

  it("no permite exceptuar una escritura con fallback", () => {
    const exception: TemporaryCodeException = {
      path: finding.path,
      owner: finding.owner,
      rule: finding.rule,
      expectedCount: 1,
      remediationTask: 15,
      responsible: "Arquitectura SIGECO",
      reason: "Caso de prueba"
    };

    expect(validateCodeFindings([finding], [exception])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "forbidden-code-exception" }),
        expect.objectContaining({ code: "branch-write-fallback" })
      ])
    );
  });
});
