import { createHash } from "node:crypto";
import { z } from "zod";

export const branchReconciliationStatuses = [
  "resuelto",
  "ambiguo",
  "huérfano",
  "inconsistente"
] as const;

export type BranchReconciliationStatus =
  (typeof branchReconciliationStatuses)[number];

export type BranchEvidenceSource =
  | "visita"
  | "venta"
  | "sesión_caja"
  | "compra"
  | "lote"
  | "membresía"
  | "seguimiento"
  | "expediente";

export type BranchOwnershipEvidence = {
  source: BranchEvidenceSource;
  branchCode: string | null;
};

export type BranchOwnershipRecord = {
  recordId: string;
  currentBranchCode: string | null;
  evidence: readonly BranchOwnershipEvidence[];
  conflict?: Extract<BranchReconciliationStatus, "ambiguo" | "inconsistente">;
  needsReconciliation?: boolean;
};

export type ManualBranchDecision = {
  recordId: string;
  branchCode: string;
};

export type ManualBranchDecisionFile = {
  version: 1;
  domain: string;
  decisions: ManualBranchDecision[];
};

export type BranchReconciliationEntry = {
  recordId: string;
  status: BranchReconciliationStatus;
  currentBranchCode: string | null;
  resolvedBranchCode: string | null;
  candidateBranchCodes: string[];
  resolution: "existing" | "derived" | "manual" | null;
};

export type BranchReconciliationChange = {
  recordId: string;
  fromBranchCode: string | null;
  toBranchCode: string;
  resolution: Exclude<BranchReconciliationEntry["resolution"], "existing" | null>;
};

export type BranchReconciliationReport = {
  schemaVersion: 1;
  domain: string;
  mode: "dry-run" | "apply";
  counts: {
    before: { total: number; assigned: number; unassigned: number };
    after: { total: number; assigned: number; unassigned: number };
  };
  statuses: Record<BranchReconciliationStatus, number>;
  checksums: { before: string; after: string };
  writes: { planned: number; applied: number };
  unresolved: Array<{
    recordId: string;
    status: Exclude<BranchReconciliationStatus, "resuelto">;
    candidateBranchCodes: string[];
  }>;
};

export type BranchReconciliationPlan = {
  entries: BranchReconciliationEntry[];
  changes: BranchReconciliationChange[];
  report: BranchReconciliationReport;
};

const technicalIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9:_-]+$/);

const branchCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[A-Za-z0-9_-]+$/);

const manualDecisionFileSchema = z.object({
  version: z.literal(1),
  domain: z.string().trim().min(1).max(100),
  decisions: z.array(
    z.object({
      recordId: technicalIdSchema,
      branchCode: branchCodeSchema
    })
  )
});

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function checksum(rows: readonly string[]) {
  return createHash("sha256").update(rows.join("\n"), "utf8").digest("hex");
}

function ownershipChecksum(
  entries: readonly BranchReconciliationEntry[],
  phase: "before" | "after"
) {
  return checksum(
    entries.map((entry) => {
      const branchCode =
        phase === "before"
          ? entry.currentBranchCode
          : entry.resolvedBranchCode ?? entry.currentBranchCode;
      return `${entry.recordId}\u0000${branchCode ?? "<sin-sucursal>"}`;
    })
  );
}

function classifyRecord(input: {
  record: BranchOwnershipRecord;
  decision?: ManualBranchDecision;
  knownBranchCodes: ReadonlySet<string>;
}): BranchReconciliationEntry {
  const { record, decision, knownBranchCodes } = input;
  const candidateBranchCodes = uniqueSorted(
    record.evidence.flatMap((item) => (item.branchCode ? [item.branchCode] : []))
  );
  const hasUnknownBranch = [record.currentBranchCode, ...candidateBranchCodes].some(
    (branchCode) => branchCode !== null && !knownBranchCodes.has(branchCode)
  );

  if (decision) {
    return {
      recordId: record.recordId,
      status: "resuelto",
      currentBranchCode: record.currentBranchCode,
      resolvedBranchCode: decision.branchCode,
      candidateBranchCodes,
      resolution: "manual"
    };
  }

  if (hasUnknownBranch || record.conflict === "inconsistente") {
    return {
      recordId: record.recordId,
      status: "inconsistente",
      currentBranchCode: record.currentBranchCode,
      resolvedBranchCode: null,
      candidateBranchCodes,
      resolution: null
    };
  }

  if (record.conflict === "ambiguo") {
    return {
      recordId: record.recordId,
      status: "ambiguo",
      currentBranchCode: record.currentBranchCode,
      resolvedBranchCode: null,
      candidateBranchCodes,
      resolution: null
    };
  }

  if (record.currentBranchCode) {
    const evidenceAgrees =
      candidateBranchCodes.length === 0 ||
      (candidateBranchCodes.length === 1 &&
        candidateBranchCodes[0] === record.currentBranchCode);
    return {
      recordId: record.recordId,
      status: evidenceAgrees ? "resuelto" : "inconsistente",
      currentBranchCode: record.currentBranchCode,
      resolvedBranchCode: evidenceAgrees ? record.currentBranchCode : null,
      candidateBranchCodes,
      resolution: evidenceAgrees ? "existing" : null
    };
  }

  if (candidateBranchCodes.length === 0) {
    return {
      recordId: record.recordId,
      status: "huérfano",
      currentBranchCode: null,
      resolvedBranchCode: null,
      candidateBranchCodes,
      resolution: null
    };
  }

  if (candidateBranchCodes.length > 1) {
    return {
      recordId: record.recordId,
      status: "ambiguo",
      currentBranchCode: null,
      resolvedBranchCode: null,
      candidateBranchCodes,
      resolution: null
    };
  }

  return {
    recordId: record.recordId,
    status: "resuelto",
    currentBranchCode: null,
    resolvedBranchCode: candidateBranchCodes[0],
    candidateBranchCodes,
    resolution: "derived"
  };
}

