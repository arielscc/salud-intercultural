import type { Payload } from "payload";
import type { AdminResourceSlug } from "./adminLinks";
import { adminResourceLinks } from "./adminLinks";

type AdminDashboardProps = {
  payload: Payload;
  user?: {
    email?: string;
    name?: string | null;
    role?: string;
  };
};

type DashboardMetric = {
  count: number | null;
  error?: string;
  href: string;
  label: string;
  slug: AdminResourceSlug;
};

const collectionSlugs = [
  "lead-submissions",
  "services",
  "testimonials",
  "faqs",
  "team-members"
] as const;

async function getCollectionCount(payload: Payload, slug: (typeof collectionSlugs)[number]) {
  const result = await payload.count({
    collection: slug,
    overrideAccess: false
  });

  return result.totalDocs;
}

async function getSiteSettingsState(payload: Payload) {
  const settings = await payload.findGlobal({
    slug: "site-settings",
    overrideAccess: false
  });

  return settings?.updatedAt ? 1 : 0;
}

export async function AdminDashboard({ payload, user }: AdminDashboardProps) {
  if (!user) {
    return (
      <section style={shellStyle}>
        <div style={panelStyle}>
          <p style={eyebrowStyle}>Acceso protegido</p>
          <h1 style={titleStyle}>Inicia sesion para administrar contenido</h1>
          <p style={mutedStyle}>
            El panel usa la autenticacion de Payload y solo muestra herramientas a usuarios
            autorizados.
          </p>
        </div>
      </section>
    );
  }

  const metricResults = await Promise.allSettled([
    ...collectionSlugs.map((slug) => getCollectionCount(payload, slug)),
    getSiteSettingsState(payload)
  ]);

  const metrics = adminResourceLinks.map<DashboardMetric>((link, index) => {
    const result = metricResults[index];

    return {
      count: result?.status === "fulfilled" ? result.value : null,
      error: result?.status === "rejected" ? "No disponible" : undefined,
      href: link.href,
      label: link.label,
      slug: link.slug
    };
  });
  const hasErrors = metrics.some((metric) => metric.error);
  const hasContent = metrics.some((metric) => (metric.count ?? 0) > 0);

  return (
    <section style={shellStyle}>
      <div style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>Panel administrativo</p>
          <h1 style={titleStyle}>Dashboard de Salud Intercultural</h1>
          <p style={mutedStyle}>
            Accesos rapidos para gestionar el contenido publico, revisar leads y mantener
            configuracion institucional.
          </p>
        </div>
        <div style={userCardStyle}>
          <p style={{ ...mutedStyle, margin: 0 }}>Sesion activa</p>
          <p style={{ fontSize: "1rem", fontWeight: 700, margin: "0.35rem 0 0" }}>
            {user.name || user.email || "Usuario admin"}
          </p>
          <p style={{ ...mutedStyle, margin: "0.35rem 0 0" }}>{user.role ?? "admin"}</p>
        </div>
      </div>

      {hasErrors ? (
        <div style={errorStyle}>
          Algunas metricas no se pudieron cargar. Los accesos siguen disponibles para navegar
          directamente a cada seccion.
        </div>
      ) : null}

      {!hasContent ? (
        <div style={emptyStyle}>
          El CMS todavia no tiene contenido publicado en estas secciones. Usa los accesos para
          cargar los primeros registros.
        </div>
      ) : null}

      <div style={gridStyle}>
        {metrics.map((metric) => (
          <a key={metric.slug} href={metric.href} style={cardStyle}>
            <span style={metricLabelStyle}>{metric.label}</span>
            <strong style={metricValueStyle}>
              {metric.error ? metric.error : metric.count ?? 0}
            </strong>
            <span style={mutedStyle}>
              {metric.slug === "site-settings" ? "Estado global" : "Registros"}
            </span>
          </a>
        ))}
      </div>

      <div style={panelStyle}>
        <p style={eyebrowStyle}>Flujo base</p>
        <div style={stepsStyle}>
          <span>1. Revisar leads nuevos</span>
          <span>2. Actualizar servicios destacados</span>
          <span>3. Mantener FAQs y testimonios activos</span>
          <span>4. Verificar configuracion global</span>
        </div>
      </div>
    </section>
  );
}

const shellStyle = {
  display: "grid",
  gap: "1rem",
  marginBottom: "2rem"
};

const heroStyle = {
  alignItems: "stretch",
  background: "var(--theme-elevation-50)",
  border: "1px solid var(--theme-elevation-150)",
  borderRadius: "8px",
  display: "grid",
  gap: "1rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(18rem, 100%), 1fr))",
  padding: "1.25rem"
};

const panelStyle = {
  background: "var(--theme-elevation-0)",
  border: "1px solid var(--theme-elevation-150)",
  borderRadius: "8px",
  padding: "1rem"
};

const userCardStyle = {
  ...panelStyle,
  background: "var(--theme-bg)"
};

const eyebrowStyle = {
  color: "var(--theme-elevation-500)",
  fontSize: "0.75rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  margin: 0,
  textTransform: "uppercase" as const
};

const titleStyle = {
  color: "var(--theme-elevation-1000)",
  fontSize: "2rem",
  lineHeight: 1.1,
  margin: "0.45rem 0 0"
};

const mutedStyle = {
  color: "var(--theme-elevation-600)",
  fontSize: "0.925rem",
  lineHeight: 1.55,
  margin: "0.75rem 0 0"
};

const gridStyle = {
  display: "grid",
  gap: "0.85rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))"
};

const cardStyle = {
  background: "var(--theme-elevation-0)",
  border: "1px solid var(--theme-elevation-150)",
  borderRadius: "8px",
  color: "inherit",
  display: "grid",
  gap: "0.45rem",
  minHeight: "8.5rem",
  padding: "1rem",
  textDecoration: "none"
};

const metricLabelStyle = {
  color: "var(--theme-elevation-700)",
  fontSize: "0.9rem",
  fontWeight: 700
};

const metricValueStyle = {
  color: "var(--theme-elevation-1000)",
  fontSize: "2rem",
  lineHeight: 1
};

const errorStyle = {
  background: "var(--theme-error-100)",
  border: "1px solid var(--theme-error-250)",
  borderRadius: "8px",
  color: "var(--theme-error-900)",
  padding: "0.85rem 1rem"
};

const emptyStyle = {
  background: "var(--theme-warning-100)",
  border: "1px solid var(--theme-warning-250)",
  borderRadius: "8px",
  color: "var(--theme-warning-900)",
  padding: "0.85rem 1rem"
};

const stepsStyle = {
  display: "grid",
  gap: "0.5rem",
  marginTop: "0.9rem"
};
