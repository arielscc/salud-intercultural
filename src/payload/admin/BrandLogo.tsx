/*
 * Wordmark del login del admin (admin.components.graphics.Logo).
 * Replica la marca del sitio publico: monograma SI en teal Marea + nombre.
 */
export function BrandLogo() {
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        textAlign: "center"
      }}
    >
      <span
        aria-hidden="true"
        style={{
          alignItems: "center",
          background: "#068ca8",
          borderRadius: "14px",
          color: "#ffffff",
          display: "flex",
          fontSize: "1.35rem",
          fontWeight: 700,
          height: "3.25rem",
          justifyContent: "center",
          width: "3.25rem"
        }}
      >
        SI
      </span>
      <span>
        <span
          style={{
            color: "var(--theme-text)",
            display: "block",
            fontSize: "1.15rem",
            fontWeight: 700,
            lineHeight: 1.2
          }}
        >
          Salud Intercultural
        </span>
        <span
          style={{
            color: "var(--theme-elevation-500)",
            display: "block",
            fontSize: "0.8rem",
            fontWeight: 500,
            marginTop: "0.15rem"
          }}
        >
          Panel de contenido
        </span>
      </span>
    </div>
  );
}
