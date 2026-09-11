import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import type { Supplier, SupplierBranchProfile } from "@/generated/prisma/client";

type SupplierFormValue = Supplier & SupplierBranchProfile;

export function SupplierForm({
  action,
  supplier
}: {
  action: (formData: FormData) => void | Promise<void>;
  supplier?: SupplierFormValue;
}) {
  return (
    <form action={action} className="grid gap-4">
      {supplier ? (
        <>
          <input type="hidden" name="supplierId" value={supplier.id} />
          <input type="hidden" name="expectedRevision" value={supplier.revision} />
        </>
      ) : null}
      <Card>
        <CardHeader
          title="Datos del proveedor"
          description="Registra a la empresa y a la persona con quien se coordina."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre del proveedor" className="sm:col-span-2">
            <input
              className={internalInputClassName}
              name="name"
              defaultValue={supplier?.name}
              required
            />
          </Field>
          <Field label="País">
            <input
              className={internalInputClassName}
              name="country"
              defaultValue={supplier?.country ?? ""}
            />
          </Field>
          <Field label="Persona de contacto">
            <input
              className={internalInputClassName}
              name="contactName"
              defaultValue={supplier?.contactName ?? ""}
            />
          </Field>
          <Field label="Teléfono">
            <input
              className={internalInputClassName}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              defaultValue={supplier?.phone ?? ""}
            />
          </Field>
          <Field label="WhatsApp">
            <input
              className={internalInputClassName}
              name="whatsapp"
              type="tel"
              inputMode="tel"
              defaultValue={supplier?.whatsapp ?? ""}
            />
          </Field>
          <Field label="Correo">
            <input
              className={internalInputClassName}
              name="email"
              type="email"
              inputMode="email"
              defaultValue={supplier?.email ?? ""}
            />
          </Field>
          <Field label="Dirección" className="sm:col-span-2">
            <input
              className={internalInputClassName}
              name="address"
              defaultValue={supplier?.address ?? ""}
            />
          </Field>
        </div>
      </Card>
      <Card>
        <CardHeader
          title="Configuración en esta sucursal"
          description="Estos datos comerciales no se replican en otras sucursales."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ejecutivo de cuenta">
            <input
              className={internalInputClassName}
              name="accountExecutiveName"
              defaultValue={supplier?.accountExecutiveName ?? ""}
            />
          </Field>
          <Field label="Teléfono del ejecutivo">
            <input
              className={internalInputClassName}
              name="accountExecutivePhone"
              type="tel"
              inputMode="tel"
              defaultValue={supplier?.accountExecutivePhone ?? ""}
            />
          </Field>
          <Field label="Plazo de pago (días)">
            <input
              className={internalInputClassName}
              name="paymentTermDays"
              type="number"
              min={0}
              defaultValue={supplier?.paymentTermDays ?? ""}
            />
          </Field>
          <Field label="Condiciones comerciales">
            <input
              className={internalInputClassName}
              name="commercialTerms"
              defaultValue={supplier?.commercialTerms ?? ""}
            />
          </Field>
          <Field label="Referencias" className="sm:col-span-2">
            <textarea
              className={`${internalInputClassName} min-h-20 py-3`}
              name="references"
              defaultValue={supplier?.references ?? ""}
            />
          </Field>
          <Field label="Notas" className="sm:col-span-2">
            <textarea
              className={`${internalInputClassName} min-h-24 py-3`}
              name="notes"
              defaultValue={supplier?.notes ?? ""}
            />
          </Field>
          {supplier ? (
            <Field label="Motivo del cambio" className="sm:col-span-2">
              <input
                className={internalInputClassName}
                name="changeReason"
                placeholder="Ej. Cambio de número de contacto"
                required
              />
            </Field>
          ) : null}
        </div>
      </Card>
      <SubmitButton>{supplier ? "Guardar cambios" : "Crear proveedor"}</SubmitButton>
    </form>
  );
}
