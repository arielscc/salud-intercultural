import { describe, expect, it } from "vitest";
import {
  normalizeReminderRuleKey,
  reminderDeduplicationKey,
  renderReminderTemplate,
  scheduleSupervisedReminder
} from "@/features/supervised-reminders/policy";

describe("supervised reminder policy", () => {
  it("normalizes a stable rule key", () => {
    expect(normalizeReminderRuleKey(" Control después de Consulta ")).toBe(
      "control_despues_de_consulta"
    );
  });

  it("renders only documented placeholders", () => {
    expect(
      renderReminderTemplate(
        "Hola {{paciente}}, control de {{tipo}} del {{fecha}} — {{clinica}}.",
        {
          patientName: "Ana",
          eventAt: new Date("2026-08-01T14:00:00.000Z"),
          typeLabel: "evolución"
        }
      )
    ).toContain("Hola Ana, control de evolución");
  });

  it("moves an after-hours reminder to the next allowed morning", () => {
    const scheduled = scheduleSupervisedReminder({
      eventAt: new Date("2026-08-01T23:30:00.000Z"),
      delayDays: 0,
      windowStartMinute: 9 * 60,
      windowEndMinute: 18 * 60,
      weekdays: [1, 2, 3, 4, 5, 6]
    });
    expect(scheduled.toISOString()).toBe("2026-08-03T13:00:00.000Z");
  });

  it("keeps the deduplication key stable across rule versions", () => {
    expect(
      reminderDeduplicationKey({
        ruleKey: "control",
        sourceEvent: "visit_completed",
        sourceId: "visit-1"
      })
    ).toBe("control:visit_completed:visit-1");
  });
});
