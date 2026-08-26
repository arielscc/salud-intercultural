import type {
  AttributionTrafficType,
  CaptureSourceCategory,
  PatientCaptureSource
} from "@/generated/prisma/client";

export const captureSourceCategoryLabels: Record<CaptureSourceCategory, string> = {
  social: "Red social",
  messaging: "Mensajería",
  referral: "Recomendación",
  offline: "Fuera de internet",
  web: "Web y buscadores",
  other: "Otro"
};

export const attributionTrafficTypeLabels: Record<AttributionTrafficType, string> = {
  unidentified: "No identificado",
  organic: "Orgánico",
  paid: "Publicidad pagada"
};

export const captureSourceCategoryOptions = Object.entries(
  captureSourceCategoryLabels
) as Array<[CaptureSourceCategory, string]>;

export const attributionTrafficTypeOptions = Object.entries(
  attributionTrafficTypeLabels
) as Array<[AttributionTrafficType, string]>;

const compatiblePatientSources = new Set<PatientCaptureSource>([
  "facebook",
  "tiktok",
  "whatsapp",
  "referral",
  "previous_patient",
  "flyer",
  "website",
  "other"
]);

export function toCompatiblePatientCaptureSource(
  code: string
): PatientCaptureSource {
  return compatiblePatientSources.has(code as PatientCaptureSource)
    ? (code as PatientCaptureSource)
    : "other";
}

export function normalizeCaptureCode(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

export function normalizeCampaignCode(value: string) {
  return value
    .trim()
    .toLocaleUpperCase("es")
    .replace(/[^A-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function captureSourceSummaryLabel(source: {
  patientLabel: string;
  internalLabel: string;
}) {
  return source.patientLabel === source.internalLabel
    ? source.patientLabel
    : `${source.patientLabel} · ${source.internalLabel}`;
}

export function visitAttributionSummary(attribution: {
  touches: Array<{
    role: "primary" | "support";
    source: {
      code?: string;
      patientLabel: string;
      internalLabel: string;
      category?: CaptureSourceCategory;
    };
  }>;
} | null | undefined) {
  if (!attribution) return "Sin registrar";
  const knownUsTouches = attribution.touches.filter(
    (touch) =>
      touch.source.category !== "messaging" &&
      normalizeCaptureCode(touch.source.code ?? touch.source.patientLabel) !== "whatsapp"
  );
  const primary = knownUsTouches.find((touch) => touch.role === "primary");
  const supports = knownUsTouches.filter(
    (touch) => touch.role === "support"
  );

  const labels = [
    primary?.source.patientLabel,
    ...supports.map((touch) => touch.source.patientLabel)
  ].filter((label): label is string => Boolean(label));

  return labels.length > 0 ? labels.join(" + ") : "Sin registrar";
}

export function verifiedAttributionDetail(attribution: {
  campaign?: {
    accountLabel: string | null;
    name: string;
    trafficType: AttributionTrafficType;
  } | null;
} | null | undefined) {
  if (!attribution?.campaign) return "No identificado";
  const campaign = attribution.campaign;
  return `${campaign.accountLabel ?? campaign.name} · ${
    attributionTrafficTypeLabels[campaign.trafficType]
  }`;
}
