import { describe, expect, it } from "vitest";
import {
  classifyPatientFeedback,
  isFeedbackCaseOverdue
} from "@/features/patient-feedback/policy";

describe("patient feedback policy", () => {
  const submittedAt = new Date("2026-08-01T14:00:00.000Z");

  it("separates a possible clinical incident from a normal survey", () => {
    const result = classifyPatientFeedback({
      rating: 4,
      kind: "complaint",
      healthRiskFlag: true,
      submittedAt
    });
    expect(result).toMatchObject({
      classification: "clinical_safety",
      severity: "critical",
      status: "new"
    });
    expect(result.responseDueAt?.toISOString()).toBe("2026-08-01T18:00:00.000Z");
  });

  it("gives an ordinary complaint a one-day response deadline", () => {
    const result = classifyPatientFeedback({
      rating: 3,
      kind: "complaint",
      healthRiskFlag: false,
      submittedAt
    });
    expect(result.classification).toBe("service");
    expect(result.severity).toBe("priority");
    expect(result.responseDueAt?.toISOString()).toBe("2026-08-02T14:00:00.000Z");
  });

  it("closes a positive survey without inventing a complaint", () => {
    expect(
      classifyPatientFeedback({
        rating: 5,
        kind: "survey",
        healthRiskFlag: false,
        submittedAt
      })
    ).toMatchObject({ status: "closed", severity: "standard" });
  });

  it("marks only unresolved cases past their deadline as overdue", () => {
    expect(
      isFeedbackCaseOverdue(
        { status: "reviewing", responseDueAt: submittedAt },
        new Date("2026-08-01T15:00:00.000Z")
      )
    ).toBe(true);
    expect(
      isFeedbackCaseOverdue(
        { status: "resolved", responseDueAt: submittedAt },
        new Date("2026-08-01T15:00:00.000Z")
      )
    ).toBe(false);
  });
});

