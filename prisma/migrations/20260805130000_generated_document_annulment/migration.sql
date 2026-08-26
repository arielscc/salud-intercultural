-- Anulación de documentos generados: se conserva la evidencia (append-only) pero
-- una versión emitida por error se marca como anulada y deja de imprimirse.
ALTER TABLE "GeneratedDocument"
  ADD COLUMN "annulledAt" TIMESTAMP(3),
  ADD COLUMN "annulledById" TEXT,
  ADD COLUMN "annulmentReason" TEXT;

-- El documento sigue siendo append-only: nunca se borra ni se altera el snapshot.
-- La ÚNICA mutación permitida es anularlo una sola vez (marcar los campos
-- annulled*), sin tocar ningún otro dato de la evidencia.
CREATE OR REPLACE FUNCTION "prevent_generated_document_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Generated documents are append-only';
  END IF;

  IF OLD."annulledAt" IS NULL
     AND NEW."annulledAt" IS NOT NULL
     AND NEW."id" = OLD."id"
     AND NEW."kind" = OLD."kind"
     AND NEW."documentNumber" = OLD."documentNumber"
     AND NEW."seriesKey" = OLD."seriesKey"
     AND NEW."version" = OLD."version"
     AND NEW."schemaVersion" = OLD."schemaVersion"
     AND NEW."patientId" = OLD."patientId"
     AND NEW."visitId" IS NOT DISTINCT FROM OLD."visitId"
     AND NEW."prescriptionId" IS NOT DISTINCT FROM OLD."prescriptionId"
     AND NEW."saleId" IS NOT DISTINCT FROM OLD."saleId"
     AND NEW."generatedById" = OLD."generatedById"
     AND NEW."supersedesId" IS NOT DISTINCT FROM OLD."supersedesId"
     AND NEW."sourceFingerprint" = OLD."sourceFingerprint"
     AND NEW."snapshot"::text = OLD."snapshot"::text
     AND NEW."generatedAt" = OLD."generatedAt"
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Generated documents are append-only';
END;
$$ LANGUAGE plpgsql;
