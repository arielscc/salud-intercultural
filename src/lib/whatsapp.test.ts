import { describe, expect, it } from "vitest";
import {
  createCallLink,
  createContextualWhatsAppLink,
  createWhatsAppLink,
  createWhatsAppMessage
} from "@/lib/whatsapp";

describe("whatsapp helpers", () => {
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
    expect(createContextualWhatsAppLink({ service: "consulta" }, "+591 700 000 00")).toContain(
      "https://wa.me/59170000000?text="
    );
    expect(createCallLink("+591 700 000 00")).toBe("tel:+59170000000");
  });
});
