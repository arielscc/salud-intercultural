import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OperationalQueueRefresh } from "@/components/internal/OperationalQueueRefresh";
import { DESKTOP_QUEUE_REFRESH_INTERVAL_MS } from "@/features/operational-queues/refresh-policy";

const { refreshMock } = vi.hoisted(() => ({
  refreshMock: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock })
}));

function setVisibility(value: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("OperationalQueueRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T22:00:00.000Z"));
    refreshMock.mockReset();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      })
    });
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true
    });
    setVisibility("visible");
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("refreshes automatically once when the desktop interval expires", () => {
    render(
      <OperationalQueueRefresh
        queueKey="reception"
        serverUpdatedAt="2026-07-29T22:00:00.000Z"
      />
    );

    act(() => {
      vi.advanceTimersByTime(DESKTOP_QUEUE_REFRESH_INTERVAL_MS);
    });

    expect(refreshMock).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("does not refresh while a form contains unapplied changes", () => {
    render(
      <>
        <form>
          <input aria-label="Ciudad" defaultValue="El Alto" />
        </form>
        <OperationalQueueRefresh
          queueKey="reception"
          serverUpdatedAt="2026-07-29T22:00:00.000Z"
        />
      </>
    );

    fireEvent.change(screen.getByLabelText("Ciudad"), {
      target: { value: "La Paz" }
    });
    fireEvent.click(screen.getByRole("button", { name: /Actualizar/ }));

    expect(refreshMock).not.toHaveBeenCalled();
    expect(
      screen.getByText("Hay cambios sin aplicar · actualización pausada")
    ).toBeInTheDocument();
  });

  it("pauses in the background and resumes with a single request", () => {
    setVisibility("hidden");
    render(
      <OperationalQueueRefresh
        queueKey="nursing"
        serverUpdatedAt="2026-07-29T22:00:00.000Z"
      />
    );

    act(() => {
      vi.advanceTimersByTime(DESKTOP_QUEUE_REFRESH_INTERVAL_MS * 2);
    });
    expect(refreshMock).not.toHaveBeenCalled();

    act(() => {
      setVisibility("visible");
    });
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});
