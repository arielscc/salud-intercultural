import { Suspense } from "react";
import { ActionNotice } from "@/components/internal/ActionNotice";
import { DesktopBreadcrumb } from "@/components/internal/DesktopBreadcrumb";
import { InternalShell } from "@/components/internal/InternalShell";
import { ConnectivityGuard } from "@/components/internal/ConnectivityGuard";
import { Toaster } from "@/components/ui/sonner";
import { requireInternalUser } from "@/modules/permissions";
import {
  getActiveModules,
  getSuspendedModules
} from "@/modules/database/queries/modules";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { getBranchContext } from "@/features/branches/context";

export const dynamic = "force-dynamic";

export default async function SigecoAppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await requireInternalUser();
  // Los módulos lanzados se leen una sola vez por request, igual que la sucursal
  // activa; `getActiveModules` está memoizado, así que las guardas de cada
  // página reutilizan esta misma consulta.
  const [branchContext, activeModules, suspendedModules] = await Promise.all([
    getBranchContext(user),
    getActiveModules(),
    // El aviso es para quien puede actuar sobre él: Dirección y super
    // administrador. Para el resto ni siquiera se consulta.
    roleHasPermission(user.role, "modules_read") ? getSuspendedModules() : []
  ]);
  return (
    <InternalShell
      user={user}
      branchContext={branchContext}
      activeModules={activeModules}
      suspendedModules={suspendedModules}
    >
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
