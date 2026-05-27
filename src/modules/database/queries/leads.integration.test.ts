import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/modules/database/client";
import { createLeadRecord, getLeads, updateLeadStatus } from "@/modules/database/queries/leads";

beforeEach(async () => {
  await prisma.lead.deleteMany();
});

afterAll(async () => {
  await prisma.lead.deleteMany();
  await prisma.$disconnect();
});

describe("lead queries integration", () => {
  it("creates, lists, filters and updates leads in the test database", async () => {
    const created = await createLeadRecord({
      name: "Paciente Integracion",
      phone: "+591 70000001",
      email: "integracion@example.com",
      interest: "Consulta inicial",
      message: "Quiero agendar una valoracion.",
      pagePath: "/contacto"
    });

    await createLeadRecord({
      name: "Otro Paciente",
      phone: "+591 70000002",
      source: "whatsapp"
    });

    expect(created).toMatchObject({
      name: "Paciente Integracion",
      phone: "+591 70000001",
      email: "integracion@example.com",
      source: "website",
      status: "new",
      pagePath: "/contacto"
    });

    const searchResults = await getLeads({ search: "integracion" });
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0]?.id).toBe(created.id);

    const whatsappResults = await getLeads({ source: "whatsapp" });
    expect(whatsappResults).toHaveLength(1);
    expect(whatsappResults[0]?.phone).toBe("+591 70000002");

    const updated = await updateLeadStatus(created.id, "contacted");
    expect(updated.status).toBe("contacted");
    expect(updated.contactedAt).toBeInstanceOf(Date);
  });
});
