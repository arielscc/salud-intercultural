import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectivityGuard } from "@/components/internal/ConnectivityGuard";

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value
  });
}

describe("ConnectivityGuard", () => {
  beforeEach(() => setOnline(true));

  it("shows the normal online state", () => {
    render(<ConnectivityGuard />);
    expect(screen.getByText("En línea")).toBeInTheDocument();
  });

  it("blocks a form submission while offline and preserves the screen", () => {
    setOnline(false);
    const submitted = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <>
        <ConnectivityGuard />
        <form onSubmit={submitted}>
          <input aria-label="Dato" defaultValue="Conservar" />
          <button type="submit">Guardar</button>
        </form>
      </>
    );

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(submitted).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("Conservar")).toBeInTheDocument();
    expect(screen.getByText(/No se envió el formulario/)).toBeInTheDocument();
  });

  it("does not retry automatically after recovering connection", () => {
    setOnline(false);
    render(<ConnectivityGuard />);

    setOnline(true);
    fireEvent(window, new Event("online"));

    expect(screen.getByText(/Conexión recuperada/)).toBeInTheDocument();
    expect(screen.getByText(/no reintenta cobros o stock automáticamente/i)).toBeInTheDocument();
  });
});
