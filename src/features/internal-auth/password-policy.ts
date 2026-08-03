import { ZxcvbnFactory } from "@zxcvbn-ts/core";
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common";
import * as zxcvbnEsEsPackage from "@zxcvbn-ts/language-es-es";

// Reglas de contraseña para todas las cuentas internas de SIGECO.
// Se aplican por igual a la contraseña temporal que crea el super administrador
// y al cambio de contraseña que hace cada persona.
export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 128;

// Puntaje mínimo de zxcvbn (0 = muy adivinable, 4 = muy difícil). Con 2 se
// rechazan las contraseñas comunes o con patrones evidentes, sin exigir claves
// largas.
export const MIN_PASSWORD_STRENGTH_SCORE = 2;

export const passwordComplexityMessage =
  "La contraseña debe tener al menos 6 caracteres e incluir mayúsculas, minúsculas y números.";

// El motor de zxcvbn se construye una sola vez con los diccionarios comunes y en
// español, para detectar palabras frecuentes y patrones de teclado.
const zxcvbn = new ZxcvbnFactory({
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEsEsPackage.dictionary
  },
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  translations: zxcvbnEsEsPackage.translations,
  useLevenshteinDistance: true
});

export type PasswordPolicyResult = { ok: true } | { ok: false; message: string };

export function checkPasswordPolicy(
  password: string,
  userInputs: (string | number)[] = []
): PasswordPolicyResult {
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return { ok: false, message: passwordComplexityMessage };
  }

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  if (!hasLower || !hasUpper || !hasDigit) {
    return { ok: false, message: passwordComplexityMessage };
  }

  const strength = zxcvbn.check(password, userInputs.filter((input) => input !== ""));
  if (strength.score < MIN_PASSWORD_STRENGTH_SCORE) {
    const detail = strength.feedback.warning ?? strength.feedback.suggestions[0] ?? "";
    return {
      ok: false,
      message: detail
        ? `Contraseña insegura: ${detail}`
        : "La contraseña es insegura o tiene un patrón fácil de adivinar. Elige otra."
    };
  }

  return { ok: true };
}
