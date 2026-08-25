import { describe, expect, it } from "vitest";
import { moduleActivationSchema } from "@/features/modules/schemas/module-activation.schema";

describe("moduleActivationSchema", () => {
  it("acepta encender sin motivo", () => {
    const result = moduleActivationSchema.safeParse({
      code: "administracion",
      active: "true"
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toMatchObject({
      code: "administracion",
      active: true
    });
    expect(result.success && result.data.reason).toBeUndefined();
  });

  it("rechaza apagar sin motivo", () => {
    const result = moduleActivationSchema.safeParse({
      code: "administracion",
      active: "false"
    });

    expect(result.success).toBe(false);
    expect(
      !result.success && result.error.issues.some((issue) => issue.path.includes("reason"))
    ).toBe(true);
  });

  it("rechaza un motivo que no explica nada", () => {
    const result = moduleActivationSchema.safeParse({
      code: "administracion",
      active: "false",
      reason: "x"
    });

    expect(result.success).toBe(false);
  });

  it("acepta apagar con motivo y lo recorta", () => {
    const result = moduleActivationSchema.safeParse({
      code: "inventario",
      active: "false",
      reason: "  Incidente de stock  "
    });

    expect(result.success && result.data.reason).toBe("Incidente de stock");
  });

  it("rechaza un módulo que no existe en el catálogo", () => {
    expect(
      moduleActivationSchema.safeParse({ code: "modulo-inventado", active: "true" }).success
    ).toBe(false);
  });
});
