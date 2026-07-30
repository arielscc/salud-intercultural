import Link from "next/link";
import { Download, Printer } from "lucide-react";
import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { InfoRow } from "@/components/internal/ui/InfoRow";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { buttonVariants } from "@/components/internal/ui/Button";
import { formatMoney } from "@/features/sales/labels";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/cn";
import type { GeneratedDocumentSnapshot } from "@/modules/generated-documents/types";

export function GeneratedDocumentPreview({
  id,
  snapshot,
  backHref,
  generatedBy
}: {
  id: string;
  snapshot: GeneratedDocumentSnapshot;
  backHref: string;
  generatedBy: string;
}) {
  const pdfBase = `/sigeco/api/generated-documents/${encodeURIComponent(id)}/pdf`;
  const isPrescription = snapshot.kind === "prescription";

  return (
    <div className="grid gap-4">
      <MobileBackLink href={backHref} label="Volver al registro" />
      <PageHeader
        title={isPrescription ? "Receta versionada" : "Comprobante interno versionado"}
        description={`${snapshot.documentNumber} · versión ${snapshot.version}`}
        actions={
          <>
            <Link
              className={buttonVariants({ variant: "outline", size: "sm" })}
              href={`${pdfBase}?purpose=download`}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Descargar PDF
            </Link>
            <Link
              className={buttonVariants({ size: "sm" })}
              href={`${pdfBase}?purpose=print`}
              target="_blank"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              Imprimir copia
            </Link>
          </>
        }
        actionsClassName="w-full flex-wrap sm:w-auto"
      />

      <Card
        className={cn(
          "border-l-4",
          isPrescription ? "border-l-primary" : "border-l-warning"
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-text">
              {isPrescription
                ? "Preparada para firma y sello del profesional"
                : "Documento interno: no es factura fiscal"}
            </p>
            <p className="mt-1 text-sm text-muted">
              Esta versión conserva los datos que existían al emitirla. Descargarla
              o imprimir otra copia no cambia el original.
            </p>
          </div>
          <Chip tone={isPrescription ? "success" : "warning"}>
            Versión {snapshot.version}
          </Chip>
        </div>
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="hidden min-h-[720px] overflow-hidden p-0 md:block">
          <iframe
            className="h-[78vh] min-h-[720px] w-full border-0"
            src={pdfBase}
            title={`Vista previa ${snapshot.documentNumber}`}
          />
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader
              title="Datos controlados"
              description="Resumen legible también desde teléfono"
            />
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <InfoRow label="Paciente" value={snapshot.patient.fullName} />
              <InfoRow label="Código" value={snapshot.patient.internalCode} />
              <InfoRow label="Documento" value={snapshot.patient.identityDocument} />
              <InfoRow label="Emitido" value={formatDateTime(new Date(snapshot.issuedAt))} />
              <InfoRow label="Registrado por" value={generatedBy} />
            </dl>
          </Card>

          {snapshot.kind === "prescription" ? (
            <Card>
              <CardHeader
                title="Tratamiento indicado"
                description={`Versión clínica ${snapshot.prescription.clinicalVersion}`}
              />
              <div className="grid gap-3">
                {snapshot.prescription.items.map((item, index) => (
                  <div
                    key={`${item.medication}-${index}`}
                    className="rounded-[9px] border border-border p-3"
                  >
                    <p className="font-semibold text-text">{item.medication}</p>
                    <p className="mt-1 text-sm text-muted">
                      {[item.dose, item.frequency, item.duration]
                        .filter(Boolean)
                        .join(" · ") || "Sin detalle adicional"}
                    </p>
                    {item.observations ? (
                      <p className="mt-2 text-sm text-text">{item.observations}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader
                title="Totales confirmados"
                description="Calculados desde la venta y sus pagos"
              />
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <InfoRow label="Total" value={formatMoney(snapshot.sale.totalCents)} />
                <InfoRow label="Pagado" value={formatMoney(snapshot.sale.paidCents)} />
                <InfoRow label="Saldo" value={formatMoney(snapshot.sale.balanceCents)} />
                <InfoRow
                  label="Conceptos"
                  value={`${snapshot.sale.items.length}`}
                />
              </dl>
            </Card>
          )}

          <Card className="md:hidden">
            <p className="text-sm text-muted">
              En teléfono se muestra este resumen para evitar una vista PDF
              pequeña. Usa “Descargar PDF” o “Imprimir copia” cuando necesites el
              documento completo.
            </p>
          </Card>

          <Card>
            <p className="text-xs leading-relaxed text-muted">
              No envíes este documento por canales personales. Compártelo solo
              mediante el mecanismo autorizado por la clínica y con la persona
              correcta.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

