import { NextResponse } from "next/server";
import { createLeadSchema, sanitizeLeadInput } from "@/features/leads/schemas/lead.schema";

type StoredLead = ReturnType<typeof sanitizeLeadInput> & {
  id: string;
  status: "new";
  createdAt: string;
};

const leadStore = globalThis as typeof globalThis & {
  __saludInterculturalLeads?: StoredLead[];
};

function getLeadStore() {
  leadStore.__saludInterculturalLeads ??= [];
  return leadStore.__saludInterculturalLeads;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createLeadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Revisa los datos del formulario.",
        errors: parsed.error.flatten().fieldErrors
      },
      { status: 400 }
    );
  }

  const lead: StoredLead = {
    id: crypto.randomUUID(),
    ...sanitizeLeadInput(parsed.data),
    status: "new",
    createdAt: new Date().toISOString()
  };

  // Persistencia temporal para desarrollo. La tarea de leads conectara este
  // contrato con PostgreSQL/Payload sin cambiar el formulario publico.
  getLeadStore().unshift(lead);

  return NextResponse.json(
    {
      ok: true,
      lead,
      message: "Consulta registrada correctamente."
    },
    { status: 201 }
  );
}
