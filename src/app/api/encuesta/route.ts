import { NextResponse } from "next/server";
import { submitPatientFeedbackSchema } from "@/features/patient-feedback/schema";
import {
  PatientFeedbackError,
  submitPublicPatientFeedback
} from "@/modules/patient-feedback/public";

type RateLimitEntry = { count: number; expiresAt: number };
const feedbackGlobals = globalThis as typeof globalThis & {
  __patientFeedbackRateLimit?: Map<string, RateLimitEntry>;
};

function checkRateLimit(request: Request) {
  const key =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const now = Date.now();
  feedbackGlobals.__patientFeedbackRateLimit ??= new Map();
  const current = feedbackGlobals.__patientFeedbackRateLimit.get(key);
  if (!current || current.expiresAt <= now) {
    feedbackGlobals.__patientFeedbackRateLimit.set(key, {
      count: 1,
      expiresAt: now + 10 * 60 * 1000
    });
    return true;
  }
  if (current.count >= 20) return false;
  current.count += 1;
  return true;
}

function findFeedbackError(error: unknown): PatientFeedbackError | null {
  let current = error;
  while (current instanceof Error) {
    if (current instanceof PatientFeedbackError) return current;
    current = "cause" in current ? current.cause : undefined;
  }
  return null;
}

function json(body: object, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet"
    }
  });
}

export async function POST(request: Request) {
  if (!checkRateLimit(request)) {
    return json(
      { message: "Recibimos varios intentos. Espere unos minutos." },
      429
    );
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 16_384) {
    return json({ message: "La respuesta es demasiado extensa." }, 413);
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ message: "Solicitud inválida." }, 415);
  }

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  if (!body) return json({ message: "Solicitud inválida." }, 400);
  if (typeof body.website === "string" && body.website.trim()) {
    return json({ ok: true }, 200);
  }
  const parsed = submitPatientFeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { message: parsed.error.issues[0]?.message ?? "Revisa la respuesta." },
      400
    );
  }

  try {
    await submitPublicPatientFeedback({ data: parsed.data });
    return json({ ok: true }, 201);
  } catch (error) {
    const feedbackError = findFeedbackError(error);
    if (feedbackError?.code === "ALREADY_SUBMITTED") {
      return json({ ok: true }, 200);
    }
    if (feedbackError?.code === "EXPIRED") {
      return json({ message: "Este enlace ya venció." }, 410);
    }
    if (
      feedbackError?.code === "INVALID_TOKEN" ||
      feedbackError?.code === "NOT_OPEN"
    ) {
      return json({ message: "Este enlace ya no está disponible." }, 404);
    }
    throw error;
  }
}
