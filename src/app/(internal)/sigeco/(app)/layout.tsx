import { Suspense } from "react";
import { ActionNotice } from "@/components/internal/ActionNotice";
import { InternalShell } from "@/components/internal/InternalShell";
import { Toaster } from "@/components/ui/sonner";
import { requireInternalUser } from "@/modules/permissions";

export const dynamic = "force-dynamic";

export default async function SigecoAppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await requireInternalUser();
  return (
    <InternalShell user={user}>
      {children}
      {/* Toasts solo movil: en >= sm el contenedor se oculta y desktop queda como hoy. */}
      <div className="sm:hidden">
        <Toaster />
      </div>
      <Suspense fallback={null}>
        <ActionNotice />
      </Suspense>
    </InternalShell>
  );
}
