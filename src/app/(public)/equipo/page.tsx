import { PublicPageShell } from "@/components/public/PublicPageShell";
import { PremiumCard } from "@/components/shared/PremiumCard";

const team = [
  "Dra. Cinthia Jessica Chipana Chipana",
  "Dr. Jhonn Franco Chipana Chipana"
];

export default function EquipoPage() {
  return (
    <PublicPageShell
      eyebrow="Equipo"
      title="Equipo profesional"
      description="Presentación base del equipo actual y espacio preparado para sumar nuevos integrantes desde el panel."
    >
      <div className="grid gap-6 md:grid-cols-2">
        {team.map((member) => (
          <PremiumCard key={member} tone="soft">
            <div className="grid aspect-[4/3] place-items-center rounded-[1.25rem] bg-surface-soft text-3xl font-semibold text-primary">
              SI
            </div>
            <h2 className="mt-5 font-sora text-xl font-semibold text-text">{member}</h2>
            <p className="mt-2 text-sm leading-7 text-muted">
              Perfil preparado para foto, cargo, especialidad y descripción editable.
            </p>
          </PremiumCard>
        ))}
      </div>
    </PublicPageShell>
  );
}
