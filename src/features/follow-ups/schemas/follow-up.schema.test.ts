import { describe, expect, it } from "vitest";
import {
  createFollowUpAttemptSchema,
  createFollowUpTaskSchema
} from "@/features/follow-ups/schemas/follow-up.schema";

describe("follow-up schemas", () => {
  it("validates patient follow-up task input", () => {
    const parsed = createFollowUpTaskSchema.parse({
      patientId: "patient_1",
      type: "evolution",
      priority: "high",
      title: "Llamar para control",
      dueAt: "2026-06-01T10:00"
    });

    expect(parsed.patientId).toBe("patient_1");
    expect(parsed.type).toBe("evolution");
    expect(parsed.dueAt).toBeInstanceOf(Date);
  });

  it("validates contact attempt input", () => {
    expect(
      createFollowUpAttemptSchema.parse({
        taskId: "task_1",
        method: "whatsapp",
        result: "wants_return",
        notes: "Pidió nueva cita"
      })
    ).toMatchObject({
      method: "whatsapp",
      result: "wants_return"
    });
  });

  it("rejects invalid follow-up status", () => {
    expect(() =>
      createFollowUpAttemptSchema.parse({
        taskId: "task_1",
        result: "invalid"
      })
    ).toThrow();
  });

  it("requires a new due date when nobody answers", () => {
    expect(
      createFollowUpAttemptSchema.safeParse({
        taskId: "task_1",
        method: "call",
        result: "no_answer"
      }).success
    ).toBe(false);
  });

  it("accepts a rescheduled contact with its next due date", () => {
    expect(
      createFollowUpAttemptSchema.parse({
        taskId: "task_1",
        method: "call",
        result: "rescheduled",
        nextDueAt: "2026-08-01T10:00"
      })
    ).toMatchObject({
      result: "rescheduled",
      nextDueAt: expect.any(Date)
    });
  });
});