export function parseManualBranchDecisions(
  value: unknown,
  expectedDomain: string
): ManualBranchDecisionFile {
  const parsed = manualDecisionFileSchema.parse(value);
  if (parsed.domain !== expectedDomain) {
    throw new Error("BRANCH_RECONCILIATION_DECISION_DOMAIN_MISMATCH");
  }

  const recordIds = new Set<string>();
  for (const decision of parsed.decisions) {
    if (recordIds.has(decision.recordId)) {
      throw new Error("BRANCH_RECONCILIATION_DUPLICATE_DECISION");
    }
    recordIds.add(decision.recordId);
  }
  return parsed;
}

export function createBranchReconciliationPlan(input: {
  domain: string;
  records: readonly BranchOwnershipRecord[];
  knownBranchCodes: readonly string[];
  decisions?: readonly ManualBranchDecision[];
  mode?: "dry-run" | "apply";
}): BranchReconciliationPlan {
  const knownBranchCodes = new Set(input.knownBranchCodes);
  const records = [...input.records].sort((left, right) =>
    left.recordId.localeCompare(right.recordId)
  );
  const recordIds = new Set(records.map((record) => record.recordId));
  if (recordIds.size !== records.length) {
    throw new Error("BRANCH_RECONCILIATION_DUPLICATE_RECORD");
  }

  const decisions = new Map<string, ManualBranchDecision>();
  for (const decision of input.decisions ?? []) {
    if (!recordIds.has(decision.recordId)) {
      throw new Error("BRANCH_RECONCILIATION_UNKNOWN_RECORD");
    }
    if (!knownBranchCodes.has(decision.branchCode)) {
      throw new Error("BRANCH_RECONCILIATION_UNKNOWN_BRANCH");
    }
    if (decisions.has(decision.recordId)) {
      throw new Error("BRANCH_RECONCILIATION_DUPLICATE_DECISION");
    }
    decisions.set(decision.recordId, decision);
  }

  const entries = records.map((record) => {
    const existing = classifyRecord({ record, knownBranchCodes });
    const decision = decisions.get(record.recordId);
    if (!decision) return existing;
    if (existing.status === "resuelto") {
      if (existing.resolvedBranchCode !== decision.branchCode) {
        throw new Error("BRANCH_RECONCILIATION_STALE_DECISION");
      }
      return existing;
    }
    return classifyRecord({ record, decision, knownBranchCodes });
  });
  const recordById = new Map(records.map((record) => [record.recordId, record]));
  const changes = entries.flatMap<BranchReconciliationChange>((entry) => {
    if (
      entry.status !== "resuelto" ||
      !entry.resolvedBranchCode ||
      !entry.resolution ||
      entry.resolution === "existing"
    ) {
      return [];
    }
    const record = recordById.get(entry.recordId);
    if (
      entry.currentBranchCode === entry.resolvedBranchCode &&
      entry.resolution !== "manual" &&
      !record?.needsReconciliation
    ) {
      return [];
    }
    return [
      {
        recordId: entry.recordId,
        fromBranchCode: entry.currentBranchCode,
        toBranchCode: entry.resolvedBranchCode,
        resolution: entry.resolution
      }
    ];
  });
  const statusCounts = Object.fromEntries(
    branchReconciliationStatuses.map((status) => [
      status,
      entries.filter((entry) => entry.status === status).length
    ])
  ) as Record<BranchReconciliationStatus, number>;
  const assignedBefore = entries.filter((entry) => entry.currentBranchCode !== null).length;
  const assignedAfter = entries.filter(
    (entry) => (entry.resolvedBranchCode ?? entry.currentBranchCode) !== null
  ).length;
  const unresolved = entries.flatMap<BranchReconciliationReport["unresolved"][number]>(
    (entry) =>
      entry.status === "resuelto"
        ? []
        : [
            {
              recordId: entry.recordId,
              status: entry.status,
              candidateBranchCodes: entry.candidateBranchCodes
            }
          ]
  );

  return {
    entries,
    changes,
    report: {
      schemaVersion: 1,
      domain: input.domain,
      mode: input.mode ?? "dry-run",
      counts: {
        before: {
          total: entries.length,
          assigned: assignedBefore,
          unassigned: entries.length - assignedBefore
        },
        after: {
          total: entries.length,
          assigned: assignedAfter,
          unassigned: entries.length - assignedAfter
        }
      },
      statuses: statusCounts,
      checksums: {
        before: ownershipChecksum(entries, "before"),
        after: ownershipChecksum(entries, "after")
      },
      writes: { planned: changes.length, applied: 0 },
      unresolved,
    }
  };
}

export function requireBranchReconciliationWriteConfirmation(input: {
  apply: boolean;
  confirmation?: string;
}) {
  if (input.apply && input.confirmation !== "APPLY_BRANCH_RECONCILIATION") {
    throw new Error("BRANCH_RECONCILIATION_CONFIRMATION_REQUIRED");
  }
}

export function assertBranchReconciliationReady(
  report: BranchReconciliationReport
) {
  const unresolved =
    report.statuses.ambiguo +
    report.statuses["huérfano"] +
    report.statuses.inconsistente;
  if (unresolved > 0 || report.writes.applied !== report.writes.planned) {
    throw new Error("BRANCH_RECONCILIATION_BLOCKS_NOT_NULL");
  }
}
