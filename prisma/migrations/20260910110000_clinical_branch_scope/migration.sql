-- Tarea 8: expansión y atribución determinista. No asigna sedes por defecto.
BEGIN;

ALTER TABLE "ClinicalConsultation" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "ClinicalConsultationVersion" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "Diagnosis" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "TreatmentPlan" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "TreatmentProposalOutcome" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "Prescription" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "PrescriptionItem" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "ClinicalEvolution" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "ClinicalNote" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "ClinicalOrder" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "ClinicalProfessionalProfile" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "DoctorOrder" ADD COLUMN "branchCode" TEXT;
ALTER TABLE "DoctorOrderLine" ADD COLUMN "branchCode" TEXT;

UPDATE "ClinicalConsultation" AS child SET "branchCode" = parent."branchCode"
FROM "Visit" AS parent WHERE child."visitId" = parent."id";

UPDATE "ClinicalConsultationVersion" AS child SET "branchCode" = parent."branchCode"
FROM "ClinicalConsultation" AS parent WHERE child."consultationId" = parent."id";

UPDATE "Diagnosis" AS child SET "branchCode" = parent."branchCode"
FROM "ClinicalConsultation" AS parent WHERE child."consultationId" = parent."id";

UPDATE "TreatmentPlan" AS child SET "branchCode" = parent."branchCode"
FROM "ClinicalConsultation" AS parent WHERE child."consultationId" = parent."id";

-- Solo durante el backfill estructural; se restaura dentro de la misma transacción.
ALTER TABLE "TreatmentProposalOutcome" DISABLE TRIGGER "TreatmentProposalOutcome_prevent_update_delete";
UPDATE "TreatmentProposalOutcome" AS child SET "branchCode" = parent."branchCode"
FROM "Visit" AS parent WHERE child."visitId" = parent."id";
ALTER TABLE "TreatmentProposalOutcome" ENABLE TRIGGER "TreatmentProposalOutcome_prevent_update_delete";

UPDATE "Prescription" AS child SET "branchCode" = parent."branchCode"
FROM "Visit" AS parent WHERE child."visitId" = parent."id";

UPDATE "PrescriptionItem" AS child SET "branchCode" = parent."branchCode"
FROM "Prescription" AS parent WHERE child."prescriptionId" = parent."id";

UPDATE "ClinicalEvolution" AS child SET "branchCode" = parent."branchCode"
FROM "Visit" AS parent WHERE child."visitId" = parent."id";

UPDATE "ClinicalNote" AS child SET "branchCode" = parent."branchCode"
FROM "Visit" AS parent WHERE child."visitId" = parent."id";

UPDATE "ClinicalOrder" AS child SET "branchCode" = parent."branchCode"
FROM "Visit" AS parent WHERE child."visitId" = parent."id";

UPDATE "DoctorOrder" AS child SET "branchCode" = parent."branchCode"
FROM "Visit" AS parent WHERE child."visitId" = parent."id";

UPDATE "DoctorOrderLine" AS child SET "branchCode" = parent."branchCode"
FROM "DoctorOrder" AS parent WHERE child."orderId" = parent."id";

-- El perfil global se atribuye solo cuando hay una única sede activa.
-- Con varias sedes requiere revisión humana; la sede de trabajo actual no
-- demuestra dónde se confirmó históricamente la identidad profesional.
UPDATE "ClinicalProfessionalProfile" AS profile
SET "branchCode" = membership."branchCode"
FROM "InternalUserBranch" AS membership
WHERE membership."userId" = profile."userId" AND membership."active"
AND (SELECT count(*) FROM "InternalUserBranch" m
     WHERE m."userId" = profile."userId" AND m."active") = 1;
COMMIT;
