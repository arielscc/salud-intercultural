import {
  BadgeDollarSign,
  CircleDollarSign,
  Megaphone,
  MousePointerClick,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Button, buttonVariants } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { KpiCard } from "@/components/internal/ui/KpiCard";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import {
  RecordItem,
  RecordList,
  RecordListEmpty,
  RecordTable
} from "@/components/internal/ui/RecordList";
import { Table, Td, Th, Tr } from "@/components/internal/ui/Table";
import {
  createCaptureSourceAction,
  updateCaptureSourceAction
} from "@/features/attribution/actions";
import {
  attributionTrafficTypeLabels,
  captureSourceCategoryOptions
} from "@/features/attribution/catalog";
import { boliviaDepartments } from "@/features/geography/origin";
import { roleHasPermission } from "@/features/internal-auth/permissions";
import { formatMoney } from "@/features/sales/labels";
import { dateOnlyRange, monthRange, toDateOnlyString } from "@/lib/dates";
import {
  getCaptureAttributionReport,
  getCaptureCatalog
} from "@/modules/database/queries/attribution";
import { requirePermission } from "@/modules/permissions";

type AttributionPageProps = {
  searchParams: Promise<{
    desde?: string;
    hasta?: string;
    ciudad?: string;
    departamento?: string;
    error?: string;
    aviso?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  "fuente-invalida": "Revisa los datos de la fuente.",
  "campana-invalida": "Revisa el código, la fuente y las fechas de la campaña."
};

export default async function AttributionPage({
  searchParams
}: AttributionPageProps) {
  const user = await requirePermission("reports_read");
  const filters = await searchParams;
  const currentMonth = monthRange();
  const requestedRange = dateOnlyRange(filters.desde, filters.hasta);
  const from = requestedRange.start ?? currentMonth.start;
  const to = requestedRange.end ?? currentMonth.end;
  const city = filters.ciudad?.trim().slice(0, 120) || undefined;
  const department =
    filters.departamento?.trim().slice(0, 120) || undefined;
  const canManage = roleHasPermission(user.role, "attribution_manage");
  const [report, catalog] = await Promise.all([
    getCaptureAttributionReport({ from, to, city, department }),
    getCaptureCatalog()
  ]);
  const [sources, campaigns] = catalog;
  const defaultFrom = filters.desde ?? toDateOnlyString(currentMonth.start);
  const lastMonthDay = new Date(currentMonth.end.getTime() - 24 * 60 * 60 * 1000);
  const defaultTo = filters.hasta ?? toDateOnlyString(lastMonthDay);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Captación y atribución"
        description="Llegadas, propuestas, ventas e ingresos por fuente"
      />

      {filters.error ? (
        <p className="rounded-[9px] bg-error/10 px-4 py-3 text-sm font-semibold text-error">
          {errorMessages[filters.error] ?? "No se pudo guardar el cambio."}
        </p>
      ) : null}

      <Card>
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end">
          <Field label="Desde">
            <input
              className={internalInputClassName}
              type="date"
              name="desde"
              defaultValue={defaultFrom}
            />
          </Field>
          <Field label="Hasta">
            <input
              className={internalInputClassName}
              type="date"
              name="hasta"
              defaultValue={defaultTo}
            />
          </Field>
          <Field label="Ciudad de llegada">
            <input
              className={internalInputClassName}
              type="search"
              name="ciudad"
              defaultValue={city}
              placeholder="Ej. Cochabamba"
            />
          </Field>
          <Field label="Departamento">
            <select
              className={internalInputClassName}
              name="departamento"
              defaultValue={department ?? ""}
            >
              <option value="">Todos</option>
              {boliviaDepartments.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
          <Button type="submit" variant="outline">
            Comparar
          </Button>
        </form>
      </Card>

      <section className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-5">
        <KpiCard
          icon={MousePointerClick}
          label="Llegadas"
          value={report.totals.arrivals}
          compactMobile
        />
        <KpiCard
          icon={UsersRound}
          label="Pacientes distintos"
          value={report.totals.patients}
          compactMobile
        />
        <KpiCard
          icon={Megaphone}
          label="Propuestas registradas"
          value={report.totals.proposals}
          compactMobile
        />
        <KpiCard
          icon={BadgeDollarSign}
          label="Ventas"
          value={report.totals.sales}
          compactMobile
        />
        <KpiCard
          icon={CircleDollarSign}
          label="Ingresos cobrados"
          value={formatMoney(report.totals.collectedCents)}
          compactMobile
          className="col-span-2 lg:col-span-1"
        />
      </section>

      <Card className="p-0">
        <CardHeader
          className="mb-0 p-[18px] pb-3"
          title="Comparación por fuente"
          description="Principal evita duplicar ventas e ingresos. Influenciada también cuenta los canales de apoyo."
        />
        <RecordList>
          {report.sources.map((source) => (
            <RecordItem
              key={source.code}
              title={source.label}
              status={
                <Chip tone="primary">
                  {source.primaryArrivals} principales
                </Chip>
              }
            >
              <span>{source.assistedArrivals} llegadas influenciadas</span>
              <span>
                {source.proposals} propuestas · {source.sales} ventas
              </span>
              <span className="font-semibold tabular-nums text-text">
                {formatMoney(source.collectedCents)} cobrados
              </span>
            </RecordItem>
          ))}
          {report.sources.length === 0 ? (
            <RecordListEmpty>
              No existen llegadas atribuidas para estos filtros.
            </RecordListEmpty>
          ) : null}
        </RecordList>
        <RecordTable>
          <Table caption="Comparación de resultados por fuente">
            <thead>
              <tr>
                <Th>Fuente</Th>
                <Th className="text-right">Llegadas principales</Th>
                <Th className="text-right">Influenciadas</Th>
                <Th className="text-right">Propuestas</Th>
                <Th className="text-right">Ventas</Th>
                <Th className="text-right">Vendido</Th>
                <Th className="text-right">Cobrado</Th>
              </tr>
            </thead>
            <tbody>
              {report.sources.map((source) => (
                <Tr key={source.code}>
                  <Td className="font-semibold text-text">{source.label}</Td>
                  <Td className="text-right tabular-nums">
                    {source.primaryArrivals}
                  </Td>
                  <Td className="text-right tabular-nums">
                    {source.assistedArrivals}
                  </Td>
                  <Td className="text-right tabular-nums">
                    {source.proposals}
                  </Td>
                  <Td className="text-right tabular-nums">{source.sales}</Td>
                  <Td className="text-right tabular-nums">
                    {formatMoney(source.soldCents)}
                  </Td>
                  <Td className="text-right font-semibold tabular-nums text-text">
                    {formatMoney(source.collectedCents)}
                  </Td>
                </Tr>
              ))}
              {report.sources.length === 0 ? (
                <tr>
                  <Td className="py-8 text-center" colSpan={7}>
                    No existen llegadas atribuidas para estos filtros.
                  </Td>
                </tr>
              ) : null}
            </tbody>
          </Table>
        </RecordTable>
      </Card>

      <Card className="p-0">
        <CardHeader
          className="mb-0 p-[18px] pb-3"
          title="Cuentas y campañas identificadas"
          description="Solo aparecen cuando un código de enlace o formulario entregó evidencia."
        />
        <RecordList>
          {report.campaigns.map((campaign) => (
            <RecordItem
              key={campaign.code}
              title={campaign.accountLabel}
              status={
                <Chip tone={campaign.trafficType === "paid" ? "warning" : "success"}>
                  {attributionTrafficTypeLabels[campaign.trafficType]}
                </Chip>
              }
            >
              <span>{campaign.name}</span>
              <span>
                {campaign.arrivals} llegadas · {campaign.sales} ventas
              </span>
              <span className="font-semibold tabular-nums text-text">
                {formatMoney(campaign.collectedCents)} cobrados
              </span>
            </RecordItem>
          ))}
          {report.campaigns.length === 0 ? (
            <RecordListEmpty>
              Todavía no hay cuentas o campañas verificadas en este período.
            </RecordListEmpty>
          ) : null}
        </RecordList>
        <RecordTable>
          <Table caption="Resultados por cuenta o campaña verificada">
            <thead>
              <tr>
                <Th>Cuenta o campaña</Th>
                <Th>Tipo</Th>
                <Th className="text-right">Llegadas</Th>
                <Th className="text-right">Ventas</Th>
                <Th className="text-right">Cobrado</Th>
              </tr>
            </thead>
            <tbody>
              {report.campaigns.map((campaign) => (
                <Tr key={campaign.code}>
                  <Td>
                    <span className="block font-semibold text-text">
                      {campaign.accountLabel}
                    </span>
                    <span className="text-xs">{campaign.name}</span>
                  </Td>
                  <Td>
                    {attributionTrafficTypeLabels[campaign.trafficType]}
                  </Td>
                  <Td className="text-right tabular-nums">
                    {campaign.arrivals}
                  </Td>
                  <Td className="text-right tabular-nums">{campaign.sales}</Td>
                  <Td className="text-right font-semibold tabular-nums text-text">
                    {formatMoney(campaign.collectedCents)}
                  </Td>
                </Tr>
              ))}
              {report.campaigns.length === 0 ? (
                <tr>
                  <Td className="py-8 text-center" colSpan={5}>
                    Todavía no hay evidencia automática para estos filtros.
                  </Td>
                </tr>
              ) : null}
            </tbody>
          </Table>
        </RecordTable>
      </Card>

      {canManage ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="grid gap-4">
            <CardHeader
              title="Agregar fuente"
              description="La pregunta para el paciente debe seguir siendo corta y fácil."
              className="mb-0"
            />
            <form action={createCaptureSourceAction} className="grid gap-3 sm:grid-cols-2">
              <Field label="Código interno">
                <input
                  className={internalInputClassName}
                  name="code"
                  placeholder="ej. radio"
                  required
                />
              </Field>
              <Field label="Orden">
                <input
                  className={internalInputClassName}
                  type="number"
                  name="sortOrder"
                  defaultValue="100"
                  min="0"
                  max="9999"
                  required
                />
              </Field>
              <Field label="Texto para el paciente">
                <input
                  className={internalInputClassName}
                  name="patientLabel"
                  placeholder="Ej. Radio"
                  required
                />
              </Field>
              <Field label="Nombre interno">
                <input
                  className={internalInputClassName}
                  name="internalLabel"
                  placeholder="Ej. Radio local"
                  required
                />
              </Field>
              <Field label="Categoría">
                <select
                  className={internalInputClassName}
                  name="category"
                  defaultValue="other"
                >
                  {captureSourceCategoryOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Visible en Recepción">
                <select
                  className={internalInputClassName}
                  name="receptionSelectable"
                  defaultValue="true"
                >
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </Field>
              <SubmitButton className="sm:col-span-2" pendingLabel="Guardando...">
                Agregar fuente
              </SubmitButton>
            </form>
          </Card>

          <Card className="grid gap-4">
            <CardHeader
              title="Campañas administradas en Payload"
              description="Marketing edita allí los códigos, cuentas, fechas y tipo de tráfico. SIGECO conserva una copia técnica para relacionar llegadas."
              className="mb-0"
            />
            <p className="text-sm leading-6 text-muted">
              Si la sincronización falla, la llegada se registra con la fuente
              indicada por el paciente y la campaña puede conciliarse después.
            </p>
            <Link
              href="/admin/collections/marketing-campaigns"
              className={`${buttonVariants({ variant: "outline" })} w-full sm:w-fit`}
            >
              Abrir campañas en Payload
            </Link>
          </Card>

          <Card className="p-0 lg:col-span-2">
            <CardHeader
              className="mb-0 p-[18px] pb-3"
              title="Catálogo de fuentes"
              description="Desactivar oculta la opción futura; los registros históricos permanecen."
            />
            <div className="grid gap-3 border-t border-border p-4 lg:grid-cols-2">
              {sources.map((source) => (
                <form
                  key={source.id}
                  action={updateCaptureSourceAction}
                  className="grid gap-3 rounded-[9px] border border-border p-3 sm:grid-cols-2"
                >
                  <input type="hidden" name="sourceId" value={source.id} />
                  <p className="font-mono text-xs text-muted sm:col-span-2">
                    {source.code} · {source._count.attributionTouches} usos
                  </p>
                  <Field label="Texto para el paciente">
                    <input
                      className={internalInputClassName}
                      name="patientLabel"
                      defaultValue={source.patientLabel}
                      required
                    />
                  </Field>
                  <Field label="Nombre interno">
                    <input
                      className={internalInputClassName}
                      name="internalLabel"
                      defaultValue={source.internalLabel}
                      required
                    />
                  </Field>
                  <Field label="Categoría">
                    <select
                      className={internalInputClassName}
                      name="category"
                      defaultValue={source.category}
                    >
                      {captureSourceCategoryOptions.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Orden">
                    <input
                      className={internalInputClassName}
                      type="number"
                      name="sortOrder"
                      defaultValue={source.sortOrder}
                      min="0"
                      max="9999"
                    />
                  </Field>
                  <Field label="Estado">
                    <select
                      className={internalInputClassName}
                      name="active"
                      defaultValue={String(source.active)}
                    >
                      <option value="true">Activa</option>
                      <option value="false">Inactiva</option>
                    </select>
                  </Field>
                  <Field label="Visible en Recepción">
                    <select
                      className={internalInputClassName}
                      name="receptionSelectable"
                      defaultValue={String(source.receptionSelectable)}
                    >
                      <option value="true">Sí</option>
                      <option value="false">No</option>
                    </select>
                  </Field>
                  <SubmitButton
                    className="sm:col-span-2"
                    variant="outline"
                    pendingLabel="Guardando..."
                  >
                    Guardar fuente
                  </SubmitButton>
                </form>
              ))}
            </div>
          </Card>

          <Card className="p-0 lg:col-span-2">
            <CardHeader
              className="mb-0 p-[18px] pb-3"
              title="Campañas y enlaces configurados"
              description="El código se coloca en enlaces como ?camp=TIKTOK-DR o se conserva en el registro comercial."
            />
            <div className="divide-y divide-border border-t border-border">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-text">{campaign.name}</p>
                    <p className="text-xs text-muted">
                      {campaign.code} · {campaign.source.internalLabel} ·{" "}
                      {campaign.accountLabel ?? "Cuenta no identificada"} ·{" "}
                      {attributionTrafficTypeLabels[campaign.trafficType]} ·{" "}
                      {campaign._count.attributions} llegadas
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Chip tone={campaign.active ? "success" : "neutral"}>
                      {campaign.active ? "Activa" : "Inactiva"}
                    </Chip>
                    <Chip tone={campaign.managedByPayload ? "success" : "warning"}>
                      {campaign.managedByPayload ? "Sincronizada" : "Registro anterior"}
                    </Chip>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      ) : (
        <Card>
          <p className="text-sm leading-relaxed text-muted">
            Dirección puede consultar los resultados. Solo las personas con
            permiso de atribución pueden cambiar fuentes. Marketing administra
            campañas y enlaces desde Payload.
          </p>
        </Card>
      )}

      <Card>
        <p className="text-xs leading-relaxed text-muted">
          “Propuestas registradas” usa el resultado explícito guardado por el
          médico y excluye los casos donde no aplicaba proponer tratamiento.
          Los ingresos corresponden a pagos cobrados, no al saldo todavía
          pendiente. Una fuente de apoyo puede aparecer como influenciada, pero
          ventas e ingresos se asignan únicamente a la fuente principal para
          evitar sumarlos dos veces.
        </p>
      </Card>
    </div>
  );
}
