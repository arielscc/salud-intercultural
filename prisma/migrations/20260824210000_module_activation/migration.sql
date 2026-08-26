-- Tarea 2 del lanzamiento por etapas: estado de activación de los módulos de
-- SIGECO y su historial append-only.
--
-- Migración aditiva: no toca ninguna tabla existente. Una base ya en uso no
-- cambia de comportamiento hasta que se active un módulo, porque el gate se
-- agrega recién en la Tarea 3.
--
-- El catálogo, las dependencias y el orden viven en código
-- (src/features/modules/catalog.ts). Aquí solo se guarda el estado.

-- CreateEnum
CREATE TYPE "ModuleActivationStatus" AS ENUM ('active', 'inactive');

-- CreateTable
CREATE TABLE "ModuleActivation" (
    "code" TEXT NOT NULL,
    "status" "ModuleActivationStatus" NOT NULL DEFAULT 'inactive',
    "activatedAt" TIMESTAMP(3),
    "activatedById" TEXT,
    "deactivatedAt" TIMESTAMP(3),
    "deactivatedById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleActivation_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "ModuleActivationEvent" (
    "id" TEXT NOT NULL,
    "moduleCode" TEXT NOT NULL,
    "previousStatus" "ModuleActivationStatus" NOT NULL,
    "status" "ModuleActivationStatus" NOT NULL,
    "reason" TEXT,
    "actorId" TEXT,
    "actorRole" "InternalRole",
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModuleActivationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModuleActivation_status_idx" ON "ModuleActivation"("status");

-- CreateIndex
CREATE INDEX "ModuleActivationEvent_moduleCode_occurredAt_idx" ON "ModuleActivationEvent"("moduleCode", "occurredAt");

-- CreateIndex
CREATE INDEX "ModuleActivationEvent_occurredAt_idx" ON "ModuleActivationEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "ModuleActivationEvent_actorId_occurredAt_idx" ON "ModuleActivationEvent"("actorId", "occurredAt");

-- AddForeignKey
ALTER TABLE "ModuleActivation" ADD CONSTRAINT "ModuleActivation_activatedById_fkey" FOREIGN KEY ("activatedById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ModuleActivation" ADD CONSTRAINT "ModuleActivation_deactivatedById_fkey" FOREIGN KEY ("deactivatedById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ModuleActivationEvent" ADD CONSTRAINT "ModuleActivationEvent_moduleCode_fkey" FOREIGN KEY ("moduleCode") REFERENCES "ModuleActivation"("code") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ModuleActivationEvent" ADD CONSTRAINT "ModuleActivationEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- El historial es append-only, igual que "AuditEvent": una corrección se
-- registra como un evento nuevo, nunca editando o borrando el anterior.
CREATE OR REPLACE FUNCTION "reject_module_activation_event_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'ModuleActivationEvent is append-only: % is not allowed', TG_OP
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "ModuleActivationEvent_prevent_update_delete"
BEFORE UPDATE OR DELETE ON "ModuleActivationEvent"
FOR EACH ROW
EXECUTE FUNCTION "reject_module_activation_event_mutation"();

-- Estado inicial: solo el núcleo encendido. Todo lo demás arranca apagado y lo
-- enciende el super administrador desde la pantalla de la Tarea 5, etapa por
-- etapa. Idempotente por código.
INSERT INTO "ModuleActivation" ("code", "status", "activatedAt", "note", "createdAt", "updatedAt")
VALUES
  ('core',           'active',   CURRENT_TIMESTAMP, 'Núcleo del sistema: no se apaga.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('administracion', 'inactive', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inventario',     'inactive', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('compras',        'inactive', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalogo',       'inactive', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('recepcion',      'inactive', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('consulta',       'inactive', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('enfermeria',     'inactive', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seguimientos',   'inactive', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('opiniones',      'inactive', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('reportes',       'inactive', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- El encendido del núcleo también deja huella: el historial arranca completo,
-- sin actor porque lo hace la instalación, no una persona.
INSERT INTO "ModuleActivationEvent"
  ("id", "moduleCode", "previousStatus", "status", "reason", "occurredAt")
SELECT gen_random_uuid()::text, 'core', 'inactive', 'active',
       'Instalación inicial del lanzamiento por etapas.', CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "ModuleActivationEvent" WHERE "moduleCode" = 'core'
);
