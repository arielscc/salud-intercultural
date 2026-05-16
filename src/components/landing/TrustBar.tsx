import { Activity, MessageCircle, ShieldCheck, UserRoundCheck } from "lucide-react";
import { Container } from "@/components/shared/Container";

const items = [
  { label: "Atención personalizada", icon: UserRoundCheck },
  { label: "Enfoque natural e integrativo", icon: Activity },
  { label: "Consultas y seguimiento", icon: ShieldCheck },
  { label: "Conversión directa por WhatsApp", icon: MessageCircle }
];

export function TrustBar() {
  return (
    <section className="relative z-10 -mt-6">
      <Container>
        <div className="grid gap-3 rounded-3xl border border-border bg-surface p-3 shadow-soft sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-2xl bg-surface-soft/70 p-4">
              <item.icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <p className="text-sm font-semibold text-text">{item.label}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
