-- Tarea 14: resultado inmutable de la propuesta de tratamiento.
-- Aceptar crea una instrucción administrativa, nunca una venta automática.

CREATE TYPE "TreatmentProposalOutcomeStatus" AS ENUM (
  'accepted',
  'rejected',
  'needs_time',
  'not_applicable',
  'no_decision'
);

CREATE TYPE "TreatmentProposalOutcomeReason" AS ENUM (
  'agreed_to_start',
  'cost',
  'needs_family_consultation',
  'needs_more_information',
  'schedule',
  'prefers_other_option',
  'clinical_not_applicable',
  'conversation_incomplete',
  'other'
);

CREATE TABLE "TreatmentProposalOutcome" (
  "id" TEXT NOT NULL,
  "consultationId" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "doctorId" TEXT,
  "status" "TreatmentProposalOutcomeStatus" NOT NULL,
  "reason" "TreatmentProposalOutcomeReason" NOT NULL,
  "note" TEXT,
  "administrationInstruction" TEXT,
  "administrationOrderId" TEXT,
  "followUpTaskId" TEXT,
  "supersedesId" TEXT,
  "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TreatmentProposalOutcome_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TreatmentProposalOutcome_status_reason_check" CHECK (
    ("status" = 'accepted' AND "reason" IN ('agreed_to_start', 'other'))
    OR ("status" = 'rejected' AND "reason" IN ('cost', 'prefers_other_option', 'other'))
    OR ("status" = 'needs_time' AND "reason" IN (
      'cost',
      'needs_family_consultation',
      'needs_more_information',
      'schedule',
      'other'
    ))
    OR ("status" = 'not_applicable' AND "reason" IN ('clinical_not_applicable', 'other'))
    OR ("status" = 'no_decision' AND "reason" IN ('conversation_incomplete', 'other'))
  ),
  CONSTRAINT "TreatmentProposalOutcome_administration_check" CHECK (
    (
      "status" = 'accepted'
      AND LENGTH(TRIM("administrationInstruction")) >= 4
      AND "administrationOrderId" IS NOT NULL
    )
    OR (
      "status" <> 'accepted'
      AND "administrationInstruction" IS NULL
      AND "administrationOrderId" IS NULL
    )
  ),
  CONSTRAINT "TreatmentProposalOutcome_follow_up_check" CHECK (
    "followUpTaskId" IS NULL OR "status" = 'needs_time'
  )
);

CREATE UNIQUE INDEX "TreatmentProposalOutcome_administrationOrderId_key"
  ON "TreatmentProposalOutcome"("administrationOrderId");
CREATE UNIQUE INDEX "TreatmentProposalOutcome_followUpTaskId_key"
  ON "TreatmentProposalOutcome"("followUpTaskId");
CREATE UNIQUE INDEX "TreatmentProposalOutcome_supersedesId_key"
  ON "TreatmentProposalOutcome"("supersedesId");
CREATE UNIQUE INDEX "TreatmentProposalOutcome_root_per_consultation_key"
  ON "TreatmentProposalOutcome"("consultationId")
  WHERE "supersedesId" IS NULL;
CREATE UNIQUE INDEX "TreatmentProposalOutcome_accepted_per_consultation_key"
  ON "TreatmentProposalOutcome"("consultationId")
  WHERE "status" = 'accepted';
CREATE INDEX "TreatmentProposalOutcome_consultationId_decidedAt_idx"
  ON "TreatmentProposalOutcome"("consultationId", "decidedAt");
CREATE INDEX "TreatmentProposalOutcome_visitId_decidedAt_idx"
  ON "TreatmentProposalOutcome"("visitId", "decidedAt");
CREATE INDEX "TreatmentProposalOutcome_doctorId_decidedAt_idx"
  ON "TreatmentProposalOutcome"("doctorId", "decidedAt");
CREATE INDEX "TreatmentProposalOutcome_status_decidedAt_idx"
  ON "TreatmentProposalOutcome"("status", "decidedAt");
CREATE INDEX "TreatmentProposalOutcome_reason_decidedAt_idx"
  ON "TreatmentProposalOutcome"("reason", "decidedAt");

ALTER TABLE "TreatmentProposalOutcome"
  ADD CONSTRAINT "TreatmentProposalOutcome_consultationId_fkey"
  FOREIGN KEY ("consultationId") REFERENCES "ClinicalConsultation"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TreatmentProposalOutcome"
  ADD CONSTRAINT "TreatmentProposalOutcome_visitId_fkey"
  FOREIGN KEY ("visitId") REFERENCES "Visit"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TreatmentProposalOutcome"
  ADD CONSTRAINT "TreatmentProposalOutcome_doctorId_fkey"
  FOREIGN KEY ("doctorId") REFERENCES "InternalUser"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TreatmentProposalOutcome"
  ADD CONSTRAINT "TreatmentProposalOutcome_administrationOrderId_fkey"
  FOREIGN KEY ("administrationOrderId") REFERENCES "ClinicalOrder"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TreatmentProposalOutcome"
  ADD CONSTRAINT "TreatmentProposalOutcome_followUpTaskId_fkey"
  FOREIGN KEY ("followUpTaskId") REFERENCES "FollowUpTask"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TreatmentProposalOutcome"
  ADD CONSTRAINT "TreatmentProposalOutcome_supersedesId_fkey"
  FOREIGN KEY ("supersedesId") REFERENCES "TreatmentProposalOutcome"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Los planes anteriores demuestran que existió una propuesta, pero no
-- demuestran que el paciente la aceptó. Se conservan como "sin decisión".
INSERT INTO "TreatmentProposalOutcome" (
  "id",
  "consultationId",
  "visitId",
  "doctorId",
  "status",
  "reason",
  "note",
  "decidedAt",
  "createdAt"
)
SELECT
  'legacy-proposal-' || MD5(consultation."id"),
  consultation."id",
  consultation."visitId",
  consultation."doctorId",
  'no_decision',
  'conversation_incomplete',
  'Plan anterior a la captura explícita del resultado. No prueba aceptación.',
  consultation."updatedAt",
  CURRENT_TIMESTAMP
FROM "ClinicalConsultation" AS consultation
WHERE LENGTH(TRIM(COALESCE(consultation."treatmentPlanText", ''))) > 0;

CREATE OR REPLACE FUNCTION "prevent_treatment_proposal_outcome_mutation"()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'TreatmentProposalOutcome is append-only: % is not allowed', TG_OP
    USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "TreatmentProposalOutcome_prevent_update_delete"
BEFORE UPDATE OR DELETE ON "TreatmentProposalOutcome"
FOR EACH ROW
EXECUTE FUNCTION "prevent_treatment_proposal_outcome_mutation"();
