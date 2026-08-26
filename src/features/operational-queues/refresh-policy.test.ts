import { describe, expect, it } from "vitest";
import {
  DESKTOP_QUEUE_REFRESH_INTERVAL_MS,
  MOBILE_QUEUE_REFRESH_INTERVAL_MS,
  hasUnsavedQueueInput,
  isFormDirty,
  isQueueRefreshDue,
  isQueueRefreshStale,
  queueRefreshInterval
} from "@/features/operational-queues/refresh-policy";

describe("operational queue refresh policy", () => {
  it("uses a slower interval on mobile", () => {
    expect(queueRefreshInterval(false)).toBe(
      DESKTOP_QUEUE_REFRESH_INTERVAL_MS
    );
    expect(queueRefreshInterval(true)).toBe(MOBILE_QUEUE_REFRESH_INTERVAL_MS);
  });

  it("marks a queue due and later stale", () => {
    expect(isQueueRefreshDue(1_000, 31_000, 30_000)).toBe(true);
    expect(isQueueRefreshStale(1_000, 31_000, 30_000)).toBe(false);
    expect(isQueueRefreshStale(1_000, 61_000, 30_000)).toBe(true);
  });

  it("detects changed fields without treating hidden action fields as dirty", () => {
    const form = document.createElement("form");
    form.innerHTML = `
      <input type="hidden" name="visitId" value="visit-1" />
      <input name="city" value="El Alto" />
      <select name="status">
        <option value="active" selected>Activo</option>
        <option value="closed">Cerrado</option>
      </select>
    `;
    document.body.append(form);

    expect(isFormDirty(form)).toBe(false);
    const city = form.elements.namedItem("city") as HTMLInputElement;
    city.value = "La Paz";
    expect(isFormDirty(form)).toBe(true);

    form.remove();
  });

  it("detects controlled queue searches marked by a client component", () => {
    const guard = document.createElement("div");
    guard.dataset.queueRefreshDirty = "true";
    document.body.append(guard);

    expect(hasUnsavedQueueInput(document)).toBe(true);

    guard.remove();
  });
});
