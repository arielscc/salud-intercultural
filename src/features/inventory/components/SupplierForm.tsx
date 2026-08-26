import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import type { Supplier } from "@/generated/prisma/client";

export function SupplierForm({
  action,
  supplier
}: {
  action: (formData: FormData) => void | Promise<void>;
  supplier?: Supplier;
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
          <SubmitButton>{supplier ? "Guardar nueva versión" : "Crear proveedor"}</SubmitButton>
        </div>
      </Card>
    </form>
  );
}
