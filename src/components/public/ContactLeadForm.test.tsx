import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContactLeadForm } from "@/components/public/ContactLeadForm";

const trackLeadFormSubmitMock = vi.fn();

vi.mock("@/features/analytics", () => ({
  trackLeadFormSubmit: (...args: unknown[]) => trackLeadFormSubmitMock(...args)
}));

describe("ContactLeadForm", () => {
  beforeEach(() => {
    trackLeadFormSubmitMock.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: "Consulta registrada correctamente." })
      })
    );
  });

  it("shows validation errors before submitting invalid data", async () => {
    const user = userEvent.setup();
    render(<ContactLeadForm origin="contact" />);

    await user.click(screen.getByRole("button", { name: /enviar consulta/i }));

    expect(await screen.findByText("Ingresa tu nombre.")).toBeInTheDocument();
    expect(screen.getByText("Ingresa un teléfono válido.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("submits a valid lead and tracks the conversion", async () => {
    const user = userEvent.setup();
    render(<ContactLeadForm origin="contact" />);

    await user.type(screen.getByLabelText("Nombre"), "Paciente Test");
    await user.type(screen.getByLabelText("Teléfono"), "+591 70000000");
    await user.type(screen.getByLabelText("Motivo de consulta"), "Consulta inicial");
    await user.type(
      screen.getByLabelText("Mensaje"),
      "Quiero recibir orientación sobre una valoración."
    );
    await user.click(screen.getByRole("button", { name: /enviar consulta/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/leads",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" }
        })
      );
    });

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Consulta registrada correctamente."
    );
    expect(trackLeadFormSubmitMock).toHaveBeenCalledWith({
      formOrigin: "contact",
      pagePath: "/contacto",
      source: "website"
    });
  });

  it("shows the server error message when the API rejects the submission", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: "Revisa los datos del formulario." })
      })
    );
    const user = userEvent.setup();
    render(<ContactLeadForm origin="contact" />);

    await user.type(screen.getByLabelText("Nombre"), "Paciente Test");
    await user.type(screen.getByLabelText("Teléfono"), "+591 70000000");
    await user.type(screen.getByLabelText("Motivo de consulta"), "Consulta inicial");
    await user.type(
      screen.getByLabelText("Mensaje"),
      "Quiero recibir orientación sobre una valoración."
    );
    await user.click(screen.getByRole("button", { name: /enviar consulta/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Revisa los datos del formulario."
    );
    expect(trackLeadFormSubmitMock).not.toHaveBeenCalled();
  });
});
