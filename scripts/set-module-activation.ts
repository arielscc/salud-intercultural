import { prisma } from "../src/modules/database";
import {
  ModuleActivationError,
  isSigecoModuleCode,
  setModuleActivation
} from "../src/modules/database/queries/modules";
import { sigecoModuleCodes } from "../src/features/modules/catalog";
import { reportScriptError } from "./safe-error";

/*
 * Enciende o apaga un módulo de SIGECO desde la línea de comandos.
 *
 * Uso:
 *   SIGECO_MODULE=administracion SIGECO_MODULE_ACTIVE=true pnpm modules:set
 *   SIGECO_MODULE=administracion SIGECO_MODULE_ACTIVE=false \
 *     SIGECO_MODULE_REASON="Incidente de Caja" pnpm modules:set
 *
 * Existe para preparar un ambiente antes de que la pantalla del super
 * administrador esté disponible. No reemplaza esa pantalla: comparte con ella
 * `setModuleActivation`, así que aplica las mismas dependencias duras y deja el
 * mismo historial. Un cambio hecho por aquí queda sin actor, porque lo hace la
 * plataforma y no una persona identificada.
 */
function explainActivationError(error: ModuleActivationError) {
  const blockers = error.blockers.join(", ");

  switch (error.code) {
    case "missing_dependencies":
      return `No se puede activar: primero hay que encender ${blockers}.`;
    case "required_by_active_modules":
      return `No se puede apagar: ${blockers} todavía dependen de este módulo.`;
    case "always_active":
      return "Ese módulo es parte del núcleo y no se apaga.";
    case "reason_required":
      return "Apagar un módulo exige SIGECO_MODULE_REASON.";
    default:
      return `Módulo desconocido.`;
  }
}

async function main() {
  const code = process.env.SIGECO_MODULE?.trim();
  const activeInput = process.env.SIGECO_MODULE_ACTIVE?.trim().toLowerCase();
  const reason = process.env.SIGECO_MODULE_REASON?.trim();

  if (!code || !activeInput) {
    throw new Error("SIGECO_MODULE and SIGECO_MODULE_ACTIVE are required.");
  }

  if (!isSigecoModuleCode(code)) {
    throw new Error(
      `Unknown module "${code}". Known modules: ${sigecoModuleCodes.join(", ")}.`
    );
  }

  if (!["true", "false"].includes(activeInput)) {
    throw new Error('SIGECO_MODULE_ACTIVE must be "true" or "false".');
  }

  const active = activeInput === "true";

  try {
    await setModuleActivation({ code, active, reason });
  } catch (error) {
    if (error instanceof ModuleActivationError) {
      // Solo se imprimen códigos del catálogo: no hay datos personales ni
      // credenciales, y sin el detalle el mensaje sería inútil.
      console.error(explainActivationError(error));
      process.exitCode = 1;
      return;
    }
    throw error;
  }

  console.log(`Module "${code}" is now ${active ? "active" : "inactive"}.`);
}

main()
  .catch((error) => {
    reportScriptError("set-module-activation", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
