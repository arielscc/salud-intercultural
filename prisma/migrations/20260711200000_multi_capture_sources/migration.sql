-- Fuentes de captacion multiples (ajuste post V3.7).
-- Aditiva: agrega la lista y la rellena desde el campo unico existente.
-- "captureSource" se conserva y sigue guardando la primera fuente.

ALTER TABLE "Patient" ADD COLUMN "captureSources" "PatientCaptureSource"[] NOT NULL DEFAULT ARRAY[]::"PatientCaptureSource"[];

UPDATE "Patient" SET "captureSources" = ARRAY["captureSource"] WHERE "captureSources" = '{}';
