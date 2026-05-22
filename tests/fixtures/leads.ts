import type { CreateLeadInput } from "@/features/leads/schemas/lead.schema";

export const validLeadInput: CreateLeadInput = {
  name: "Paciente Test",
  phone: "+591 70000000",
  email: "paciente@example.com",
  interest: "Consulta inicial",
  message: "Quiero recibir orientación sobre una valoración.",
  source: "website",
  status: "new",
  pagePath: "/contacto",
  website: ""
};

export const persistedLead = {
  id: "lead_123",
  name: validLeadInput.name ?? null,
  phone: validLeadInput.phone,
  email: validLeadInput.email ?? null,
  interest: validLeadInput.interest ?? null,
  message: validLeadInput.message ?? null,
  source: "website" as const,
  status: "new" as const,
  pagePath: validLeadInput.pagePath ?? null,
  notes: null,
  contactedAt: null,
  createdAt: new Date("2026-05-21T10:00:00.000Z"),
  updatedAt: new Date("2026-05-21T10:00:00.000Z")
};
