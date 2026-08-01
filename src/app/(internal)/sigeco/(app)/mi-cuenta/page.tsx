import { ConfirmForm } from "@/components/internal/ConfirmForm";
import { PasswordChangeForm } from "@/components/internal/PasswordChangeForm";
import { Button } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { revokeOwnInternalSessionAction } from "@/features/internal-auth/user-management-actions";
import { internalRoleLabels } from "@/features/internal-auth/permissions";
import { formatDateTime } from "@/lib/dates";
import { getActiveSessionsForUser } from "@/modules/database/queries/internal-users";
import { requireInternalSession } from "@/modules/permissions";

type MyAccountPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function MyAccountPage({ searchParams }: MyAccountPageProps) {
  const [currentSession, query] = await Promise.all([requireInternalSession(), searchParams]);
  const sessions = await getActiveSessionsForUser(currentSession.user.id);

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Mi cuenta"
        description="Contraseña y sesiones abiertas en tus dispositivos"
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-4">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-sora text-xl font-bold text-text">
                  {currentSession.user.name ?? "Usuario SIGECO"}
                </h2>
                <p className="mt-1 text-sm text-muted">{currentSession.user.email}</p>
              </div>
              <Chip tone="primary">{internalRoleLabels[currentSession.user.role]}</Chip>
            </div>
          </Card>

          <Card className="p-0">
            <CardHeader
              title="Mis sesiones activas"
              description="Cierra cualquier dispositivo que no reconozcas."
              className="mb-0 p-[18px] pb-3"
            />
            <ul className="divide-y divide-border border-t border-border">
              {sessions.map((session) => {
                const isCurrent = session.id === currentSession.id;
                return (
                  <li
                    key={session.id}
                    className="grid gap-3 px-[18px] py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-text">
                          {session.deviceLabel ?? "Dispositivo no identificado"}
                        </p>
                        {isCurrent ? <Chip tone="success">Esta sesión</Chip> : null}
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        Inició {formatDateTime(session.createdAt)} · vence{" "}
                        {formatDateTime(session.expiresAt)}
                      </p>
                    </div>
                    <ConfirmForm
                      action={revokeOwnInternalSessionAction}
                      notice="Sesión cerrada"
                      confirmTitle={isCurrent ? "¿Cerrar esta sesión?" : "¿Cerrar esta otra sesión?"}
                      confirmDescription={
                        isCurrent
                          ? "Volverás a la pantalla de ingreso."
                          : "Ese dispositivo tendrá que iniciar sesión nuevamente."
                      }
                      confirmLabel="Cerrar sesión"
                      clearLocalDataOnSubmit={isCurrent}
                    >
                      <input type="hidden" name="sessionId" value={session.id} />
                      <Button type="submit" variant={isCurrent ? "danger" : "outline"} size="sm">
                        Cerrar
                      </Button>
                    </ConfirmForm>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        <Card>
          <CardHeader
            title="Cambiar contraseña"
            description="Las demás sesiones se cerrarán automáticamente."
          />
          <PasswordChangeForm returnTo="account" error={query.error} />
        </Card>
      </div>
    </div>
  );
}
