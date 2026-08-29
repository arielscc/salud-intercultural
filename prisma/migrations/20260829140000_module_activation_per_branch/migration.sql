-- Activación de módulos por sucursal.
--
-- Hasta aquí el estado de un módulo valía para todo el sistema: apagar la Caja
-- por un incidente en una sede dejaba sin cobrar a la otra. La sucursal pasa a
-- ser parte de la clave, de modo que cada sede avanza por su propia etapa.
--
-- La migración no cambia el comportamiento el día que corre: el estado vigente
-- se copia tal cual a cada sucursal existente, así que todas quedan como estaba
-- el sistema entero. Lo que cambia es que a partir de ahora se pueden separar.
--
-- El historial no se reescribe. Los eventos anteriores quedan con la sucursal
-- en nulo, que significa "cuando el cambio valía para todo el sistema".
-- Atribuirlos a una sede sería inventar dónde ocurrieron, y la tabla es
-- append-only justamente para que nadie corrija el pasado.

-- Sin sucursales no hay dónde copiar el estado, y seguir adelante dejaría el
-- sistema sin ningún módulo encendido. Mejor fallar y no aplicar nada.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "ClinicBranch") THEN
    RAISE EXCEPTION 'No hay sucursales: no se puede repartir el estado de los módulos.'
      USING ERRCODE = '55000';
  END IF;
END;
$$;

-- El historial deja de apuntar a la clave vieja antes de que la clave cambie.
ALTER TABLE "ModuleActivationEvent" DROP CONSTRAINT "ModuleActivationEvent_moduleCode_fkey";

-- ModuleActivation: la sucursal entra en la clave primaria.
ALTER TABLE "ModuleActivation" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "ModuleActivation" DROP CONSTRAINT "ModuleActivation_pkey";

-- Una fila por módulo y sucursal, con el estado que el módulo tenía para todo
-- el sistema. El SELECT lee la tabla antes de la inserción, así que las filas
-- nuevas no se vuelven a multiplicar.
INSERT INTO "ModuleActivation" (
  "code", "branchCode", "status", "activatedAt", "activatedById",
  "deactivatedAt", "deactivatedById", "note", "createdAt", "updatedAt"
)
SELECT
  "module"."code", "branch"."code", "module"."status", "module"."activatedAt",
  "module"."activatedById", "module"."deactivatedAt", "module"."deactivatedById",
  "module"."note", "module"."createdAt", "module"."updatedAt"
FROM "ModuleActivation" AS "module"
CROSS JOIN "ClinicBranch" AS "branch"
WHERE "module"."branchCode" IS NULL;

DELETE FROM "ModuleActivation" WHERE "branchCode" IS NULL;

ALTER TABLE "ModuleActivation" ALTER COLUMN "branchCode" SET NOT NULL;
ALTER TABLE "ModuleActivation" ADD CONSTRAINT "ModuleActivation_pkey" PRIMARY KEY ("code", "branchCode");

-- ModuleActivationEvent: la sucursal es opcional solo por los eventos viejos.
ALTER TABLE "ModuleActivationEvent" ADD COLUMN "branchCode" TEXT;

-- Índices: las consultas pasan a filtrar siempre por sucursal.
DROP INDEX "ModuleActivation_status_idx";
CREATE INDEX "ModuleActivation_branchCode_status_idx" ON "ModuleActivation"("branchCode", "status");

DROP INDEX "ModuleActivationEvent_moduleCode_occurredAt_idx";
CREATE INDEX "ModuleActivationEvent_moduleCode_branchCode_occurredAt_idx" ON "ModuleActivationEvent"("moduleCode", "branchCode", "occurredAt");

-- AddForeignKey
ALTER TABLE "ModuleActivation" ADD CONSTRAINT "ModuleActivation_branchCode_fkey" FOREIGN KEY ("branchCode") REFERENCES "ClinicBranch"("code") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Compuesta y con columnas anulables: PostgreSQL no exige la referencia cuando
-- alguna de las dos es nula, que es exactamente lo que necesitan los eventos
-- anteriores a este cambio.
ALTER TABLE "ModuleActivationEvent" ADD CONSTRAINT "ModuleActivationEvent_moduleCode_branchCode_fkey" FOREIGN KEY ("moduleCode", "branchCode") REFERENCES "ModuleActivation"("code", "branchCode") ON DELETE RESTRICT ON UPDATE RESTRICT;
