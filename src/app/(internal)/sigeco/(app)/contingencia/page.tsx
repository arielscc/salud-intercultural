import { MobileBackLink } from "@/components/internal/MobileBackLink";
import { PrintContingencyButton } from "@/components/internal/PrintContingencyButton";
import { Card } from "@/components/internal/ui/Card";
import { PageHeader } from "@/components/internal/ui/PageHeader";

const line = "border-b border-text/50";

export default function ContingencyPage() {
  return (
    <div className="grid gap-4">
      <div className="print-hidden">
        <MobileBackLink href="/sigeco" label="Volver a SIGECO" />
      </div>
      <div className="print-hidden">
        <PageHeader
          title="Ficha de contingencia"
          description="Para cortes largos. Imprime copias vacías antes de necesitarlas."
          actions={<PrintContingencyButton />}
        />
      </div>

      <Card className="print-hidden border-warning/30 bg-warning/10">
        <h2 className="font-semibold text-warning">Reglas durante el corte</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-text">
          <li>Usa una ficha por operación y asigna un número temporal consecutivo.</li>
          <li>No intentes cobrar o mover stock repetidas veces desde varias pantallas.</li>
          <li>Guarda las hojas bajo llave; contienen información privada.</li>
          <li>Cuando vuelva SIGECO, transcribe en orden y marca cada hoja una sola vez.</li>
          <li>Pagos y stock deben ser revisados por una segunda persona.</li>
        </ol>
      </Card>

      <article className="sigeco-contingency-sheet rounded-[9px] border border-text/30 bg-white p-6 text-sm text-text">
        <header className="border-b-2 border-text pb-3 text-center">
          <p className="font-sora text-xl font-bold">SALUD INTERCULTURAL</p>
          <h1 className="mt-1 text-lg font-semibold">Ficha manual de contingencia</h1>
          <p className="mt-1 text-xs">Esta hoja no confirma que la operación ya esté registrada en SIGECO.</p>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-x-8 gap-y-4">
          <p>N.º temporal: <span className={line}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></p>
          <p>Fecha y hora: <span className={line}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></p>
          <p className="col-span-2">Personal responsable: <span className={line}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></p>
        </section>

        <section className="mt-6">
          <h2 className="font-bold uppercase">1. Tipo de operación</h2>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
            <span>□ Llegada</span><span>□ Pago</span><span>□ Egreso</span>
            <span>□ Compra</span><span>□ Entrada o ajuste de stock</span><span>□ Otro</span>
          </div>
        </section>

        <section className="mt-6 grid gap-4">
          <h2 className="font-bold uppercase">2. Persona u operación relacionada</h2>
          <p>Paciente, proveedor o empleado: <span className={line}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></p>
          <p>Código o teléfono si corresponde: <span className={line}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></p>
        </section>

        <section className="mt-6 grid gap-4">
          <h2 className="font-bold uppercase">3. Detalle exacto</h2>
          <p className={`${line} min-h-6`}>&nbsp;</p>
          <p className={`${line} min-h-6`}>&nbsp;</p>
          <p className={`${line} min-h-6`}>&nbsp;</p>
          <div className="grid grid-cols-2 gap-8">
            <p>Monto Bs: <span className={line}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></p>
            <p>Cantidad: <span className={line}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></p>
          </div>
        </section>

        <section className="mt-6 grid gap-4">
          <h2 className="font-bold uppercase">4. Regularización al volver la conexión</h2>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <span>□ Registrado en SIGECO</span>
            <span>□ Verificado</span>
            <span>□ No registrar: anulado</span>
          </div>
          <p>ID definitivo en SIGECO: <span className={line}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></p>
          <div className="grid grid-cols-2 gap-8 pt-4">
            <p className="border-t border-text/60 pt-2 text-center">Firma de quien transcribió</p>
            <p className="border-t border-text/60 pt-2 text-center">Firma de quien verificó</p>
          </div>
        </section>
      </article>
    </div>
  );
}
