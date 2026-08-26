/*
 * Rangos clinicos aceptados para signos vitales, compartidos por el formulario
 * de Enfermeria (validacion en pantalla) y por el schema de la server action
 * (validacion final). Los maximos tambien respetan la precision de la base:
 * temperatura es Decimal(4,1) y peso/talla son Decimal(5,2), asi que un valor
 * exagerado ya no llega a Postgres a reventar la insercion.
 */

export type VitalSignField =
  | "temperatureCelsius"
  | "oxygenSaturation"
  | "systolicPressureMmHg"
  | "diastolicPressureMmHg"
  | "heartRateBpm"
  | "respiratoryRateRpm"
  | "weightKg"
  | "heightCm";

export type VitalSignLimit = {
  label: string;
  unit: string;
  min: number;
  max: number;
  /** Decimales permitidos; 0 obliga a numero entero. */
  decimals: number;
  placeholder: string;
};

export const vitalSignLimits: Record<VitalSignField, VitalSignLimit> = {
  temperatureCelsius: {
    label: "Temperatura",
    unit: "°C",
    min: 25,
    max: 45,
    decimals: 1,
    placeholder: "36.5"
  },
  oxygenSaturation: {
    label: "Saturación O₂",
    unit: "%",
    min: 50,
    max: 100,
    decimals: 0,
    placeholder: "98"
  },
  systolicPressureMmHg: {
    label: "Presión sistólica",
    unit: "mmHg",
    min: 50,
    max: 300,
    decimals: 0,
    placeholder: "120"
  },
  diastolicPressureMmHg: {
    label: "Presión diastólica",
    unit: "mmHg",
    min: 20,
    max: 200,
    decimals: 0,
    placeholder: "80"
  },
  heartRateBpm: {
    label: "Pulso",
    unit: "lpm",
    min: 20,
    max: 250,
    decimals: 0,
    placeholder: "72"
  },
  respiratoryRateRpm: {
    label: "Respiración",
    unit: "rpm",
    min: 5,
    max: 80,
    decimals: 0,
    placeholder: "16"
  },
  weightKg: {
    label: "Peso",
    unit: "kg",
    min: 0.5,
    max: 400,
    decimals: 2,
    placeholder: "70"
  },
  heightCm: {
    label: "Talla",
    unit: "cm",
    min: 20,
    max: 250,
    decimals: 2,
    placeholder: "170"
  }
};

/** Orden en que se muestran los campos en el formulario. */
export const vitalSignFieldOrder: VitalSignField[] = [
  "temperatureCelsius",
  "oxygenSaturation",
  "systolicPressureMmHg",
  "diastolicPressureMmHg",
  "heartRateBpm",
  "respiratoryRateRpm",
  "weightKg",
  "heightCm"
];

export type VitalSignsInput = Partial<Record<VitalSignField, string>>;
export type VitalSignsErrors = Partial<Record<VitalSignField, string>>;

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
}

/** Rango en minusculas para intercalar en una frase: "entre 25 y 45 °C". */
export function vitalSignRangeText(field: VitalSignField) {
  const limit = vitalSignLimits[field];
  return `entre ${formatNumber(limit.min)} y ${formatNumber(limit.max)} ${limit.unit}`;
}

/** Texto de ayuda bajo el campo: "Entre 25 y 45 °C". */
export function vitalSignRangeHint(field: VitalSignField) {
  const range = vitalSignRangeText(field);
  return `${range.charAt(0).toUpperCase()}${range.slice(1)}`;
}

/** Acepta coma decimal (36,5) porque es como se escribe en Bolivia. */
export function normalizeVitalSignText(raw: string) {
  return raw.trim().replace(",", ".");
}

export function parseVitalSignValue(raw: unknown) {
  if (raw === undefined || raw === null) return undefined;
  const text = normalizeVitalSignText(String(raw));
  if (text.length === 0) return undefined;
  return Number(text);
}

function decimalsOf(value: number) {
  const [, decimals = ""] = String(value).split(".");
  return decimals.length;
}

/**
 * Valida un campo suelto. Devuelve el mensaje a mostrar o null si esta bien.
 * Un campo vacio es valido: los signos vitales se registran parcialmente.
 */
export function validateVitalSignValue(field: VitalSignField, raw: string | undefined) {
  const limit = vitalSignLimits[field];
  const text = normalizeVitalSignText(raw ?? "");
  if (text.length === 0) return null;

  const value = Number(text);
  if (!Number.isFinite(value)) {
    return `Escribe solo números (ejemplo: ${limit.placeholder}).`;
  }
  if (value < limit.min || value > limit.max) {
    return `Valor fuera de rango: ${limit.label.toLowerCase()} debe estar ${vitalSignRangeText(
      field
    )}.`;
  }
  if (decimalsOf(value) > limit.decimals) {
    return limit.decimals === 0
      ? "Debe ser un número entero, sin decimales."
      : `Usa como máximo ${limit.decimals} ${limit.decimals === 1 ? "decimal" : "decimales"}.`;
  }
  return null;
}

/**
 * Valida todos los campos mas la coherencia entre sistólica y diastólica.
 * Devuelve un mapa campo -> mensaje con solo los campos con problema.
 */
export function validateVitalSignsInput(values: VitalSignsInput): VitalSignsErrors {
  const errors: VitalSignsErrors = {};
  for (const field of vitalSignFieldOrder) {
    const message = validateVitalSignValue(field, values[field]);
    if (message) errors[field] = message;
  }

  if (!errors.systolicPressureMmHg && !errors.diastolicPressureMmHg) {
    const systolic = parseVitalSignValue(values.systolicPressureMmHg);
    const diastolic = parseVitalSignValue(values.diastolicPressureMmHg);
    if (systolic !== undefined && diastolic !== undefined && diastolic >= systolic) {
      errors.diastolicPressureMmHg =
        "La presión diastólica debe ser menor que la sistólica (ejemplo: 120/80).";
    }
  }

  return errors;
}
