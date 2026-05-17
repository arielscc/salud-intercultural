import type { Payload } from "payload";

type LeadDetailActionsProps = {
  id?: number | string;
  payload: Payload;
};

function normalizePhone(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

function createWhatsAppHref(phone: string, name?: string | null) {
  const message = `Hola${name ? ` ${name}` : ""}, te escribimos de Salud Intercultural sobre tu consulta.`;
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`;
}

function createCallHref(phone: string) {
  return `tel:${phone.replace(/\s+/g, "")}`;
}

export async function LeadDetailActions({ id, payload }: LeadDetailActionsProps) {
  if (!id) {
    return null;
  }

  const lead = await payload.findByID({
    id,
    collection: "lead-submissions",
    overrideAccess: false
  });

  if (!lead?.phone) {
    return null;
  }

  return (
    <div
      style={{
        border: "1px solid var(--theme-elevation-150)",
        borderRadius: "8px",
        display: "grid",
        gap: "0.75rem",
        marginBottom: "1rem",
        padding: "1rem"
      }}
    >
      <div>
        <p
          style={{
            color: "var(--theme-elevation-500)",
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            margin: 0,
            textTransform: "uppercase"
          }}
        >
          Acciones comerciales
        </p>
        <p
          style={{
            color: "var(--theme-elevation-650)",
            fontSize: "0.925rem",
            lineHeight: 1.5,
            margin: "0.35rem 0 0"
          }}
        >
          Contacto rapido para seguimiento del lead.
        </p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
        <a href={createWhatsAppHref(lead.phone, lead.name)} style={primaryLinkStyle}>
          WhatsApp
        </a>
        <a href={createCallHref(lead.phone)} style={secondaryLinkStyle}>
          Llamar
        </a>
      </div>
    </div>
  );
}

const primaryLinkStyle = {
  background: "var(--theme-success-500)",
  borderRadius: "6px",
  color: "var(--theme-elevation-0)",
  fontSize: "0.9rem",
  fontWeight: 700,
  minHeight: "2.5rem",
  padding: "0.65rem 1rem",
  textDecoration: "none"
};

const secondaryLinkStyle = {
  background: "var(--theme-elevation-900)",
  borderRadius: "6px",
  color: "var(--theme-elevation-0)",
  fontSize: "0.9rem",
  fontWeight: 700,
  minHeight: "2.5rem",
  padding: "0.65rem 1rem",
  textDecoration: "none"
};
