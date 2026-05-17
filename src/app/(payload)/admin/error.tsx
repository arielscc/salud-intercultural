"use client";

export default function AdminError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main style={{ padding: "2rem" }}>
      <section
        style={{
          border: "1px solid var(--theme-error-250)",
          borderRadius: "8px",
          display: "grid",
          gap: "0.85rem",
          padding: "1rem"
        }}
      >
        <p
          style={{
            color: "var(--theme-error-700)",
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            margin: 0,
            textTransform: "uppercase"
          }}
        >
          Error del panel
        </p>
        <h1 style={{ fontSize: "1.5rem", lineHeight: 1.2, margin: 0 }}>
          No pudimos cargar esta vista administrativa
        </h1>
        <p
          style={{
            color: "var(--theme-elevation-600)",
            fontSize: "0.925rem",
            lineHeight: 1.55,
            margin: 0
          }}
        >
          {error.message || "Intenta nuevamente o vuelve al dashboard del panel."}
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            alignSelf: "start",
            background: "var(--theme-elevation-900)",
            border: 0,
            borderRadius: "6px",
            color: "var(--theme-elevation-0)",
            cursor: "pointer",
            fontWeight: 700,
            minHeight: "2.5rem",
            padding: "0 1rem"
          }}
        >
          Reintentar
        </button>
      </section>
    </main>
  );
}
