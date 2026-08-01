import { Suspense } from "react";
import { ActionNotice } from "@/components/internal/ActionNotice";
import { DesktopBreadcrumb } from "@/components/internal/DesktopBreadcrumb";
import { InternalShell } from "@/components/internal/InternalShell";
import { ConnectivityGuard } from "@/components/internal/ConnectivityGuard";
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
      <ConnectivityGuard />
      <DesktopBreadcrumb />
      {children}
      {/* Posiciones separadas: movil conserva abajo; desktop usa esquina superior derecha. */}
      <div className="sm:hidden">
        <Toaster />
      </div>
      <div className="hidden lg:block">
        <Toaster position="top-right" />
      </div>
      <Suspense fallback={null}>
        <ActionNotice />
      </Suspense>
    </InternalShell>
  );
}
