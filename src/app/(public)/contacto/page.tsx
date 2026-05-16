import { PublicPageShell } from "@/components/public/PublicPageShell";
import { PremiumCard } from "@/components/shared/PremiumCard";
import { siteConfig } from "@/config/site";

export default function ContactoPage() {
  return (
    <PublicPageShell
      eyebrow="Contacto"
      title="Comunícate con Salud Intercultural"
      description="Centraliza WhatsApp, llamada, dirección, horarios y formulario de consulta para la captación de pacientes."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {[
          ["WhatsApp", siteConfig.contact.whatsapp],
          ["Teléfono", siteConfig.contact.phone],
          ["Correo", siteConfig.contact.email],
          ["Horario", siteConfig.contact.schedule],
          ["Zona", `${siteConfig.contact.zone}, ${siteConfig.contact.city}`],
          ["Dirección", siteConfig.contact.address]
        ].map(([label, value]) => (
          <PremiumCard key={label} tone="soft">
            <h2 className="font-sora text-lg font-semibold text-text">{label}</h2>
            <p className="mt-2 text-sm leading-7 text-muted">{value}</p>
          </PremiumCard>
        ))}
      </div>
    </PublicPageShell>
  );
}
