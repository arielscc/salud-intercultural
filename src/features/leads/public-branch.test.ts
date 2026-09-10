import { describe, expect, it } from "vitest";
import {
  createPublicLeadBranchProof,
  verifyPublicLeadBranchProof
} from "@/features/leads/public-branch";

const secret = "test-only-public-lead-branch-secret-123456789";
const expiresAt = new Date("2026-10-01T00:00:00.000Z");

describe("public lead branch proof", () => {
  it("binds the branch to the campaign and expiry", () => {
    const proof = createPublicLeadBranchProof({
      branchCode: "cochabamba",
      campaignCode: "CBBA-AGOSTO",
      expiresAt,
      secret
    });

    expect(
      verifyPublicLeadBranchProof({
        proof,
        campaignCode: "CBBA-AGOSTO",
        now: new Date("2026-09-09T00:00:00.000Z"),
        secret
      })
    ).toBe("cochabamba");
    expect(
      verifyPublicLeadBranchProof({
        proof,
        campaignCode: "EL-ALTO-AGOSTO",
        now: new Date("2026-09-09T00:00:00.000Z"),
        secret
      })
    ).toBeNull();
  });

  it("rejects an expired proof", () => {
    const proof = createPublicLeadBranchProof({
      branchCode: "cochabamba",
      campaignCode: "CBBA-AGOSTO",
      expiresAt,
      secret
    });

    expect(
      verifyPublicLeadBranchProof({
        proof,
        campaignCode: "CBBA-AGOSTO",
        now: expiresAt,
        secret
      })
    ).toBeNull();
  });
});
