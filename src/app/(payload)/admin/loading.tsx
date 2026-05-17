export default function AdminLoading() {
  return (
    <main style={{ padding: "2rem" }}>
      <section
        style={{
          border: "1px solid var(--theme-elevation-150)",
          borderRadius: "8px",
          display: "grid",
          gap: "0.75rem",
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
          Cargando panel
        </p>
        <div
          style={{
            background: "var(--theme-elevation-100)",
            borderRadius: "6px",
            height: "2rem",
            maxWidth: "24rem"
          }}
        />
        <div
          style={{
            background: "var(--theme-elevation-100)",
            borderRadius: "6px",
            height: "6rem"
          }}
        />
      </section>
    </main>
  );
}
