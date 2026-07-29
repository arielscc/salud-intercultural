const SENSITIVE_KEY =
  /(password|passcode|credential|secret|token|cookie|authorization|session|hash|salt|api.?key|private.?key|otp|csrf|clinical|diagnos|symptom|prescription|treatment|note|observation|content|body|file|attachment|document|image|audio|video|email|phone|full.?name|address|birth|identity)/i;

const MAX_DEPTH = 3;
const MAX_KEYS = 30;
const MAX_STRING_LENGTH = 160;

type SafeAuditValue =
  | string
  | number
  | boolean
  | null
  | SafeAuditValue[]
  | { [key: string]: SafeAuditValue };

function sanitizeValue(value: unknown, depth: number): SafeAuditValue | undefined {
  if (value === null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") return value.slice(0, MAX_STRING_LENGTH);
  if (value instanceof Date) return value.toISOString();
  if (depth >= MAX_DEPTH) return undefined;

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_KEYS)
      .map((item) => sanitizeValue(item, depth + 1))
      .filter((item): item is SafeAuditValue => item !== undefined);
  }

  if (typeof value === "object") {
    const sanitized: Record<string, SafeAuditValue> = {};

    for (const [key, item] of Object.entries(value).slice(0, MAX_KEYS)) {
      if (SENSITIVE_KEY.test(key)) continue;
      const safeItem = sanitizeValue(item, depth + 1);
      if (safeItem !== undefined) sanitized[key] = safeItem;
    }

    return sanitized;
  }

  return undefined;
}

/**
 * Última barrera antes de persistir contexto de auditoría.
 *
 * Los llamadores deben enviar únicamente metadatos operativos. Esta función
 * además descarta claves sensibles y limita tamaño y profundidad para impedir
 * que contraseñas, tokens, notas clínicas o archivos terminen en el historial.
 */
export function sanitizeAuditContext(input: unknown): Record<string, SafeAuditValue> | null {
  const value = sanitizeValue(input, 0);
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  return Object.keys(value).length > 0 ? value : null;
}
