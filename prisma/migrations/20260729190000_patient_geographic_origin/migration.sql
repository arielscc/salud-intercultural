-- Tarea 10: separar la procedencia habitual del paciente de la procedencia
-- histórica de cada visita.

ALTER TABLE "Patient"
  ADD COLUMN "country" TEXT;

UPDATE "Patient"
SET "country" = 'Bolivia'
WHERE "country" IS NULL
  AND ("city" IS NOT NULL OR "department" IS NOT NULL);

CREATE INDEX "Patient_department_city_idx"
  ON "Patient"("department", "city");
CREATE INDEX "Patient_country_idx"
  ON "Patient"("country");

ALTER TABLE "Visit"
  ADD COLUMN "originCity" TEXT NOT NULL DEFAULT 'No informado',
  ADD COLUMN "originDepartment" TEXT,
  ADD COLUMN "originCountry" TEXT NOT NULL DEFAULT 'No informado',
  ADD COLUMN "originMatchesPatient" BOOLEAN NOT NULL DEFAULT true;

-- El dato histórico anterior a esta tarea usa la mejor información disponible
-- en la ficha actual. Las visitas nuevas guardan su propia fotografía y ya no
-- dependen de cambios posteriores en el paciente.
UPDATE "Visit" AS visit
SET
  "originCity" = COALESCE(patient."city", 'No informado'),
  "originDepartment" = patient."department",
  "originCountry" = COALESCE(patient."country", 'No informado'),
  "originMatchesPatient" = true
FROM "Patient" AS patient
WHERE patient."id" = visit."patientId";

CREATE INDEX "Visit_originDepartment_originCity_checkedInAt_idx"
  ON "Visit"("originDepartment", "originCity", "checkedInAt");
CREATE INDEX "Visit_originCountry_checkedInAt_idx"
  ON "Visit"("originCountry", "checkedInAt");
