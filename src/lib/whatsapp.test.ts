import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createCallLink,
  createContextualWhatsAppLink,
  createDirectWhatsAppLink,
  createWhatsAppLink,
  createWhatsAppMessage
} from "@/lib/whatsapp";

describe("whatsapp helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds contextual messages from service, topic or page", () => {
    expect(createWhatsAppMessage({ service: "sueroterapia" })).toBe(
      "Hola, quiero consultar por sueroterapia."
    );
    expect(createWhatsAppMessage({ topic: "gastritis" })).toBe(
      "Hola, quiero consultar por gastritis."
    );
    expect(createWhatsAppMessage({ pagePath: "/contacto" })).toContain("página de contacto");
  });

  it("normalizes WhatsApp and call links", () => {
    expect(createWhatsAppLink("Hola mundo", "+591 700-000-00")).toBe(
      "https://wa.me/59170000000?text=Hola%20mundo"
    );
    expect(createWhatsAppLink("Hola mundo", "70000000")).toBe(
      "https://wa.me/59170000000?text=Hola%20mundo"
    );
    expect(createContextualWhatsAppLink({ service: "consulta" }, "+591 700 000 00")).toContain(
      "https://wa.me/59170000000?text="
    );
    expect(createCallLink("+591 700 000 00")).toBe("tel:+59170000000");
  });

  it("builds direct WhatsApp links with optional message text", () => {
    expect(createDirectWhatsAppLink("54353453")).toBe("https://wa.me/59154353453");
    expect(createDirectWhatsAppLink("54353453", "Hola Canela")).toBe(
      "https://wa.me/59154353453?text=Hola%20Canela"
    );
  });

  it("neutralizes WhatsApp and call links in staging", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "staging");

    expect(createWhatsAppLink("Mensaje", "+59170000000")).toBe(
      "#staging-contact-blocked"
    );
    expect(createDirectWhatsAppLink("70000000")).toBe("#staging-contact-blocked");
    expect(createCallLink("+59170000000")).toBe("#staging-contact-blocked");
  });
});
