import Link from "next/link";
import { Boxes, PhoneCall, UserRoundPlus } from "lucide-react";
import { getFollowUpWorkSummary } from "@/modules/database/queries/follow-ups";
import { getInventorySummary } from "@/modules/database/queries/inventory";
import { requireInternalUser } from "@/modules/permissions";
import { buttonVariants } from "@/components/internal/ui/Button";
import { KpiCard } from "@/components/internal/ui/KpiCard";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { cn } from "@/lib/cn";

export default async function SigecoDashboardPage() {
  const user = await requireInternalUser();
  const followUpSummary = await getFollowUpWorkSummary(
    user.role === "captacion" ? user.id : undefined
  );
  const inventorySummary = await getInventorySummary();

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Trabajo de hoy"
        description="Panel operativo"
        actions={
          <Link href="/sigeco/recepcion/nuevo" className={cn(buttonVariants({ size: "sm" }))}>
            <UserRoundPlus className="h-4 w-4" aria-hidden="true" />
            Registrar llegada
          </Link>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={PhoneCall}
          label="Seguimientos hoy"
          value={followUpSummary.today}
          flag={followUpSummary.today > 0 ? { tone: "warn", label: "Contactar" } : undefined}
        />
        <KpiCard
          icon={Boxes}
          label="Stock bajo"
          value={inventorySummary.lowStock}
          flag={inventorySummary.lowStock > 0 ? { tone: "crit", label: "Reponer" } : undefined}
        />
      </section>
    </div>
  );
}
