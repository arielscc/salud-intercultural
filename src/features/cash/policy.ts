import { resolveCashCloseApprovalThresholdCents } from "@/lib/deployment-environment";

export const defaultCashBranch = {
  code: "el-alto",
  name: "El Alto"
} as const;

export const defaultCashRegisterName = "Caja principal";

/**
 * Diferencia máxima que Administración puede cerrar sin aprobación adicional.
 * En producción se puede ajustar con una variable privada después de que
 * Dirección apruebe el monto.
 */
export function getCashCloseApprovalThresholdCents() {
  return resolveCashCloseApprovalThresholdCents();
}
