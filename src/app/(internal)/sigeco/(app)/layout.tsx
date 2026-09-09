import { Suspense } from "react";
import { ActionNotice } from "@/components/internal/ActionNotice";
import { DesktopBreadcrumb } from "@/components/internal/DesktopBreadcrumb";
import { InternalShell } from "@/components/internal/InternalShell";
import { ConnectivityGuard } from "@/components/internal/ConnectivityGuard";
import { Toaster } from "@/components/ui/sonner";
import { getModuleAccessState } from "@/features/modules/request-state";
import { requireBranchPageContext } from "@/features/branches/boundaries";

export const dynamic = "force-dynamic";

export default async function SigecoAppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const branchContext = await requireBranchPageContext();
  const { user } = branchContext;
  // Los módulos lanzados se leen una sola vez por request, igual que la sucursal
  // activa; `getActiveModules` está memoizado, así que las guardas de cada
  // página reutilizan esta misma consulta.
  // Una sola lectura por request cubre el menú, el aviso de suspensión y las
  // guardas de cada página: `getModuleAccessState` está memoizado.
  const moduleAccess = await getModuleAccessState();
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
