import { CircleCheck, CircleSlash, Lock, PauseCircle } from "lucide-react";
import { ConfirmForm } from "@/components/internal/ConfirmForm";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import { RecordTable } from "@/components/internal/ui/RecordList";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import {
  resolveActivationBlockers,
  resolveDeactivationBlockers
} from "@/features/modules/activation";
import {
  getSigecoModule,
  sigecoLaunchStages,
  type SigecoModuleCode
} from "@/features/modules/catalog";
import { setModuleActivationAction } from "@/features/modules/actions";
import { formatDateTime } from "@/lib/dates";
import {
  getModuleActivationHistory,
  getModuleActivationStates,
  getModulePendingWork
} from "@/modules/database/queries/modules";
import { requirePermission } from "@/modules/permissions";

type ModulesPageProps = {
  searchParams: Promise<{ error?: string; faltan?: string }>;
};

const errorMessages: Record<string, string> = {
  missing_dependencies: "Falta encender antes",
  required_by_active_modules: "Primero hay que apagar",
  always_active: "El núcleo no se apaga: sin él nadie podría entrar al sistema.",
  reason_required: "Apagar un módulo exige un motivo escrito.",
  unknown_module: "Ese módulo no existe en el catálogo.",
  invalid: "No se pudo cambiar el estado del módulo."
};

function moduleNames(codes: string[]) {
  return codes
    .map((code) => getSigecoModule(code as SigecoModuleCode).name)
    .join(", ");
}

function errorMessage(error?: string, faltan?: string) {
  if (!error) return null;
  const base = errorMessages[error] ?? errorMessages.invalid;
  const codes = faltan?.split(",").filter(Boolean) ?? [];

  return codes.length > 0 ? `${base}: ${moduleNames(codes)}.` : base;
}

