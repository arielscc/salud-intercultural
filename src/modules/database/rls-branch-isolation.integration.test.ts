import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool, type PoolClient } from "pg";

const suffix = randomUUID();
const localBranch = `rls-local-${suffix}`;
const remoteBranch = `rls-remote-${suffix}`;
const patientId = `rls-patient-${suffix}`;
const localVisitId = `rls-visit-local-${suffix}`;
const remoteVisitId = `rls-visit-remote-${suffix}`;
const consultationId = `rls-consultation-${suffix}`;
const nursingNoteId = `rls-nursing-note-${suffix}`;
const adminId = `rls-admin-${suffix}`;
const doctorId = `rls-doctor-${suffix}`;
const nurseId = `rls-nurse-${suffix}`;
const doctorAccessId = `rls-doctor-access-${suffix}`;
const nurseAccessId = `rls-nurse-access-${suffix}`;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

type RlsTestContext = {
  branchCode: string;
  userId: string;
  effectiveRole: "administracion" | "medico" | "enfermeria";
  accessMode?: "work" | "consult";
  continuityAccessId?: string;
};

async function configureWebContext(client: PoolClient, context: RlsTestContext) {
  await client.query("SET LOCAL ROLE sigeco_web");
  await client.query(
    `SELECT
       set_config('app.branch_code', $1, true),
       set_config('app.user_id', $2, true),
       set_config('app.effective_role', $3, true),
       set_config('app.access_mode', $4, true),
       set_config('app.continuity_access_id', $5, true),
       set_config('app.platform_audit_write', 'false', true)`,
    [
      context.branchCode,
      context.userId,
      context.effectiveRole,
      context.accessMode ?? "work",
      context.continuityAccessId ?? ""
    ]
  );
}

