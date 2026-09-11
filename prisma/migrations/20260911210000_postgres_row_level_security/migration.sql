-- Tarea 16: roles de conexión y segunda barrera de aislamiento en PostgreSQL.
-- Las contraseñas se provisionan fuera del repositorio. Ambos roles nacen sin
-- contraseña utilizable para que la migración nunca invente un secreto.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sigeco_web') THEN
    CREATE ROLE sigeco_web LOGIN PASSWORD NULL
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sigeco_maintenance') THEN
    CREATE ROLE sigeco_maintenance LOGIN PASSWORD NULL
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT BYPASSRLS;
  END IF;
END $$;

ALTER ROLE sigeco_web NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
ALTER ROLE sigeco_maintenance NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT BYPASSRLS;
REVOKE sigeco_maintenance FROM sigeco_web;
DO $$
BEGIN
  IF current_user = 'sigeco_web' THEN
    RAISE EXCEPTION 'RLS migration cannot run with sigeco_web';
  END IF;
  IF current_user <> 'sigeco_maintenance' THEN
    EXECUTE format('GRANT sigeco_maintenance TO %I', current_user);
  END IF;
END $$;
REVOKE CREATE ON SCHEMA public FROM sigeco_web;
GRANT USAGE ON SCHEMA public TO sigeco_web, sigeco_maintenance;
GRANT CREATE ON SCHEMA public TO sigeco_maintenance;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sigeco_web;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sigeco_web;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON ALL TABLES IN SCHEMA public TO sigeco_maintenance;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO sigeco_maintenance;
ALTER DEFAULT PRIVILEGES FOR ROLE sigeco_maintenance IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sigeco_web;
ALTER DEFAULT PRIVILEGES FOR ROLE sigeco_maintenance IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO sigeco_web;

