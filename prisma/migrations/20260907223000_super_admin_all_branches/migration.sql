-- Un super administrador gobierna el sistema completo. Las asignaciones
-- explícitas se conservan para la sucursal predeterminada y para consultas que
-- relacionan personal con sede, pero dejan de cargarse a mano una por una.
INSERT INTO "InternalUserBranch" ("userId", "branchCode", "isDefault")
SELECT u."id", b."code", false
FROM "InternalUser" AS u
CROSS JOIN "ClinicBranch" AS b
WHERE u."role" = 'super_admin'
  AND b."status" IN ('active', 'preparation')
ON CONFLICT ("userId", "branchCode") DO NOTHING;
