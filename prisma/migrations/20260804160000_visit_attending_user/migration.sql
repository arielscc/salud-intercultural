-- Médico que toma la atención de una visita en consulta (claim de la cola).
ALTER TABLE "Visit" ADD COLUMN "attendingUserId" TEXT;
ALTER TABLE "Visit" ADD COLUMN "attendingAt" TIMESTAMP(3);

ALTER TABLE "Visit"
  ADD CONSTRAINT "Visit_attendingUserId_fkey"
  FOREIGN KEY ("attendingUserId") REFERENCES "InternalUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Visit_attendingUserId_idx" ON "Visit"("attendingUserId");
