-- Tarea 8: migra el catálogo de estudios antes hardcodeado (hemograma,
-- hemograma + resonancia, resonancia, orina) al catálogo administrable. A partir
-- de aquí se editan desde la UI sin tocar código. Idempotente por código.

INSERT INTO "ServiceCatalogItem"
  ("id", "code", "name", "category", "kind", "basePriceCents", "ownMaxDiscountCents",
   "requiresNursing", "supportsSessions", "active", "revision", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'EST-HEMOGRAMA', 'Hemograma', 'Estudios', 'study', 5000, 0, true, false, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'EST-HEMOGRAMA-RESONANCIA', 'Hemograma + resonancia', 'Estudios', 'study', 20000, 0, true, false, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'EST-RESONANCIA', 'Resonancia', 'Estudios', 'study', 12000, 0, true, false, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'EST-ORINA', 'Análisis de orina', 'Estudios', 'study', 10000, 0, true, false, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