async function asWeb<T>(
  context: RlsTestContext,
  operation: (client: PoolClient) => Promise<T>
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await configureWebContext(client, context);
    const result = await operation(client);
    await client.query("ROLLBACK");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function asAuthenticatedWeb<T>(operation: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL SESSION AUTHORIZATION sigeco_web");
    const result = await operation(client);
    await client.query("ROLLBACK");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

beforeAll(async () => {
  const now = new Date();
  await pool.query(
    `INSERT INTO "ClinicBranch"
       ("code", "name", "city", "department", "status", "createdAt", "updatedAt")
     VALUES ($1, $1, 'Prueba', 'Prueba', 'active', $3, $3),
            ($2, $2, 'Prueba', 'Prueba', 'active', $3, $3)`,
    [localBranch, remoteBranch, now]
  );
  for (const [id, role] of [
    [adminId, "administracion"],
    [doctorId, "medico"],
    [nurseId, "enfermeria"]
  ] as const) {
    await pool.query(
      `INSERT INTO "InternalUser"
         ("id", "email", "passwordHash", "active", "createdAt", "updatedAt")
       VALUES ($1, $2, 'synthetic-unusable-hash', true, $3, $3)`,
      [id, `${id}@example.invalid`, now]
    );
    await pool.query(
      `INSERT INTO "InternalUserBranch"
         ("userId", "branchCode", "role", "active", "isDefault", "assignedAt", "updatedAt")
       VALUES ($1, $2, $3::"InternalRole", true, true, $4, $4)`,
      [id, localBranch, role, now]
    );
  }
  await pool.query(
    `INSERT INTO "Patient"
       ("id", "internalCode", "fullName", "phone", "normalizedName",
        "normalizedPhone", "createdAt", "updatedAt")
     VALUES ($1, $1, 'Paciente RLS', '00000000', 'paciente rls', '00000000', $2, $2)`,
    [patientId, now]
  );
  await pool.query(
    `INSERT INTO "PatientBranchRecord"
       ("patientId", "branchCode", "recordNumber", "createdAt", "updatedAt")
     VALUES ($1, $2, $2 || '-1', $4, $4), ($1, $3, $3 || '-1', $4, $4)`,
    [patientId, localBranch, remoteBranch, now]
  );
  await pool.query(
    `INSERT INTO "Visit"
       ("id", "patientId", "branchCode", "patientNameSnapshot",
        "patientPhoneSnapshot", "isTestData", "status", "createdAt", "updatedAt")
     VALUES ($1, $3, $4, 'Paciente RLS', '00000000', true, 'in_consultation', $5, $5),
            ($2, $3, $6, 'Paciente RLS', '00000000', true, 'in_consultation', $5, $5)`,
    [localVisitId, remoteVisitId, patientId, localBranch, now, remoteBranch]
  );
  await pool.query(
    `INSERT INTO "ClinicalConsultation"
       ("id", "visitId", "patientId", "branchCode", "motive", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, 'Antecedente remoto RLS', $5, $5)`,
    [consultationId, remoteVisitId, patientId, remoteBranch, now]
  );
  await pool.query(
    `INSERT INTO "NursingNote"
       ("id", "patientId", "branchCode", "visitId", "note", "createdAt")
     VALUES ($1, $2, $3, $4, 'Antecedente de enfermeria RLS', $5)`,
    [nursingNoteId, patientId, remoteBranch, remoteVisitId, now]
  );
  await pool.query(
    `INSERT INTO "PatientConsent"
       ("id", "patientId", "branchCode", "purpose", "decision", "contactChannels",
        "captureMethod", "textVersion", "textSnapshot", "decidedAt", "createdAt")
     VALUES ($1, $2, $3, 'clinical_continuity', 'granted', ARRAY[]::"PatientContactChannel"[],
             'written_form', 'test', 'Consentimiento sintetico RLS', $4, $4)`,
    [`rls-consent-${suffix}`, patientId, localBranch, now]
  );
  await pool.query(
    `INSERT INTO "ClinicalContinuityAccess"
       ("id", "patientId", "visitId", "doctorId", "branchCode", "reason",
        "consultedBranchCodes", "expiresAt", "createdAt")
     VALUES ($1, $2, $3, $4, $5, 'Prueba automatizada RLS', ARRAY[$6]::text[],
             (CURRENT_TIMESTAMP + INTERVAL '15 minutes')::timestamp, $7)`,
    [doctorAccessId, patientId, localVisitId, doctorId, localBranch, remoteBranch, now]
  );
  await pool.query(
    `INSERT INTO "NursingContinuityAccess"
       ("id", "patientId", "visitId", "nurseId", "branchCode", "reason",
        "consultedBranchCodes", "expiresAt", "createdAt")
     VALUES ($1, $2, $3, $4, $5, 'Prueba automatizada RLS', ARRAY[$6]::text[],
             (CURRENT_TIMESTAMP + INTERVAL '15 minutes')::timestamp, $7)`,
    [nurseAccessId, patientId, localVisitId, nurseId, localBranch, remoteBranch, now]
  );
});

afterAll(async () => {
  await pool.query('TRUNCATE TABLE "Patient" CASCADE');
  await pool.query(
    `DELETE FROM "InternalUser" WHERE "id" = ANY($1::text[])`,
    [[adminId, doctorId, nurseId]]
  );
  await pool.query(
    `DELETE FROM "ClinicBranch" WHERE "code" = ANY($1::text[])`,
    [[localBranch, remoteBranch]]
  );
  await pool.end();
});

describe("PostgreSQL row-level security", () => {
  it("aisla una consulta sin filtro y rechaza escrituras en otra sucursal", async () => {
    const rows = await asWeb(
      { branchCode: localBranch, userId: adminId, effectiveRole: "administracion" },
      (client) => client.query<{ branchCode: string }>('SELECT "branchCode" FROM "Visit"')
    );
    expect(rows.rows.map((row) => row.branchCode)).toEqual([localBranch]);

    const crossUpdate = await asWeb(
      { branchCode: localBranch, userId: adminId, effectiveRole: "administracion" },
      (client) =>
        client.query('UPDATE "Visit" SET "reason" = $1 WHERE "id" = $2', [
          "No debe escribirse",
          remoteVisitId
        ])
    );
    expect(crossUpdate.rowCount).toBe(0);

    await expect(
      asWeb(
        { branchCode: localBranch, userId: adminId, effectiveRole: "administracion" },
        (client) =>
          client.query(
            `INSERT INTO "Visit"
               ("id", "patientId", "branchCode", "patientNameSnapshot",
                "patientPhoneSnapshot", "isTestData", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, 'Cruce', '0', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [`rls-cross-${suffix}`, patientId, remoteBranch]
          )
      )
    ).rejects.toMatchObject({ code: "42501" });

    await expect(
      asWeb(
        {
          branchCode: localBranch,
          userId: adminId,
          effectiveRole: "administracion",
          accessMode: "consult"
        },
        (client) =>
          client.query('UPDATE "Visit" SET "reason" = $1 WHERE "id" = $2', [
            "Modo consulta",
            localVisitId
          ])
      )
    ).resolves.toMatchObject({ rowCount: 0 });
  });

  it("habilita solo la continuidad exacta de medico y enfermeria", async () => {
    const doctorResult = await asWeb(
      {
        branchCode: localBranch,
        userId: doctorId,
        effectiveRole: "medico",
        continuityAccessId: doctorAccessId
      },
      async (client) => ({
        gate: await client.query<{ allowed: boolean }>(
          `SELECT sigeco_continuity_allows($1, $2, false) AS "allowed"`,
          [remoteBranch, patientId]
        ),
        history: await client.query<{ id: string }>('SELECT "id" FROM "ClinicalConsultation"')
      })
    );
    expect(doctorResult.gate.rows).toEqual([{ allowed: true }]);
    expect(doctorResult.history.rows.map((row) => row.id)).toContain(consultationId);

    const withoutAccess = await asWeb(
      { branchCode: localBranch, userId: doctorId, effectiveRole: "medico" },
      (client) => client.query<{ id: string }>('SELECT "id" FROM "ClinicalConsultation"')
    );
    expect(withoutAccess.rows).toHaveLength(0);

    const adminHistory = await asWeb(
      {
        branchCode: localBranch,
        userId: adminId,
        effectiveRole: "administracion",
        continuityAccessId: doctorAccessId
      },
      (client) => client.query<{ id: string }>('SELECT "id" FROM "ClinicalConsultation"')
    );
    expect(adminHistory.rows).toHaveLength(0);

    const nursingHistory = await asWeb(
      {
        branchCode: localBranch,
        userId: nurseId,
        effectiveRole: "enfermeria",
        continuityAccessId: nurseAccessId
      },
      async (client) => ({
        notes: await client.query<{ id: string }>('SELECT "id" FROM "NursingNote"'),
        consultations: await client.query<{ id: string }>(
          'SELECT "id" FROM "ClinicalConsultation"'
        )
      })
    );
    expect(nursingHistory.notes.rows.map((row) => row.id)).toContain(nursingNoteId);
    expect(nursingHistory.consultations.rows).toHaveLength(0);

    const remoteWrite = await asWeb(
      {
        branchCode: localBranch,
        userId: doctorId,
        effectiveRole: "medico",
        continuityAccessId: doctorAccessId
      },
      (client) =>
        client.query('UPDATE "ClinicalConsultation" SET "motive" = $1 WHERE "id" = $2', [
          "No debe escribirse",
          consultationId
        ])
    );
    expect(remoteWrite.rowCount).toBe(0);
  });

  it("no filtra contexto al reutilizar una conexion del pool", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await configureWebContext(client, {
        branchCode: localBranch,
        userId: adminId,
        effectiveRole: "administracion"
      });
      expect((await client.query('SELECT 1 FROM "Visit"')).rowCount).toBe(1);
      await client.query("COMMIT");

      await client.query("BEGIN");
      await client.query("SET LOCAL ROLE sigeco_web");
      expect((await client.query('SELECT 1 FROM "Visit"')).rowCount).toBe(0);
      await client.query("ROLLBACK");
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
    }
  });

  it("impide al rol web asumir mantenimiento o desactivar RLS", async () => {
    await expect(
      asAuthenticatedWeb((client) => client.query("SET ROLE sigeco_maintenance"))
    ).rejects.toMatchObject({ code: "42501" });

    await expect(
      asAuthenticatedWeb((client) =>
        client.query('ALTER TABLE "Visit" DISABLE ROW LEVEL SECURITY')
      )
    ).rejects.toMatchObject({ code: "42501" });
  });
});
