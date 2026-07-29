import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  findLatestIncidentEvidence,
  productionSecurityBlockers,
  requiredSecurityArtifacts,
  securityGateApprovalPath,
  task8SecurityReviewReportPath,
  validateSecurityGateApproval,
  validateIncidentEvidence
} from "./security-gate";

const directories: string[] = [];

function validEvidence(performedAt = "2026-07-29T12:00:00.000Z") {
  return {
    formatVersion: 1,
    runId: "incident-run-1",
    performedAt,
    environment: "local-isolated",
    result: "passed",
    containment: {
      revokedSessions: 2,
      remainingSessions: 0,
      passwordChangeRequired: true,
      appendOnlyProtected: true
    },
    recovery: {
      migrationCount: 15,
      clinicalFilesVerified: 1
    }
  };
}

function validApproval() {
  return {
    formatVersion: 1,
    approvedAt: "2026-07-29T20:00:00-04:00",
    approvedByRole: "direccion",
    scope: "task_8_incident_response_and_security_gate",
    decision: "approved",
    productionAuthorized: false,
    openCriticalOrHighFindings: 0,
    approvalReference:
      "Direccion solicito expresamente completar la Tarea 8.",
    incidentEvidenceRunId: "incident-run-1",
    securityReviewReport: task8SecurityReviewReportPath,
    productionBlockers: [...productionSecurityBlockers]
  };
}

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    )
  );
});

describe("SIGECO security readiness gate", () => {
  it("requires every security baseline artifact", () => {
    expect(requiredSecurityArtifacts).toEqual(
      expect.arrayContaining([
        ".github/workflows/ci.yml",
        "docs/operations/audit-events.md",
        "docs/operations/backup-restore.md",
        "docs/operations/incident-response.md",
        task8SecurityReviewReportPath,
        securityGateApprovalPath
      ])
    );
  });

  it("keeps remote checks and Direction approval outside the local pass", () => {
    expect(productionSecurityBlockers).toEqual(
      expect.arrayContaining([
        "required_checks_remote",
        "staging_role_qa",
        "production_backup_restore",
        "direction_production_approval"
      ])
    );
  });

  it("accepts Direction approval of the Task 8 gate without approving production", () => {
    expect(() =>
      validateSecurityGateApproval(
        validApproval(),
        validEvidence(),
        new Date("2026-07-30T00:01:00.000Z")
      )
    ).not.toThrow();
  });

  it.each([
    { ...validApproval(), formatVersion: 2 },
    { ...validApproval(), approvedByRole: "super_admin" },
    { ...validApproval(), scope: "production" },
    { ...validApproval(), decision: "pending" },
    { ...validApproval(), productionAuthorized: true },
    { ...validApproval(), openCriticalOrHighFindings: 1 },
    { ...validApproval(), approvalReference: "short" },
    { ...validApproval(), incidentEvidenceRunId: "another-run" },
    { ...validApproval(), securityReviewReport: "another-report.md" },
    { ...validApproval(), approvedAt: "2026-07-31T00:00:00.000Z" },
    { ...validApproval(), productionBlockers: ["required_checks_remote"] }
  ])("rejects an invalid or overbroad Direction approval", (approval) => {
    expect(() =>
      validateSecurityGateApproval(
        approval,
        validEvidence(),
        new Date("2026-07-30T00:01:00.000Z")
      )
    ).toThrow();
  });

  it("accepts recent evidence with containment, audit and recovery", () => {
    expect(() =>
      validateIncidentEvidence(
        validEvidence(),
        new Date("2026-08-01T12:00:00.000Z")
      )
    ).not.toThrow();
  });

  it.each([
    { ...validEvidence(), environment: "production" },
    { ...validEvidence(), formatVersion: 2 },
    { ...validEvidence(), result: "failed" },
    {
      ...validEvidence(),
      containment: { ...validEvidence().containment, remainingSessions: 1 }
    },
    {
      ...validEvidence(),
      containment: {
        ...validEvidence().containment,
        appendOnlyProtected: false
      }
    },
    {
      ...validEvidence(),
      containment: {
        ...validEvidence().containment,
        passwordChangeRequired: false
      }
    },
    {
      ...validEvidence(),
      recovery: { ...validEvidence().recovery, clinicalFilesVerified: 0 }
    }
  ])("rejects incomplete or unsafe incident evidence", (evidence) => {
    expect(() =>
      validateIncidentEvidence(
        evidence,
        new Date("2026-08-01T12:00:00.000Z")
      )
    ).toThrow();
  });

  it("rejects evidence older than 90 days", () => {
    expect(() =>
      validateIncidentEvidence(
        validEvidence("2026-01-01T00:00:00.000Z"),
        new Date("2026-07-29T00:00:00.000Z")
      )
    ).toThrow(/expired/i);
  });

  it("selects the newest evidence file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "sigeco-gate-"));
    directories.push(directory);
    await writeFile(
      join(directory, "20260728.json"),
      JSON.stringify(validEvidence("2026-07-28T12:00:00.000Z"))
    );
    await writeFile(
      join(directory, "20260729.json"),
      JSON.stringify(validEvidence())
    );

    const latest = await findLatestIncidentEvidence(directory);
    expect(latest.file).toMatch(/20260729\.json$/);
  });
});
