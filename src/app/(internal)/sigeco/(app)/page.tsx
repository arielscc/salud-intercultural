import Link from "next/link";
import { Boxes, PhoneCall, UserRoundPlus } from "lucide-react";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { getFollowUpWorkSummary } from "@/modules/database/queries/follow-ups";
import { getInventorySummary } from "@/modules/database/queries/inventory";
import { requireInternalUser } from "@/modules/permissions";
import { buttonVariants } from "@/components/internal/ui/Button";
import { Card } from "@/components/internal/ui/Card";
import { KpiCard } from "@/components/internal/ui/KpiCard";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { cn } from "@/lib/cn";

export default async function SigecoDashboardPage() {
  const user = await requireInternalUser();
  const canSeeFollowUps = roleHasPermission(user.role, "followups_read");
  const canSeeInventory = roleHasPermission(user.role, "inventory_read");
  const canRegisterArrival = roleHasPermission(user.role, "visits_create");

  const [followUpSummary, inventorySummary] = await Promise.all([
    canSeeFollowUps ? getFollowUpWorkSummary() : null,
    canSeeInventory ? getInventorySummary() : null
  ]);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Trabajo de hoy"
        description="Panel operativo"
        actions={
          canRegisterArrival ? (
            <Link href="/sigeco/recepcion/nuevo" className={cn(buttonVariants({ size: "sm" }))}>
              <UserRoundPlus className="h-4 w-4" aria-hidden="true" />
              Registrar llegada
            </Link>
          ) : undefined
        }
      />

      {!followUpSummary && !inventorySummary ? (
        <Card>
          <p className="text-sm font-semibold text-text">Tu rol no tiene módulos asignados.</p>
          <p className="mt-1 text-sm text-muted">
            Pide a dirección que actualice tu rol para ver el trabajo del día.
          </p>
        </Card>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {followUpSummary ? (
          <KpiCard
            icon={PhoneCall}
            label="Seguimientos hoy"
            value={followUpSummary.today}
            flag={followUpSummary.today > 0 ? { tone: "warn", label: "Contactar" } : undefined}
          />
        ) : null}
        {inventorySummary ? (
          <KpiCard
            icon={Boxes}
            label="Stock bajo"
            value={inventorySummary.lowStock}
            flag={inventorySummary.lowStock > 0 ? { tone: "crit", label: "Reponer" } : undefined}
          />
        ) : null}
      </section>
    </div>
  );
}
