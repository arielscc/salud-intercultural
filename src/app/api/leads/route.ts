import { NextResponse } from "next/server";
import { createLeadSchema, sanitizeLeadInput } from "@/features/leads/schemas/lead.schema";
import { env } from "@/lib/env";
import { createLeadRecord } from "@/modules/database/queries/leads";

type RateLimitEntry = {
  count: number;
  expiresAt: number;
};

const leadGlobals = globalThis as typeof globalThis & {
  __saludInterculturalLeadRateLimit?: Map<string, RateLimitEntry>;
};

function getRateLimitStore() {
  leadGlobals.__saludInterculturalLeadRateLimit ??= new Map<string, RateLimitEntry>();
  return leadGlobals.__saludInterculturalLeadRateLimit;
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwardedFor ??
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const store = getRateLimitStore();
  const existing = store.get(key);

  if (!existing || existing.expiresAt <= now) {
    store.set(key, {
      count: 1,
      expiresAt: now + env.RATE_LIMIT_WINDOW_SECONDS * 1000
    });
    return true;
  }

  if (existing.count >= env.RATE_LIMIT_MAX) {
    return false;
  }

  existing.count += 1;
  return true;
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

  if (parsed.data.website) {
    return NextResponse.json(
      {
        ok: false,
        message: "No pudimos registrar la consulta."
      },
      { status: 400 }
    );
  }

  const input = sanitizeLeadInput(parsed.data);
  const clientIp = getClientIp(request);
  const rateLimitKey = `${clientIp}:${normalizePhone(input.phone)}`;

  if (!checkRateLimit(rateLimitKey)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Recibimos varias consultas seguidas. Inténtalo nuevamente en unos minutos."
      },
      { status: 429 }
    );
  }

  try {
    const lead = await createLeadRecord({
      ...input,
      status: "new"
    });

    return NextResponse.json(
      {
        ok: true,
        lead: {
          id: lead.id,
          status: lead.status,
          createdAt: lead.createdAt
        },
        message: "Consulta registrada correctamente."
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "No pudimos registrar la consulta. Inténtalo nuevamente."
      },
      { status: 500 }
    );
  }
}