export default async function ModulesPage({ searchParams }: ModulesPageProps) {
  const user = await requirePermission("modules_read");
  const [params, states, history] = await Promise.all([
    searchParams,
    getModuleActivationStates(),
    getModuleActivationHistory({ limit: 40 })
  ]);

  const canManage = roleHasPermission(user.role, "modules_manage");
  const activeModules = states.filter((state) => state.active).map((state) => state.code);
  // Suspendido es el que estuvo lanzado y se apagó: ahí sí puede haber trabajo
  // abierto que alguien tiene que resolver.
  const suspendedCodes = states
    .filter((state) => !state.active && state.deactivatedAt)
    .map((state) => state.code);
  const pendingWork = await getModulePendingWork(suspendedCodes);
  const notice = errorMessage(params.error, params.faltan);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Módulos de SIGECO"
        description="Qué está lanzado hoy y qué falta encender"
      />

      {notice ? (
        <Card className="border-error/30 bg-error/5">
          <p className="text-sm font-semibold text-error">{notice}</p>
        </Card>
      ) : null}

      {!canManage ? (
        <Card className="border-border bg-surface-soft/40">
          <p className="text-sm text-muted">
            Estás viendo el estado y el historial. Encender y apagar módulos es
            una acción del super administrador.
          </p>
        </Card>
      ) : null}

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {sigecoLaunchStages.map((stage) => {
          const done = stage.modules.filter((code) => activeModules.includes(code)).length;
          const complete = done === stage.modules.length;

          return (
            <Card key={stage.stage} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-text">
                  Etapa {stage.stage} · {stage.name}
                </p>
                <Chip tone={complete ? "success" : done > 0 ? "warning" : "neutral"}>
                  {done}/{stage.modules.length}
                </Chip>
              </div>
              <p className="mt-1 text-xs text-muted">
                {stage.modules.map((code) => getSigecoModule(code).name).join(" · ")}
              </p>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        {states.map((entry) => {
          const activationBlockers = resolveActivationBlockers(activeModules, entry.code);
          const deactivationBlockers = resolveDeactivationBlockers(activeModules, entry.code);
          const suspended = !entry.active && Boolean(entry.deactivatedAt);

          return (
            <Card key={entry.code} className="grid gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-text">{entry.name}</h2>
                    {entry.alwaysActive ? (
                      <Chip tone="primary">
                        <Lock className="h-3 w-3" aria-hidden="true" />
                        Siempre activo
                      </Chip>
                    ) : entry.active ? (
                      <Chip tone="success">
                        <CircleCheck className="h-3 w-3" aria-hidden="true" />
                        Lanzado
                      </Chip>
                    ) : suspended ? (
                      <Chip tone="error">
                        <PauseCircle className="h-3 w-3" aria-hidden="true" />
                        Suspendido
                      </Chip>
                    ) : (
                      <Chip>
                        <CircleSlash className="h-3 w-3" aria-hidden="true" />
                        Sin lanzar
                      </Chip>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted">{entry.description}</p>
                </div>
              </div>

              <dl className="grid gap-1 border-t border-border pt-3 text-xs">
                <div className="flex gap-2">
                  <dt className="shrink-0 font-semibold text-muted">Necesita</dt>
                  <dd className="text-text">
                    {entry.dependsOn.length > 0
                      ? moduleNames([...entry.dependsOn])
                      : "Nada más"}
                  </dd>
                </div>
                {entry.active && entry.activatedAt ? (
                  <div className="flex gap-2">
                    <dt className="shrink-0 font-semibold text-muted">Lanzado</dt>
                    <dd className="text-text">
                      {formatDateTime(entry.activatedAt)}
                      {entry.activatedBy
                        ? ` · ${entry.activatedBy.name ?? entry.activatedBy.email}`
                        : ""}
                    </dd>
                  </div>
                ) : null}
                {suspended && entry.deactivatedAt ? (
                  <>
                    <div className="flex gap-2">
                      <dt className="shrink-0 font-semibold text-muted">Apagado</dt>
                      <dd className="text-text">
                        {formatDateTime(entry.deactivatedAt)}
                        {entry.deactivatedBy
                          ? ` · ${entry.deactivatedBy.name ?? entry.deactivatedBy.email}`
                          : ""}
                      </dd>
                    </div>
                    {entry.note ? (
                      <div className="flex gap-2">
                        <dt className="shrink-0 font-semibold text-muted">Motivo</dt>
                        <dd className="text-text">{entry.note}</dd>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </dl>

              {suspended ? (
                <div className="rounded-[9px] border border-warning/30 bg-warning/10 p-3">
                  <p className="text-xs font-semibold text-warning">
                    Trabajo abierto que quedó dentro
                  </p>
                  <dl className="mt-2 grid gap-1 text-xs">
                    {(pendingWork.find((work) => work.code === entry.code)?.items ?? []).map(
                      (item) => (
                        <div key={item.label} className="flex justify-between gap-3">
                          <dt className="text-muted">{item.label}</dt>
                          <dd className="font-semibold tabular-nums text-text">{item.count}</dd>
                        </div>
                      )
                    )}
                    {(pendingWork.find((work) => work.code === entry.code)?.items.length ?? 0) ===
                    0 ? (
                      <p className="text-muted">Este módulo no acumula pendientes.</p>
                    ) : null}
                  </dl>
                  <p className="mt-2 text-xs text-muted">
                    Se conserva tal como quedó. Reactivar el módulo no cierra ni
                    reabre nada por su cuenta.
                  </p>
                </div>
              ) : null}

              {canManage && !entry.alwaysActive ? (
                <div className="border-t border-border pt-3">
                  {entry.active ? (
                    deactivationBlockers.length > 0 ? (
                      <p className="text-xs text-muted">
                        Para apagarlo hay que apagar antes{" "}
                        <span className="font-semibold text-text">
                          {moduleNames([...deactivationBlockers])}
                        </span>
                        .
                      </p>
                    ) : (
                      <ConfirmForm
                        action={setModuleActivationAction}
                        notice="Módulo apagado"
                        confirmTitle={`Apagar ${entry.name}`}
                        confirmDescription="Se oculta y deja de aceptar cambios. Los datos y el trabajo abierto se conservan."
                        confirmLabel="Apagar módulo"
                        confirmAtAllWidths
                        className="grid gap-2"
                      >
                        <input type="hidden" name="code" value={entry.code} />
                        <input type="hidden" name="active" value="false" />
                        <Field label="Motivo *">
                          <input
                            name="reason"
                            required
                            minLength={4}
                            maxLength={240}
                            placeholder="Por qué se apaga"
                            className={internalInputClassName}
                          />
                        </Field>
                        <SubmitButton variant="danger" size="sm">
                          Apagar módulo
                        </SubmitButton>
                      </ConfirmForm>
                    )
                  ) : activationBlockers.length > 0 ? (
                    <p className="text-xs text-muted">
                      Para encenderlo hay que encender antes{" "}
                      <span className="font-semibold text-text">
                        {moduleNames([...activationBlockers])}
                      </span>
                      .
                    </p>
                  ) : (
                    <ConfirmForm
                      action={setModuleActivationAction}
                      notice="Módulo encendido"
                      confirmTitle={`Encender ${entry.name}`}
                      confirmDescription="El personal con permiso lo verá de inmediato en su menú."
                      confirmLabel="Encender"
                      confirmVariant="primary"
                      confirmAtAllWidths
                    >
                      <input type="hidden" name="code" value={entry.code} />
                      <input type="hidden" name="active" value="true" />
                      <SubmitButton size="sm">Encender módulo</SubmitButton>
                    </ConfirmForm>
                  )}
                </div>
              ) : null}
            </Card>
          );
        })}
      </section>

      <Card className="p-0">
        <CardHeader
          className="mb-0 p-[18px] pb-3"
          title="Historial de cambios"
          description="Cada encendido y cada apagado queda registrado y no se puede editar."
        />
        <RecordTable>
          <Table>
            <thead>
              <tr>
                <Th>Módulo</Th>
                <Th>Cambio</Th>
                <Th>Quién</Th>
                <Th>Cuándo</Th>
                <Th>Motivo</Th>
              </tr>
            </thead>
            <tbody>
              {history.map((event) => (
                <Tr key={event.id}>
                  <Td className="font-semibold text-text">
                    {getSigecoModule(event.moduleCode as SigecoModuleCode).name}
                  </Td>
                  <Td>
                    <Chip tone={event.status === "active" ? "success" : "error"}>
                      {event.status === "active" ? "Encendido" : "Apagado"}
                    </Chip>
                  </Td>
                  <Td>{event.actor?.name ?? event.actor?.email ?? "Instalación"}</Td>
                  <Td className="whitespace-nowrap tabular-nums">
                    {formatDateTime(event.occurredAt)}
                  </Td>
                  <Td className="text-muted">{event.reason ?? "—"}</Td>
                </Tr>
              ))}
              {history.length === 0 ? (
                <tr>
                  <Td className="py-8 text-center text-muted" colSpan={5}>
                    Todavía no hay cambios registrados.
                  </Td>
                </tr>
              ) : null}
            </tbody>
          </Table>
        </RecordTable>
      </Card>
    </div>
  );
}
