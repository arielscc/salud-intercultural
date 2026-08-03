import Link from "next/link";
import { MonitorCog } from "lucide-react";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { PasswordInput } from "@/components/internal/PasswordInput";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { buttonVariants } from "@/components/internal/ui/Button";
import { createManagedInternalUserAction } from "@/features/internal-auth/user-management-actions";
import {
  assignableInternalRoles,
  internalRoleLabels
} from "@/features/internal-auth/permissions";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { getManagedInternalUsers } from "@/modules/database/queries/internal-users";
import { requirePermission } from "@/modules/permissions";

type UsersPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const errorMessages: Record<string, string> = {
  "invalid-user": "Revisa el nombre, email, rol y contraseña temporal.",
  "weak-password":
    "La contraseña temporal debe tener al menos 6 caracteres con mayúsculas, minúsculas y números, y no puede ser común o fácil de adivinar.",
  email_exists: "Ya existe un usuario con ese email.",
  invalid_role: "El rol seleccionado ya no está permitido.",
  invalid: "No se pudo crear el usuario."
};

export default async function UsersPage({ searchParams }: UsersPageProps) {
  await requirePermission("users_manage");
  const params = await searchParams;
  const users = await getManagedInternalUsers();

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Usuarios y accesos"
        description="Cuentas del personal, roles vigentes y sesiones activas"
      />

      <Card className="lg:hidden">
        <div className="flex items-start gap-3">
          <MonitorCog className="mt-0.5 h-5 w-5 shrink-0 text-primary-dark" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-semibold text-text">Administración desde computadora</h3>
            <p className="mt-1 text-sm text-muted">
              Crear usuarios y cambiar roles se realiza en escritorio para reducir errores.
              Desde este teléfono puedes administrar tus propias sesiones en Mi cuenta.
            </p>
            <Link
              href="/sigeco/mi-cuenta"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}
            >
              Ir a Mi cuenta
            </Link>
          </div>
        </div>
      </Card>

      <div className="hidden items-start gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="p-0">
          <CardHeader
            title="Personal registrado"
            description={`${users.length} cuenta${users.length === 1 ? "" : "s"} en SIGECO`}
            className="mb-0 p-[18px] pb-3"
          />
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-surface-soft text-xs text-muted">
                <tr>
                  <th className="px-4 py-3">Persona</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Último acceso</th>
                  <th className="px-4 py-3">Sesiones</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-text">{user.name ?? "Sin nombre"}</p>
                      <p className="text-xs text-muted">{user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-text">{internalRoleLabels[user.role]}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Chip tone={user.active ? "success" : "error"} dot>
                          {user.active ? "Activo" : "Inactivo"}
                        </Chip>
                        {user.mustChangePassword ? (
                          <Chip tone="warning">Debe cambiar contraseña</Chip>
                        ) : null}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                      {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Nunca"}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-text">
                      {user._count.sessions}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/sigeco/usuarios/${user.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Administrar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Crear usuario"
            description="La contraseña es temporal y deberá cambiarse al ingresar."
          />
          {params.error ? (
            <p className="mb-4 rounded-[9px] bg-error/10 px-3 py-2.5 text-sm text-error">
              {errorMessages[params.error] ?? errorMessages.invalid}
            </p>
          ) : null}
          <form action={createManagedInternalUserAction} className="grid gap-4">
            <Field label="Nombre completo">
              <input className={internalInputClassName} name="name" maxLength={100} required />
            </Field>
            <Field label="Email">
              <input
                className={internalInputClassName}
                type="email"
                name="email"
                autoComplete="off"
                maxLength={200}
                required
              />
            </Field>
            <Field label="Rol">
              <select
                className={internalInputClassName}
                name="role"
                defaultValue=""
                required
              >
                <option value="" disabled>
                  Selecciona un rol
                </option>
                {assignableInternalRoles.map((role) => (
                  <option key={role} value={role}>
                    {internalRoleLabels[role]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Contraseña temporal">
              <PasswordInput
                name="temporaryPassword"
                autoComplete="new-password"
                minLength={6}
                maxLength={128}
                required
              />
            </Field>
            <p className="text-xs text-muted">
              Mínimo 6 caracteres con mayúsculas, minúsculas y números. Evita contraseñas
              comunes o con patrones fáciles. Comunícala directamente al empleado, no en grupos.
            </p>
            <SubmitButton pendingLabel="Creando...">Crear usuario</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
