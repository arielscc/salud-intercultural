import { notFound } from "next/navigation";
import { ConfirmForm } from "@/components/internal/ConfirmForm";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Button } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import {
  requireInternalUserPasswordChangeAction,
  revokeManagedInternalUserSessionsAction,
  unlockManagedInternalUserAction,
  updateManagedInternalUserAccessAction
} from "@/features/internal-auth/user-management-actions";
import {
  assignableInternalRoles,
  internalRoleLabels
} from "@/features/internal-auth/permissions";
import { formatDateTime } from "@/lib/dates";
import { getManagedInternalUserById } from "@/modules/database/queries/internal-users";
import { requirePermission } from "@/modules/permissions";

type UserDetailPageProps = {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ error?: string }>;
};

const errorMessages: Record<string, string> = {
  "invalid-access": "Revisa el rol y el estado seleccionados.",
  self_role_change: "No puedes cambiar el rol de tu propia cuenta.",
  self_deactivate: "No puedes desactivar tu propia cuenta.",
  last_super_admin: "No se puede quitar el acceso al último super administrador activo.",
  invalid_role: "El rol seleccionado no está permitido.",
  user_not_found: "El usuario ya no existe.",
  invalid: "No se pudo actualizar el acceso."
};

export default async function UserDetailPage({ params, searchParams }: UserDetailPageProps) {
  const actor = await requirePermission("users_manage");
  const [{ userId }, query] = await Promise.all([params, searchParams]);
  const user = await getManagedInternalUserById(userId);
  if (!user) notFound();

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <MobileBackLink href="/sigeco/usuarios" label="Volver a Usuarios" />

      <div className="grid gap-4">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted">Cuenta interna</p>
              <h2 className="font-sora text-xl font-bold text-text">{user.name ?? "Sin nombre"}</h2>
              <p className="mt-1 text-sm text-muted">{user.email}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Chip tone={user.active ? "success" : "error"} dot>
                {user.active ? "Activo" : "Inactivo"}
              </Chip>
              {user.mustChangePassword ? (
                <Chip tone="warning">Cambio de contraseña pendiente</Chip>
              ) : null}
              {user.lockedUntil && user.lockedUntil > new Date() ? (
                <Chip tone="error">Bloqueado</Chip>
              ) : null}
            </div>
          </div>
          <dl className="mt-4 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted">Rol actual</dt>
              <dd className="font-semibold text-text">{internalRoleLabels[user.role]}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Último acceso</dt>
              <dd className="font-semibold text-text">
                {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Nunca"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Sesiones activas</dt>
              <dd className="font-semibold tabular-nums text-text">{user.sessions.length}</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-0">
          <CardHeader
            title="Sesiones activas"
            description="Dispositivos que todavía pueden entrar con esta cuenta."
            className="mb-0 p-[18px] pb-3"
          />
          {user.sessions.length ? (
            <ul className="divide-y divide-border border-t border-border">
              {user.sessions.map((session) => (
                <li key={session.id} className="flex items-center justify-between gap-3 px-[18px] py-3">
                  <div>
                    <p className="text-sm font-semibold text-text">
                      {session.deviceLabel ?? "Dispositivo no identificado"}
                    </p>
                    <p className="text-xs text-muted">
                      Inició {formatDateTime(session.createdAt)} · vence{" "}
                      {formatDateTime(session.expiresAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-t border-border px-[18px] py-6 text-center text-sm text-muted">
              No tiene sesiones activas.
            </p>
          )}
        </Card>
      </div>

      <div className="grid gap-4">
        {query.error ? (
          <p className="rounded-[9px] bg-error/10 px-3.5 py-3 text-sm font-medium text-error">
            {errorMessages[query.error] ?? errorMessages.invalid}
          </p>
        ) : null}

        <Card>
          <CardHeader
            title="Rol y estado"
            description="Al cambiar el acceso se cerrarán las sesiones actuales."
          />
          <ConfirmForm
            action={updateManagedInternalUserAccessAction}
            notice="Acceso actualizado"
            confirmTitle="¿Aplicar este cambio de acceso?"
            confirmDescription="El usuario deberá volver a iniciar sesión. El último super administrador no puede quedar inactivo."
            confirmLabel="Aplicar cambio"
            className="grid gap-4"
          >
            <input type="hidden" name="userId" value={user.id} />
            <Field label="Rol">
              <select
                className={internalInputClassName}
                name="role"
                defaultValue={user.role}
                disabled={actor.id === user.id}
                required
              >
                {!assignableInternalRoles.includes(user.role) ? (
                  <option value={user.role} disabled>
                    {internalRoleLabels[user.role]} · rol retirado
                  </option>
                ) : null}
                {assignableInternalRoles.map((role) => (
                  <option key={role} value={role}>
                    {internalRoleLabels[role]}
                  </option>
                ))}
              </select>
            </Field>
            {actor.id === user.id ? <input type="hidden" name="role" value={user.role} /> : null}
            <input type="hidden" name="active" value="false" />
            <label className="flex min-h-11 items-center gap-3 rounded-[9px] border border-border px-3.5 text-sm text-text">
              <input
                type="checkbox"
                name="active"
                value="true"
                defaultChecked={user.active}
                disabled={actor.id === user.id}
                className="h-4 w-4 accent-primary"
              />
              Usuario activo
            </label>
            {actor.id === user.id ? (
              <input type="hidden" name="active" value={user.active ? "true" : "false"} />
            ) : null}
            <SubmitButton variant="outline" pendingLabel="Aplicando...">
              Guardar acceso
            </SubmitButton>
          </ConfirmForm>
        </Card>

        <Card>
          <CardHeader
            title="Acciones de seguridad"
            description="Estas acciones quedan registradas en la auditoría."
          />
          <div className="grid gap-2">
            <ConfirmForm
              action={requireInternalUserPasswordChangeAction}
              notice="Se exigirá una nueva contraseña"
              confirmTitle="¿Forzar cambio de contraseña?"
              confirmDescription="En su próxima navegación, el usuario deberá escribir su contraseña actual y crear una nueva."
              confirmLabel="Forzar cambio"
            >
              <input type="hidden" name="userId" value={user.id} />
              <Button type="submit" variant="outline" className="w-full">
                Forzar cambio de contraseña
              </Button>
            </ConfirmForm>

            <ConfirmForm
              action={unlockManagedInternalUserAction}
              notice="Usuario desbloqueado"
              confirmTitle="¿Desbloquear esta cuenta?"
              confirmDescription="Se reiniciarán los intentos fallidos y podrá volver a iniciar sesión."
              confirmLabel="Desbloquear"
            >
              <input type="hidden" name="userId" value={user.id} />
              <Button
                type="submit"
                variant="outline"
                className="w-full"
                disabled={!user.lockedUntil && user.failedAttempts === 0}
              >
                Desbloquear cuenta
              </Button>
            </ConfirmForm>

            <ConfirmForm
              action={revokeManagedInternalUserSessionsAction}
              notice="Sesiones cerradas"
              confirmTitle="¿Cerrar todas las sesiones?"
              confirmDescription={
                actor.id === user.id
                  ? "También se cerrará esta sesión y tendrás que volver a ingresar."
                  : "El usuario tendrá que volver a iniciar sesión en todos sus dispositivos."
              }
              confirmLabel="Cerrar sesiones"
            >
              <input type="hidden" name="userId" value={user.id} />
              <Button
                type="submit"
                variant="danger"
                className="w-full"
                disabled={user.sessions.length === 0}
              >
                Cerrar todas las sesiones
              </Button>
            </ConfirmForm>
          </div>
        </Card>
      </div>
    </div>
  );
}
