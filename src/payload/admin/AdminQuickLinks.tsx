import { adminResourceLinks } from "./adminLinks";

export function AdminQuickLinks() {
  return (
    <div
      style={{
        display: "grid",
        gap: "0.35rem",
        padding: "0.75rem 1rem 1rem"
      }}
    >
      <p
        style={{
          color: "var(--theme-elevation-500)",
          fontSize: "0.75rem",
          fontWeight: 600,
          letterSpacing: "0.08em",
          margin: 0,
          textTransform: "uppercase"
        }}
      >
        Gestion publica
      </p>
      {adminResourceLinks.map((link) => (
        <a
          key={link.href}
          href={link.href}
          style={{
            borderRadius: "6px",
            color: "var(--theme-elevation-800)",
            display: "block",
            fontSize: "0.875rem",
            fontWeight: 600,
            padding: "0.45rem 0.6rem",
            textDecoration: "none"
          }}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
