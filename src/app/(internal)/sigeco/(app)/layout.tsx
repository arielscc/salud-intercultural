import { Suspense } from "react";
import { ActionNotice } from "@/components/internal/ActionNotice";
import { DesktopBreadcrumb } from "@/components/internal/DesktopBreadcrumb";
import { InternalShell } from "@/components/internal/InternalShell";
import { ConnectivityGuard } from "@/components/internal/ConnectivityGuard";
import { Toaster } from "@/components/ui/sonner";
import { requireInternalUser } from "@/modules/permissions";
import { getModuleAccessState } from "@/modules/database/queries/modules";
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
  // Una sola lectura por request cubre el menú, el aviso de suspensión y las
  // guardas de cada página: `getModuleAccessState` está memoizado.
  const [branchContext, moduleAccess] = await Promise.all([
    getBranchContext(user),
    getModuleAccessState()
  ]);
  return (
    <InternalShell user={user} branchContext={branchContext} moduleAccess={moduleAccess}>
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
