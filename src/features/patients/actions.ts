"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createPatientRecord,
  findPossibleDuplicatePatients
} from "@/modules/database/queries/patients";
import { auditedResult, runAuditedAction } from "@/modules/audit/service";
import { createPatientSchema, sanitizePatientInput } from "@/features/patients/schemas/patient.schema";
import {
  sanitizeWalkInClientInput,
  walkInClientSchema
} from "@/features/patients/schemas/walk-in-client.schema";

function parseFormData(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

/*
 * LEGACY (simplificacion V3.7): el alta manual de pacientes fue reemplazada
 * por el funnel de recepcion (submitReceptionIntakeAction). Se conserva por
 * si un flujo interno necesita crear fichas sin abrir visita.
 */
export async function createPatientAction(formData: FormData) {
  const patient = await runAuditedAction(
    {
      permission: "patients_create",
      action: "patient.create",
      entityType: "patient"
    },
    async (user) => {
      const parsed = createPatientSchema.safeParse(parseFormData(formData));

      if (!parsed.success) {
        redirect("/sigeco/recepcion/nuevo?error=invalid");
      }

      const input = sanitizePatientInput(parsed.data);
      const duplicates = await findPossibleDuplicatePatients({
        fullName: input.fullName,
        phone: input.phone,
        secondaryPhone: input.secondaryPhone,
        birthDate: input.birthDate
      });

      if (duplicates.length > 0 && formData.get("allowDuplicate") !== "true") {
        redirect("/sigeco/recepcion/nuevo?duplicate=true");
      }

      const created = await createPatientRecord({
        ...input,
        createdById: user.id
      });
      return auditedResult(created, { entityId: created.id });
    }
  );

  revalidatePath("/sigeco");
  revalidatePath("/sigeco/recepcion");
  redirect(`/sigeco/recepcion/pacientes/${patient.id}`);
}

export type WalkInClientDuplicate = {
  id: string;
  fullName: string;
  phone: string;
  internalCode: string;
};

/**
 * Lo que la persona escribió, tal cual, para devolvérselo si el alta no
 * prospera. React limpia el formulario cuando la acción termina, así que sin
 * esto un teléfono mal escrito obliga a teclear los cuatro campos otra vez, y
 * el aviso de ficha parecida deja el botón «Registrar de todos modos» apuntando
 * a un formulario vacío.
 */
export type WalkInClientValues = {
  fullName: string;
  phone: string;
  secondaryPhone: string;
  generalObservations: string;
};

export type WalkInClientResult =
  | { status: "created"; patientId: string }
  | {
      status: "duplicates";
      matches: WalkInClientDuplicate[];
      values: WalkInClientValues;
    }
  | { status: "invalid"; message: string; values: WalkInClientValues };

function submittedValues(formData: FormData): WalkInClientValues {
  const read = (name: string) => String(formData.get(name) ?? "");

  return {
    fullName: read("fullName"),
    phone: read("phone"),
    secondaryPhone: read("secondaryPhone"),
    generalObservations: read("generalObservations")
  };
}

/**
 * Alta mínima de un cliente de mostrador, sin abrir visita.
 *
 * Devuelve el resultado en lugar de redirigir porque necesita mostrar las
 * fichas parecidas antes de crear otra, y ponerlas en la URL expondría nombres
 * y teléfonos. Quien registra decide: usa la ficha encontrada o confirma que se
 * trata de otra persona.
 *
 * La ficha que crea es una ficha normal. Cuando Recepción esté lanzada recibe
 * visitas sin migrarse ni duplicarse.
 */
export async function registerWalkInClientAction(
  _previous: WalkInClientResult | null,
  formData: FormData
): Promise<WalkInClientResult> {
  const values = submittedValues(formData);
  const parsed = walkInClientSchema.safeParse(parseFormData(formData));

  if (!parsed.success) {
    return {
      status: "invalid",
      message: parsed.error.issues[0]?.message ?? "Revisa el nombre y el teléfono.",
      values
    };
  }

  const input = sanitizeWalkInClientInput(parsed.data);

  return runAuditedAction(
    {
      permission: "patients_create",
      action: "patient.walk_in.create",
      entityType: "patient",
      context: { origin: "administracion" }
    },
    async (user) => {
      const duplicates = await findPossibleDuplicatePatients({
        fullName: input.fullName,
        phone: input.phone,
        secondaryPhone: input.secondaryPhone
      });

      if (duplicates.length > 0 && !parsed.data.confirmDuplicate) {
        const matches: WalkInClientDuplicate[] = duplicates.slice(0, 5).map((match) => ({
          id: match.id,
          fullName: match.fullName,
          phone: match.phone,
          internalCode: match.internalCode
        }));

        // No es un error ni un rechazo: es una decisión que le corresponde a
        // quien está atendiendo. Se audita como intento resuelto.
        return auditedResult<WalkInClientResult>(
          { status: "duplicates", matches, values },
          { context: { origin: "administracion", duplicateCandidates: matches.length } }
        );
      }

      const created = await createPatientRecord({
        ...input,
        createdById: user.id
      });

      revalidatePath("/sigeco/administracion/clientes");

      return auditedResult<WalkInClientResult>(
        { status: "created", patientId: created.id },
        {
          entityId: created.id,
          context: {
            origin: "administracion",
            confirmedDuplicate: parsed.data.confirmDuplicate
          }
        }
      );
    }
  );
}
