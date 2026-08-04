-- Responsable que atiende una tarea (p. ej. la enfermera que toma al paciente).
ALTER TABLE "VisitWorkItem" ADD COLUMN "assignedToId" TEXT;
ALTER TABLE "VisitWorkItem" ADD COLUMN "assignedAt" TIMESTAMP(3);

ALTER TABLE "VisitWorkItem"
  ADD CONSTRAINT "VisitWorkItem_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "InternalUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "VisitWorkItem_assignedToId_idx" ON "VisitWorkItem"("assignedToId");
