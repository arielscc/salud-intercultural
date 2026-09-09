-- La identidad queda global; el rol operativo pertenece a cada membresía.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InternalPlatformRole') THEN
    CREATE TYPE "InternalPlatformRole" AS ENUM ('super_admin');
  END IF;
END
$$;

ALTER TABLE "InternalUser"
  ADD COLUMN "platformRole" "InternalPlatformRole";

ALTER TABLE "InternalUserBranch"
  ADD COLUMN "role" "InternalRole",
  ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "InternalUserBranch" AS membership
SET "role" = identity."role"
FROM "InternalUser" AS identity
WHERE identity."id" = membership."userId";

UPDATE "InternalUser"
SET "platformRole" = 'super_admin'::"InternalPlatformRole"
WHERE "role" = 'super_admin'::"InternalRole";

-- Solo médicos y enfermería pueden rotar entre sucursales. Cualquier cuenta
-- histórica ordinaria con varias sedes debe reconciliarse explícitamente.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "InternalUser" AS identity
    JOIN "InternalUserBranch" AS membership ON membership."userId" = identity."id"
    WHERE identity."role" NOT IN (
      'super_admin'::"InternalRole",
      'medico'::"InternalRole",
      'enfermeria'::"InternalRole"
    )
    GROUP BY identity."id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'MULTI_BRANCH_ROLE_REQUIRES_CLINICAL_ROTATION';
  END IF;
END
$$;

-- La asignación automática del superadministrador es una regla explícita de
-- plataforma: materializa todas las sedes operables sin elegir ninguna como
-- contexto activo ni habilitar consultas transversales.
INSERT INTO "InternalUserBranch" (
  "userId",
  "branchCode",
  "role",
  "active",
  "isDefault"
)
SELECT
  identity."id",
  branch."code",
  'super_admin'::"InternalRole",
  true,
  false
FROM "InternalUser" AS identity
CROSS JOIN "ClinicBranch" AS branch
WHERE identity."platformRole" = 'super_admin'::"InternalPlatformRole"
  AND branch."status" <> 'inactive'::"ClinicBranchStatus"
ON CONFLICT ("userId", "branchCode") DO UPDATE
SET "role" = 'super_admin'::"InternalRole",
    "active" = true;

-- Para una identidad ordinaria no se inventa una sede con tal de conservar el
-- rol antiguo: el backfill se detiene y esa cuenta se reconcilia explícitamente.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "InternalUser" AS identity
    WHERE NOT EXISTS (
      SELECT 1
      FROM "InternalUserBranch" AS membership
      WHERE membership."userId" = identity."id"
    )
  ) THEN
    RAISE EXCEPTION 'BRANCH_ROLE_BACKFILL_REQUIRES_MEMBERSHIP';
  END IF;
END
$$;

ALTER TABLE "InternalUserBranch"
  ALTER COLUMN "role" SET NOT NULL,
  ALTER COLUMN "updatedAt" DROP DEFAULT;

DROP INDEX IF EXISTS "InternalUser_role_idx";
ALTER TABLE "InternalUser" DROP COLUMN "role";

CREATE INDEX "InternalUser_platformRole_idx" ON "InternalUser"("platformRole");
CREATE INDEX "InternalUserBranch_userId_active_idx"
  ON "InternalUserBranch"("userId", "active");
