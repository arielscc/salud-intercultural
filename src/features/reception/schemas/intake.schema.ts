import { z } from "zod";
import {
  patientCaptureSourceSchema,
  patientGenderSchema
} from "@/features/patients/schemas/patient.schema";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);
const cleanText = (value: string) => value.trim().replace(/\s+/g, " ");

export const visitIntakeTypeSchema = z.enum([
  "first_visit",
  "treatment_control",
  "new_problem",
  "results_review"
]);

export const symptomDurationUnitSchema = z.enum(["days", "weeks", "months", "years"]);

export const followUpContactPreferenceSchema = z.enum([
  "whatsapp",
  "call",
  "both",
  "no_contact",
  "unknown"
]);

const yesNoSchema = z.enum(["yes", "no"]);

/* El form serializa las fuentes multiples como "a,b,c" en un input oculto. */
const captureSourcesSchema = z.preprocess(
  (value) => (typeof value === "string" ? (value === "" ? [] : value.split(",")) : value),
  z.array(patientCaptureSourceSchema).max(9).default([])
);

export const receptionIntakeSchema = z
  .object({
    patientId: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    fullName: z.string().trim().min(2, "Ingresa el nombre completo.").max(160),
    phone: z
      .string()
      .trim()
      .min(6, "Ingresa un telefono valido.")
      .max(30)
      .regex(/^[+()\d\s-]+$/, "Ingresa un telefono valido."),
    birthDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
    gender: patientGenderSchema.default("unknown"),
    city: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
    reason: z.string().trim().min(2, "Ingresa el motivo de la visita.").max(500),
    symptomDurationValue: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().positive().max(999).optional()
    ),
    symptomDurationUnit: z.preprocess(emptyToUndefined, symptomDurationUnitSchema.optional()),
    intakeType: visitIntakeTypeSchema.default("first_visit"),
    previouslyTreated: z.preprocess(emptyToUndefined, yesNoSchema.optional()),
    bringsStudies: z.preprocess(emptyToUndefined, yesNoSchema.optional()),
    allergies: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
    relevantHistory: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
    currentMedication: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
    captureSources: captureSourcesSchema,
    followUpPreference: followUpContactPreferenceSchema.default("unknown")
  })
  .refine(
    (data) => (data.symptomDurationValue === undefined) === (data.symptomDurationUnit === undefined),
    {
      message: "La duracion necesita cantidad y unidad.",
      path: ["symptomDurationUnit"]
    }
  );

export type ReceptionIntakeInput = z.infer<typeof receptionIntakeSchema>;

/*
 * Edicion de ficha (Tarea 7): mismos campos permanentes del funnel.
 * A diferencia del intake, un campo vaciado se limpia (null) en la ficha.
 */
export const patientEditSchema = z.object({
  patientId: z.string().trim().min(1),
  fullName: z.string().trim().min(2, "Ingresa el nombre completo.").max(160),
  phone: z
    .string()
    .trim()
    .min(6, "Ingresa un telefono valido.")
    .max(30)
    .regex(/^[+()\d\s-]+$/, "Ingresa un telefono valido."),
  birthDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  gender: patientGenderSchema.default("unknown"),
  city: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  allergies: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
  relevantHistory: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
  currentMedication: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
  captureSources: captureSourcesSchema,
  followUpPreference: followUpContactPreferenceSchema.default("unknown")
});

export type PatientEditInput = z.infer<typeof patientEditSchema>;

export function toPatientEditRecord(input: PatientEditInput) {
  return {
    patientId: input.patientId,
    data: {
      fullName: cleanText(input.fullName),
      phone: cleanText(input.phone),
      birthDate: input.birthDate ?? null,
      gender: input.gender,
      city: input.city ? cleanText(input.city) : null,
      captureSource: input.captureSources[0] ?? "other",
      captureSources: input.captureSources,
      allergies: input.allergies ? cleanText(input.allergies) : null,
      relevantHistory: input.relevantHistory ? cleanText(input.relevantHistory) : null,
      currentMedication: input.currentMedication ? cleanText(input.currentMedication) : null,
      followUpPreference: input.followUpPreference
    }
  };
}

export function toReceptionIntakeRecord(input: ReceptionIntakeInput) {
  return {
    patientId: input.patientId,
    patient: {
      fullName: cleanText(input.fullName),
      phone: cleanText(input.phone),
      birthDate: input.birthDate,
      gender: input.gender,
      city: input.city ? cleanText(input.city) : undefined,
      captureSource: input.captureSources[0] ?? "other",
      captureSources: input.captureSources,
      allergies: input.allergies ? cleanText(input.allergies) : undefined,
      relevantHistory: input.relevantHistory ? cleanText(input.relevantHistory) : undefined,
      currentMedication: input.currentMedication ? cleanText(input.currentMedication) : undefined,
      followUpPreference: input.followUpPreference
    },
    visit: {
      reason: cleanText(input.reason),
      intakeType: input.intakeType,
      symptomDurationValue: input.symptomDurationValue,
      symptomDurationUnit: input.symptomDurationUnit,
      previouslyTreated: input.previouslyTreated ? input.previouslyTreated === "yes" : undefined,
      bringsStudies: input.bringsStudies ? input.bringsStudies === "yes" : undefined
    }
  };
}
