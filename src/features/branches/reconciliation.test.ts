import { describe, expect, it } from "vitest";
import {
  assertBranchReconciliationReady,
  createBranchReconciliationPlan,
  parseManualBranchDecisions,
  requireBranchReconciliationWriteConfirmation,
  type BranchOwnershipRecord
} from "./reconciliation";

const records: BranchOwnershipRecord[] = [
  {
    recordId: "row-resolved",
    currentBranchCode: null,
    evidence: [{ source: "visita", branchCode: "el-alto" }]
  },
  {
    recordId: "row-ambiguous",
    currentBranchCode: null,
    evidence: [
      { source: "venta", branchCode: "el-alto" },
      { source: "sesión_caja", branchCode: "cochabamba" }
    ]
  },
  { recordId: "row-orphan", currentBranchCode: null, evidence: [] },
  {
    recordId: "row-inconsistent",
    currentBranchCode: "el-alto",
    evidence: [{ source: "compra", branchCode: "cochabamba" }]
  }
];

describe("branch ownership reconciliation", () => {
  it("classifies only technical evidence and produces a deterministic report", () => {
    const first = createBranchReconciliationPlan({
      domain: "test-domain",
      records,
      knownBranchCodes: ["el-alto", "cochabamba"]
    });
    const second = createBranchReconciliationPlan({
      domain: "test-domain",
      records: [...records].reverse(),
      knownBranchCodes: ["cochabamba", "el-alto"]
    });

    expect(first.report).toEqual(second.report);
    expect(first.report.statuses).toEqual({
      resuelto: 1,
      ambiguo: 1,
      huérfano: 1,
      inconsistente: 1
    });
    expect(JSON.stringify(first.report)).not.toMatch(
      /nombre|tel[eé]fono|diagn[oó]stico|contenido cl[ií]nico/i
    );
  });

  it("accepts explicit decisions only for known records and branches", () => {
    const decisions = parseManualBranchDecisions(
      {
        version: 1,
        domain: "test-domain",
        decisions: [
          { recordId: "row-ambiguous", branchCode: "cochabamba" },
          { recordId: "row-orphan", branchCode: "el-alto" },
          { recordId: "row-inconsistent", branchCode: "el-alto" }
        ]
      },
      "test-domain"
    );
    const plan = createBranchReconciliationPlan({
      domain: "test-domain",
      records,
      knownBranchCodes: ["el-alto", "cochabamba"],
      decisions: decisions.decisions
    });

    expect(plan.report.statuses).toEqual({
      resuelto: 4,
      ambiguo: 0,
      huérfano: 0,
      inconsistente: 0
    });
    expect(() => assertBranchReconciliationReady(plan.report)).toThrow(
      "BRANCH_RECONCILIATION_BLOCKS_NOT_NULL"
    );
    plan.report.writes.applied = plan.report.writes.planned;
    expect(() => assertBranchReconciliationReady(plan.report)).not.toThrow();
    expect(() =>
      createBranchReconciliationPlan({
        domain: "test-domain",
        records,
        knownBranchCodes: ["el-alto", "cochabamba"],
        decisions: [{ recordId: "row-orphan", branchCode: "sede-inventada" }]
      })
    ).toThrow("BRANCH_RECONCILIATION_UNKNOWN_BRANCH");
  });

  it("keeps writes behind an explicit apply confirmation and blocks hardening", () => {
    expect(() =>
      requireBranchReconciliationWriteConfirmation({ apply: true })
    ).toThrow("BRANCH_RECONCILIATION_CONFIRMATION_REQUIRED");
    expect(() =>
      requireBranchReconciliationWriteConfirmation({
        apply: true,
        confirmation: "APPLY_BRANCH_RECONCILIATION"
      })
    ).not.toThrow();
    expect(() =>
      assertBranchReconciliationReady(
        createBranchReconciliationPlan({
          domain: "test-domain",
          records,
          knownBranchCodes: ["el-alto", "cochabamba"]
        }).report
      )
    ).toThrow("BRANCH_RECONCILIATION_BLOCKS_NOT_NULL");
  });

  it("is idempotent after the derived ownership has been persisted", () => {
    const first = createBranchReconciliationPlan({
      domain: "test-domain",
      records: [records[0]],
      knownBranchCodes: ["el-alto"]
    });
    const second = createBranchReconciliationPlan({
      domain: "test-domain",
      records: [
        {
          ...records[0],
          currentBranchCode: first.changes[0]?.toBranchCode ?? null
        }
      ],
      knownBranchCodes: ["el-alto"]
    });

    expect(first.report.checksums.after).toBe(second.report.checksums.before);
    expect(second.changes).toHaveLength(0);
  });

});
