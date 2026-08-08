-- La anulación de un documento ahora es reversible: se puede anular y volver a
-- habilitar. El documento sigue siendo append-only (nunca se borra ni se altera
-- el snapshot); la ÚNICA mutación permitida es cambiar los campos annulled*.
CREATE OR REPLACE FUNCTION "prevent_generated_document_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Generated documents are append-only';
  END IF;

  IF NEW."id" = OLD."id"
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
