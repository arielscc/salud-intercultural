import { describe, expect, it } from "vitest";
import {
  createFollowUpAttemptSchema,
  createFollowUpTaskSchema
} from "@/features/follow-ups/schemas/follow-up.schema";

describe("follow-up schemas", () => {
  it("validates patient follow-up task input", () => {
    const parsed = createFollowUpTaskSchema.parse({
      patientId: "patient_1",
      title: "Llamar para control",
      dueAt: "2026-06-01T10:00"
    });

    expect(parsed.patientId).toBe("patient_1");
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
});
