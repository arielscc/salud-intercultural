import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/modules/database";
import {
  createInternalLeadRecord,
  createLeadContactAttempt,
  createLeadReminder,
  getInternalLeadById,
  getInternalLeads,
  updateInternalLeadStatus
} from "@/modules/database/queries/leads-v3";
import { hashPassword } from "@/features/internal-auth/password";

async function cleanInternalCrm() {
  await prisma.lead.deleteMany();
  await prisma.internalSession.deleteMany();
  await prisma.internalUser.deleteMany();
}

beforeEach(cleanInternalCrm);
afterEach(cleanInternalCrm);

describe("internal lead queries integration", () => {
  it("creates, filters, updates and tracks internal lead workflow records", async () => {
    const user = await prisma.internalUser.create({
      data: {
        email: "captacion@example.com",
        name: "Captacion Test",
        passwordHash: await hashPassword("clave-segura-123"),
        role: "captacion"
      }
    });

    const lead = await createInternalLeadRecord({
      name: "Paciente V3",
      phone: "+591 70000003",
      city: "El Alto",
      source: "whatsapp",
      assignedToId: user.id,
      createdById: user.id
    });

    await updateInternalLeadStatus({
      leadId: lead.id,
      status: "interested",
      userId: user.id,
      note: "Quiere informacion adicional."
    });

    await createLeadContactAttempt({
      leadId: lead.id,
      userId: user.id,
      method: "call",
      result: "interested",
      notes: "Respondio la llamada."
    });

    await createLeadReminder({
      leadId: lead.id,
      userId: user.id,
      dueAt: new Date("2026-06-01T14:00:00.000Z"),
      note: "Confirmar visita."
    });

    const filtered = await getInternalLeads({
      search: "Paciente V3",
      source: "whatsapp",
      pageSize: 10
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]).toMatchObject({
      id: lead.id,
      phone: "+591 70000003",
      status: "reminder_pending"
    });

    const detail = await getInternalLeadById(lead.id);

    expect(detail?.statusHistory).toHaveLength(3);
    expect(detail?.contactAttempts).toHaveLength(1);
    expect(detail?.reminders).toHaveLength(1);
    expect(detail?.assignedTo?.email).toBe("captacion@example.com");
  });
});
