-- Registra la versión inicial append-only de los estudios creados por la
-- migración anterior. Se mantiene en una migración separada porque el catálogo
-- ya fue aplicado en desarrollo local. Es idempotente por catálogo y versión.

INSERT INTO "ServiceCatalogItemVersion"
  ("id", "catalogItemId", "version", "code", "name", "description", "category",
   "kind", "basePriceCents", "ownMaxDiscountCents", "requiresNursing",
   "supportsSessions", "sessionCount", "packagePriceCents", "sessionPriceCents",
   "active", "componentSnapshot", "changedById", "changeReason", "createdAt")
SELECT
  gen_random_uuid()::text,
  item."id",
  item."revision",
  item."code",
  item."name",
  item."description",
  item."category",
  item."kind",
  item."basePriceCents",
  item."ownMaxDiscountCents",
  item."requiresNursing",
  item."supportsSessions",
  item."sessionCount",
  item."packagePriceCents",
  item."sessionPriceCents",
  item."active",
  '[]'::jsonb,
  NULL,
  'Alta inicial por migración del catálogo de estudios',
  item."createdAt"
FROM "ServiceCatalogItem" AS item
WHERE item."code" IN (
  'EST-HEMOGRAMA',
  'EST-HEMOGRAMA-RESONANCIA',
  'EST-RESONANCIA',
  'EST-ORINA'
)
ON CONFLICT ("catalogItemId", "version") DO NOTHING;
