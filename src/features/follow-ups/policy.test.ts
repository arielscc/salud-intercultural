import { describe, expect, it } from "vitest";
import {
  canRoleCreateFollowUpType,
  canRoleWorkFollowUpType,
  followUpDomainByType,
  followUpResultCreatesDoctorCall,
  followUpResultKeepsTaskOpen,
  followUpResultsByType
} from "@/features/follow-ups/policy";

describe("follow-up classification policy", () => {
  it("gives all follow-up work to Reception; the deprecated Seguimiento role does none", () => {
    expect(canRoleWorkFollowUpType("recepcion", "treatment_recovery")).toBe(
      true
    );
    expect(canRoleWorkFollowUpType("recepcion", "administrative")).toBe(true);
    expect(canRoleWorkFollowUpType("seguimiento", "treatment_recovery")).toBe(
      false
    );
    expect(canRoleCreateFollowUpType("seguimiento", "treatment_recovery")).toBe(
      false
    );
    expect(canRoleCreateFollowUpType("seguimiento", "administrative")).toBe(
      false
    );
    expect(canRoleWorkFollowUpType("administracion", "administrative")).toBe(
      true
    );
  });

  it("reserves medical calls for the doctor", () => {
    expect(canRoleWorkFollowUpType("medico", "doctor_call")).toBe(true);
    expect(canRoleWorkFollowUpType("recepcion", "doctor_call")).toBe(false);
    expect(canRoleWorkFollowUpType("administracion", "doctor_call")).toBe(
      false
    );
  });

  it("separates administrative and clinical relationships", () => {
    expect(followUpDomainByType.administrative).toBe("administrative");
    expect(followUpDomainByType.evolution).toBe("clinical");
    expect(followUpDomainByType.doctor_call).toBe("clinical");
  });

  it("keeps unanswered contacts open and escalates worsening", () => {
    expect(followUpResultKeepsTaskOpen("no_answer")).toBe(true);
    expect(followUpResultKeepsTaskOpen("rescheduled")).toBe(true);
    expect(followUpResultCreatesDoctorCall("worsened")).toBe(true);
    expect(
      followUpResultsByType.administrative.includes("worsened")
    ).toBe(false);
  });
});
