import { z } from "zod";
import {
  patientGenderSchema
} from "@/features/patients/schemas/patient.schema";
import {
  captureEvidenceCodeSchema,
  captureSourceCodeSchema
} from "@/features/attribution/schemas/attribution.schema";
import { toCompatiblePatientCaptureSource } from "@/features/attribution/catalog";
import {
  geographicOriginsMatch,
  isCompleteGeographicOrigin,
  normalizeGeographicOrigin
} from "@/features/geography/origin";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);
const cleanText = (value: string) => value.trim().replace(/\s+/g, " ");

export const visitIntakeTypeSchema = z.enum([
  "first_visit",
  "treatment_control",
  "new_problem",
  "results_review"
]);

export const symptomDurationUnitSchema = z.enum(["days", "weeks", "months", "years"]);

const yesNoSchema = z.enum(["yes", "no"]);
const visitOriginModeSchema = z.enum(["same", "different"]);
const requiredPlaceText = z.string().trim().min(2).max(120);
const optionalPlaceText = z.preprocess(
  emptyToUndefined,
  z.string().trim().max(120).optional()
);

/* El form serializa las fuentes de apoyo como "a,b,c" en un input oculto. */
const captureSupportSourcesSchema = z.preprocess(
  (value) => (typeof value === "string" ? (value === "" ? [] : value.split(",")) : value),
  z
    .array(captureSourceCodeSchema)
    .max(12)
    .default([])
    .transform((sources) => Array.from(new Set(sources)))
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
    city: requiredPlaceText,
    department: optionalPlaceText,
    country: requiredPlaceText,
    visitOriginMode: visitOriginModeSchema.default("same"),
    visitOriginCity: optionalPlaceText,
    visitOriginDepartment: optionalPlaceText,
    visitOriginCountry: optionalPlaceText,
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
    capturePrimarySource: captureSourceCodeSchema,
    captureSupportSources: captureSupportSourcesSchema,
    attributionEvidenceCode: captureEvidenceCodeSchema
  })
  .refine(
    (data) => (data.symptomDurationValue === undefined) === (data.symptomDurationUnit === undefined),
    {
      message: "La duracion necesita cantidad y unidad.",
      path: ["symptomDurationUnit"]
    }
  )
  .refine(
    (data) =>
      isCompleteGeographicOrigin({
        city: data.city,
        department: data.department ?? "",
        country: data.country
      }),
    {
      message: "Completa la ciudad, el departamento y el país de procedencia.",
      path: ["department"]
    }
  )
  .refine(
    (data) =>
      data.visitOriginMode === "same" ||
      isCompleteGeographicOrigin({
        city: data.visitOriginCity ?? "",
        department: data.visitOriginDepartment ?? "",
        country: data.visitOriginCountry ?? ""
      }),
    {
      message: "Completa la procedencia de esta visita.",
      path: ["visitOriginCity"]
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
  city: requiredPlaceText,
  department: optionalPlaceText,
  country: requiredPlaceText,
  allergies: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
  relevantHistory: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
  currentMedication: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
}).refine(
  (data) =>
    isCompleteGeographicOrigin({
      city: data.city,
      department: data.department ?? "",
      country: data.country
    }),
  {
    message: "Completa la ciudad, el departamento y el país de procedencia.",
    path: ["department"]
  }
);

export type PatientEditInput = z.infer<typeof patientEditSchema>;

export function toPatientEditRecord(input: PatientEditInput) {
  const origin = normalizeGeographicOrigin({
    city: input.city,
    department: input.department ?? "",
    country: input.country
  });

  return {
    patientId: input.patientId,
    data: {
      fullName: cleanText(input.fullName),
      phone: cleanText(input.phone),
      birthDate: input.birthDate ?? null,
      gender: input.gender,
      city: origin.city,
      department: origin.department || null,
      country: origin.country,
      allergies: input.allergies ? cleanText(input.allergies) : null,
      relevantHistory: input.relevantHistory ? cleanText(input.relevantHistory) : null,
      currentMedication: input.currentMedication ? cleanText(input.currentMedication) : null
    }
  };
}

export function toReceptionIntakeRecord(input: ReceptionIntakeInput) {
  const patientOrigin = normalizeGeographicOrigin({
    city: input.city,
    department: input.department ?? "",
    country: input.country
  });
  const requestedVisitOrigin =
    input.visitOriginMode === "different"
      ? normalizeGeographicOrigin({
          city: input.visitOriginCity ?? "",
          department: input.visitOriginDepartment ?? "",
          country: input.visitOriginCountry ?? ""
        })
      : patientOrigin;
  const originMatchesPatient = geographicOriginsMatch(
    patientOrigin,
    requestedVisitOrigin
  );
  const supportSourceCodes = input.captureSupportSources.filter(
    (source) => source !== input.capturePrimarySource
  );
  const compatibleSources = Array.from(
    new Set([
      toCompatiblePatientCaptureSource(input.capturePrimarySource),
      ...supportSourceCodes.map(toCompatiblePatientCaptureSource)
    ])
  );

  return {
    patientId: input.patientId,
    patient: {
      fullName: cleanText(input.fullName),
      phone: cleanText(input.phone),
      birthDate: input.birthDate,
      gender: input.gender,
      city: patientOrigin.city,
      department: patientOrigin.department || null,
      country: patientOrigin.country,
      captureSource: toCompatiblePatientCaptureSource(
        input.capturePrimarySource
      ),
      captureSources: compatibleSources,
      allergies: input.allergies ? cleanText(input.allergies) : undefined,
      relevantHistory: input.relevantHistory ? cleanText(input.relevantHistory) : undefined,
      currentMedication: input.currentMedication ? cleanText(input.currentMedication) : undefined
    },
    visit: {
      reason: cleanText(input.reason),
      intakeType: input.intakeType,
      symptomDurationValue: input.symptomDurationValue,
      symptomDurationUnit: input.symptomDurationUnit,
      previouslyTreated: input.previouslyTreated ? input.previouslyTreated === "yes" : undefined,
      bringsStudies: input.bringsStudies ? input.bringsStudies === "yes" : undefined,
      originCity: requestedVisitOrigin.city,
      originDepartment: requestedVisitOrigin.department || undefined,
      originCountry: requestedVisitOrigin.country,
      originMatchesPatient
    },
    attribution: {
      primarySourceCode: input.capturePrimarySource,
      supportSourceCodes,
      evidenceCode: input.attributionEvidenceCode
    }
  };
}
