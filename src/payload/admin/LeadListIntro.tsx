export function LeadListIntro() {
  return (
    <section
      style={{
        background: "var(--theme-elevation-50)",
        border: "1px solid var(--theme-elevation-150)",
        borderRadius: "8px",
        marginBottom: "1rem",
        padding: "1rem"
      }}
    >
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
        Gestion comercial
      </p>
      <h2 style={{ fontSize: "1.35rem", lineHeight: 1.2, margin: "0.35rem 0 0" }}>
        Leads del sitio publico
      </h2>
      <p
        style={{
          color: "var(--theme-elevation-650)",
          fontSize: "0.925rem",
          lineHeight: 1.5,
          margin: "0.5rem 0 0"
        }}
      >
        Usa la busqueda para nombre, telefono o email. Los filtros nativos permiten
        segmentar por estado y fuente, y cada detalle incluye acciones rapidas de contacto.
      </p>
    </section>
  );
}
