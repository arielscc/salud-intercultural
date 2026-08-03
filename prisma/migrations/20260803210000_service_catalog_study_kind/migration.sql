-- Tarea 8 (dashboard del médico): los estudios pasan a ser ofertas del catálogo
-- administrable. Se agrega el valor de enum en su propia migración (Postgres no
-- permite usar un valor de enum nuevo en la misma transacción que lo crea).

-- AlterEnum
ALTER TYPE "ServiceCatalogKind" ADD VALUE IF NOT EXISTS 'study';