CREATE OR REPLACE FUNCTION sigeco_setting(setting_name TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT NULLIF(current_setting(setting_name, true), '')
$$;

CREATE OR REPLACE FUNCTION sigeco_is_local_branch(row_branch TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT row_branch = sigeco_setting('app.branch_code')
    AND (
      sigeco_setting('app.effective_role') = 'system_job'
      OR EXISTS (
        SELECT 1
        FROM "InternalUserBranch" membership
        JOIN "InternalUser" account ON account."id" = membership."userId"
        WHERE membership."userId" = sigeco_setting('app.user_id')
          AND membership."branchCode" = row_branch
          AND membership."active"
          AND account."active"
          AND membership."role"::text = sigeco_setting('app.effective_role')
      )
    )
$$;

CREATE OR REPLACE FUNCTION sigeco_can_write_branch(row_branch TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT sigeco_is_local_branch(row_branch)
    AND sigeco_setting('app.access_mode') = 'work'
$$;

CREATE OR REPLACE FUNCTION sigeco_continuity_allows(
  row_branch TEXT,
  row_patient_id TEXT,
  nursing_visible BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT row_branch <> sigeco_setting('app.branch_code')
    AND row_patient_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM "PatientConsent" consent
      WHERE consent."patientId" = row_patient_id
        AND consent."purpose" = 'clinical_continuity'
        AND consent."decision" = 'granted'
        AND NOT EXISTS (
          SELECT 1
          FROM "PatientConsent" newer
          WHERE newer."patientId" = consent."patientId"
            AND newer."purpose" = consent."purpose"
            AND (newer."decidedAt", newer."createdAt", newer."id") >
                (consent."decidedAt", consent."createdAt", consent."id")
        )
    )
    AND (
      (
        sigeco_setting('app.effective_role') = 'medico'
        AND EXISTS (
          SELECT 1
          FROM "ClinicalContinuityAccess" access
          JOIN "InternalUserBranch" membership
            ON membership."userId" = access."doctorId"
           AND membership."branchCode" = access."branchCode"
          JOIN "InternalUser" account ON account."id" = access."doctorId"
          WHERE access."id" = sigeco_setting('app.continuity_access_id')
            AND access."patientId" = row_patient_id
            AND access."doctorId" = sigeco_setting('app.user_id')
            AND access."branchCode" = sigeco_setting('app.branch_code')
            AND row_branch = ANY(access."consultedBranchCodes")
            AND access."expiresAt" > CURRENT_TIMESTAMP
            AND membership."active" AND membership."role" = 'medico'
            AND account."active"
        )
      )
      OR (
        nursing_visible
        AND sigeco_setting('app.effective_role') = 'enfermeria'
        AND EXISTS (
          SELECT 1
          FROM "NursingContinuityAccess" access
          JOIN "InternalUserBranch" membership
            ON membership."userId" = access."nurseId"
           AND membership."branchCode" = access."branchCode"
          JOIN "InternalUser" account ON account."id" = access."nurseId"
          WHERE access."id" = sigeco_setting('app.continuity_access_id')
            AND access."patientId" = row_patient_id
            AND access."nurseId" = sigeco_setting('app.user_id')
            AND access."branchCode" = sigeco_setting('app.branch_code')
            AND row_branch = ANY(access."consultedBranchCodes")
            AND access."expiresAt" > CURRENT_TIMESTAMP
            AND membership."active" AND membership."role" = 'enfermeria'
            AND account."active"
        )
      )
    )
$$;

REVOKE ALL ON FUNCTION sigeco_setting(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION sigeco_is_local_branch(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION sigeco_can_write_branch(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION sigeco_continuity_allows(TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sigeco_setting(TEXT) TO sigeco_web;
GRANT EXECUTE ON FUNCTION sigeco_is_local_branch(TEXT) TO sigeco_web;
GRANT EXECUTE ON FUNCTION sigeco_can_write_branch(TEXT) TO sigeco_web;
GRANT EXECUTE ON FUNCTION sigeco_continuity_allows(TEXT, TEXT, BOOLEAN) TO sigeco_web;

-- Política uniforme para operaciones que pertenecen a una sola sede.
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'PatientBranchRecord','PatientConsent','PatientContact','PatientNote',
    'Lead','LeadContactAttempt','LeadReminder','LeadStatusHistory','CaptureCampaignBranch',
    'Visit','VisitDiscontinuation','VisitAttribution','VisitAttributionTouch',
    'VisitStatusHistory','ReceptionCheckIn','PatientRoute','PatientRouteStep',
    'VisitAreaTimeEvent','VisitWorkItem','ClinicalConsultation',
    'ClinicalConsultationVersion','Diagnosis','TreatmentPlan','TreatmentProposalOutcome',
    'Prescription','PrescriptionItem','ClinicalEvolution','ClinicalNote','ClinicalOrder',
    'ClinicalProfessionalProfile','DoctorOrder','DoctorOrderLine','ClinicalContinuityAccess',
    'IndicationCatalogItemBranch','DiagnosisCatalogItemBranch','ClinicalNoteCatalogItemBranch',
    'Study','VitalSigns','NursingApplication','NursingNote','ClinicalAttachment',
    'NursingWorkItemResult','ServiceSessionPackage','ServiceSessionUse',
    'SupplierBranchProfile','BranchInventoryItem','PaymentMethodBranch','ServiceCatalogItemBranch',
    'BranchInventoryBalance','Purchase','PurchaseLine','PurchasePayment','PurchaseReceipt',
    'PurchaseReceiptLine','InventoryLot','InventoryLotAdjustment','PurchaseDocument',
    'InventoryMovement','InventoryAdjustment','InventoryAlert','Sale','GeneratedDocument',
    'SaleItem','Payment','DeliveredProduct','CashMovement','CashSession',
    'CashSessionReconciliation','CashExpense','CashExpenseBeneficiary','FollowUpTask',
    'FollowUpAttempt','FollowUpStatusHistory','FollowUpTemplate','SupervisedReminderRule',
    'SupervisedReminderRuleVersion','SupervisedReminderCandidate',
    'SupervisedReminderReviewEvent','PatientFeedbackRequest','PatientFeedback',
    'PatientFeedbackCase','PatientFeedbackCaseEvent','ModuleActivation',
    'ModuleActivationEvent','NursingContinuityAccess'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY branch_select ON %I FOR SELECT TO sigeco_web USING (sigeco_is_local_branch("branchCode"))',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY branch_insert ON %I FOR INSERT TO sigeco_web WITH CHECK (sigeco_can_write_branch("branchCode"))',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY branch_update ON %I FOR UPDATE TO sigeco_web USING (sigeco_can_write_branch("branchCode")) WITH CHECK (sigeco_can_write_branch("branchCode"))',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY branch_delete ON %I FOR DELETE TO sigeco_web USING (sigeco_can_write_branch("branchCode"))',
      table_name
    );
  END LOOP;
END $$;

-- Traslados: ambas sedes pueden leer el comprobante, pero la escritura nace
-- siempre desde la sede de origen autorizada.
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['InventoryTransfer','InventoryTransferLotAllocation']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY transfer_select ON %I FOR SELECT TO sigeco_web USING (sigeco_is_local_branch("sourceBranchCode") OR sigeco_is_local_branch("destinationBranchCode"))',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY transfer_insert ON %I FOR INSERT TO sigeco_web WITH CHECK (sigeco_can_write_branch("sourceBranchCode"))',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY transfer_update ON %I FOR UPDATE TO sigeco_web USING (sigeco_can_write_branch("sourceBranchCode")) WITH CHECK (sigeco_can_write_branch("sourceBranchCode"))',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY transfer_delete ON %I FOR DELETE TO sigeco_web USING (sigeco_can_write_branch("sourceBranchCode"))',
      table_name
    );
  END LOOP;
END $$;

ALTER TABLE "ClinicalAttachmentAccessGrant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClinicalAttachmentAccessGrant" FORCE ROW LEVEL SECURITY;
CREATE POLICY attachment_grant_select ON "ClinicalAttachmentAccessGrant"
  FOR SELECT TO sigeco_web
  USING (
    "userId" = sigeco_setting('app.user_id')
    AND sigeco_is_local_branch("requestingBranchCode")
  );
CREATE POLICY attachment_grant_insert ON "ClinicalAttachmentAccessGrant"
  FOR INSERT TO sigeco_web
  WITH CHECK (
    "userId" = sigeco_setting('app.user_id')
    AND "actorRole"::text = sigeco_setting('app.effective_role')
    AND sigeco_can_write_branch("requestingBranchCode")
    AND (
      "branchCode" = "requestingBranchCode"
      OR (
        sigeco_continuity_allows("branchCode", "patientId", true)
        AND (
          "actorRole" = 'medico'
          OR (
            "actorRole" = 'enfermeria'
            AND EXISTS (
              SELECT 1
              FROM "ClinicalAttachment" attachment
              JOIN "Study" study
                ON study."id" = attachment."studyId"
               AND study."branchCode" = attachment."branchCode"
              JOIN "ClinicalOrder" clinical_order
                ON clinical_order."id" = study."clinicalOrderId"
               AND clinical_order."branchCode" = study."branchCode"
              WHERE attachment."id" = "ClinicalAttachmentAccessGrant"."attachmentId"
                AND attachment."branchCode" = "ClinicalAttachmentAccessGrant"."branchCode"
                AND clinical_order."targetArea" = 'enfermeria'
            )
          )
        )
      )
    )
  );
CREATE POLICY attachment_grant_update ON "ClinicalAttachmentAccessGrant"
  FOR UPDATE TO sigeco_web
  USING ("userId" = sigeco_setting('app.user_id') AND sigeco_is_local_branch("requestingBranchCode"))
  WITH CHECK ("userId" = sigeco_setting('app.user_id') AND sigeco_can_write_branch("requestingBranchCode"));
CREATE POLICY attachment_grant_delete ON "ClinicalAttachmentAccessGrant"
  FOR DELETE TO sigeco_web
  USING ("userId" = sigeco_setting('app.user_id') AND sigeco_can_write_branch("requestingBranchCode"));

ALTER TABLE "AuditEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditEvent" FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_select ON "AuditEvent"
  FOR SELECT TO sigeco_web
  USING (
    ("scope" = 'branch' AND sigeco_is_local_branch("branchCode"))
    OR (
      "scope" = 'platform'
      AND sigeco_setting('app.effective_role') = 'super_admin'
      AND sigeco_is_local_branch(sigeco_setting('app.branch_code'))
    )
  );
CREATE POLICY audit_insert ON "AuditEvent"
  FOR INSERT TO sigeco_web
  WITH CHECK (
    ("scope" = 'branch' AND sigeco_is_local_branch("branchCode"))
    OR (
      "scope" = 'platform'
      AND "branchCode" IS NULL
      AND sigeco_setting('app.platform_audit_write') = 'true'
    )
  );

-- Políticas SELECT adicionales. Las políticas PostgreSQL son permisivas: esta
-- lectura se suma a la local y nunca habilita INSERT, UPDATE ni DELETE.
CREATE POLICY continuity_visit ON "Visit" FOR SELECT TO sigeco_web
  USING (sigeco_continuity_allows("branchCode", "patientId", true));
CREATE POLICY continuity_patient_record ON "PatientBranchRecord" FOR SELECT TO sigeco_web
  USING (sigeco_continuity_allows("branchCode", "patientId", false));
CREATE POLICY continuity_consent ON "PatientConsent" FOR SELECT TO sigeco_web
  USING (sigeco_continuity_allows("branchCode", "patientId", true));

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'ClinicalConsultation','Prescription','ClinicalEvolution','ClinicalNote',
    'VitalSigns','NursingApplication','NursingNote','ServiceSessionPackage'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY continuity_direct_patient ON %I FOR SELECT TO sigeco_web USING (sigeco_continuity_allows("branchCode", "patientId", %L))',
      table_name,
      table_name IN ('VitalSigns','NursingApplication','NursingNote','ServiceSessionPackage')
    );
  END LOOP;
END $$;

CREATE POLICY continuity_clinical_order ON "ClinicalOrder" FOR SELECT TO sigeco_web
  USING (
    sigeco_continuity_allows("branchCode", "patientId", false)
    OR (
      "targetArea" = 'enfermeria'
      AND sigeco_continuity_allows("branchCode", "patientId", true)
    )
  );
CREATE POLICY continuity_study ON "Study" FOR SELECT TO sigeco_web
  USING (
    sigeco_continuity_allows("branchCode", "patientId", false)
    OR (
      sigeco_continuity_allows("branchCode", "patientId", true)
      AND EXISTS (
        SELECT 1
        FROM "ClinicalOrder" clinical_order
        WHERE clinical_order."id" = "Study"."clinicalOrderId"
          AND clinical_order."branchCode" = "Study"."branchCode"
          AND clinical_order."targetArea" = 'enfermeria'
      )
    )
  );
CREATE POLICY continuity_attachment ON "ClinicalAttachment" FOR SELECT TO sigeco_web
  USING (
    sigeco_continuity_allows("branchCode", "patientId", false)
    OR (
      sigeco_continuity_allows("branchCode", "patientId", true)
      AND EXISTS (
        SELECT 1
        FROM "Study" study
        JOIN "ClinicalOrder" clinical_order
          ON clinical_order."id" = study."clinicalOrderId"
         AND clinical_order."branchCode" = study."branchCode"
        WHERE study."id" = "ClinicalAttachment"."studyId"
          AND study."branchCode" = "ClinicalAttachment"."branchCode"
          AND clinical_order."targetArea" = 'enfermeria'
      )
    )
    OR EXISTS (
      SELECT 1
      FROM "ClinicalAttachmentAccessGrant" access_grant
      JOIN "InternalUserBranch" membership
        ON membership."userId" = access_grant."userId"
       AND membership."branchCode" = access_grant."requestingBranchCode"
      WHERE access_grant."attachmentId" = "ClinicalAttachment"."id"
        AND access_grant."branchCode" = "ClinicalAttachment"."branchCode"
        AND access_grant."patientId" = "ClinicalAttachment"."patientId"
        AND access_grant."userId" = sigeco_setting('app.user_id')
        AND access_grant."requestingBranchCode" = sigeco_setting('app.branch_code')
        AND access_grant."actorRole"::text = sigeco_setting('app.effective_role')
        AND access_grant."expiresAt" > CURRENT_TIMESTAMP
        AND access_grant."consumedAt" IS NULL
        AND membership."active"
        AND membership."role" = access_grant."actorRole"
    )
  );

CREATE POLICY continuity_diagnosis ON "Diagnosis" FOR SELECT TO sigeco_web
  USING (sigeco_continuity_allows(
    "branchCode",
    (SELECT consultation."patientId" FROM "ClinicalConsultation" consultation WHERE consultation."id" = "consultationId"),
    false
  ));
CREATE POLICY continuity_prescription_item ON "PrescriptionItem" FOR SELECT TO sigeco_web
  USING (sigeco_continuity_allows(
    "branchCode",
    (SELECT prescription."patientId" FROM "Prescription" prescription WHERE prescription."id" = "prescriptionId"),
    false
  ));
CREATE POLICY continuity_session_use ON "ServiceSessionUse" FOR SELECT TO sigeco_web
  USING (sigeco_continuity_allows(
    "branchCode",
    (SELECT package."patientId" FROM "ServiceSessionPackage" package WHERE package."id" = "packageId"),
    true
  ));

-- El rol técnico queda como propietario real de los objetos ya existentes.
-- La cuenta que aplica migraciones puede asumirlo; la cuenta web nunca recibe
-- esa membresía y por tanto no puede desactivar políticas ni cambiar de rol.
DO $$
DECLARE
  object_name RECORD;
BEGIN
  FOR object_name IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I OWNER TO sigeco_maintenance',
      object_name.schemaname,
      object_name.tablename
    );
  END LOOP;

  FOR object_name IN
    SELECT sequence_schema, sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
  LOOP
    EXECUTE format(
      'ALTER SEQUENCE %I.%I OWNER TO sigeco_maintenance',
      object_name.sequence_schema,
      object_name.sequence_name
    );
  END LOOP;

  FOR object_name IN
    SELECT namespace.nspname AS type_schema, type.typname AS type_name
    FROM pg_type type
    JOIN pg_namespace namespace ON namespace.oid = type.typnamespace
    LEFT JOIN pg_depend dependency
      ON dependency.classid = 'pg_type'::regclass
     AND dependency.objid = type.oid
     AND dependency.deptype = 'e'
    WHERE namespace.nspname = 'public'
      AND type.typtype = 'e'
      AND dependency.objid IS NULL
  LOOP
    EXECUTE format(
      'ALTER TYPE %I.%I OWNER TO sigeco_maintenance',
      object_name.type_schema,
      object_name.type_name
    );
  END LOOP;
END $$;

ALTER FUNCTION sigeco_setting(TEXT) OWNER TO sigeco_maintenance;
ALTER FUNCTION sigeco_is_local_branch(TEXT) OWNER TO sigeco_maintenance;
ALTER FUNCTION sigeco_can_write_branch(TEXT) OWNER TO sigeco_maintenance;
ALTER FUNCTION sigeco_continuity_allows(TEXT, TEXT, BOOLEAN) OWNER TO sigeco_maintenance;

-- La cuenta web no recibe ownership, BYPASSRLS, CREATE, TRUNCATE ni capacidad
-- de administrar roles. El rol técnico no se concede al rol web.
