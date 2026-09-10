import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeCampaignCode } from "@/features/attribution/catalog";
import { env } from "@/lib/env";
import { prisma } from "@/modules/database";

const proofVersion = "v1";

export type PublicLeadBranchResolution = {
  branchCode: string;
  source: "signed-campaign" | "hostname" | "form-config";
};

function signaturePayload(branchCode: string, campaignCode: string, expiresAt: number) {
  return `${proofVersion}\n${branchCode}\n${normalizeCampaignCode(campaignCode)}\n${expiresAt}`;
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** Solo debe invocarse desde procesos de servidor que construyan enlaces. */
export function createPublicLeadBranchProof(input: {
  branchCode: string;
  campaignCode: string;
  expiresAt: Date;
  secret?: string;
}) {
  const secret = input.secret ?? env.PUBLIC_LEAD_BRANCH_SIGNING_SECRET;
  if (!secret) throw new Error("PUBLIC_LEAD_BRANCH_SIGNING_SECRET_REQUIRED");
  const expiresAt = Math.floor(input.expiresAt.getTime() / 1000);
  const signature = signPayload(
    signaturePayload(input.branchCode, input.campaignCode, expiresAt),
    secret
  );
  return [proofVersion, input.branchCode, expiresAt, signature].join(".");
}

export function verifyPublicLeadBranchProof(input: {
  proof: string;
  campaignCode: string;
  now?: Date;
  secret?: string;
}) {
  const secret = input.secret ?? env.PUBLIC_LEAD_BRANCH_SIGNING_SECRET;
  if (!secret) return null;
  const [version, branchCode, rawExpiresAt, receivedSignature, ...extra] =
    input.proof.split(".");
  const expiresAt = Number(rawExpiresAt);
  if (
    version !== proofVersion ||
    !branchCode ||
    !receivedSignature ||
    extra.length > 0 ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= Math.floor((input.now ?? new Date()).getTime() / 1000)
  ) {
    return null;
  }
  const expectedSignature = signPayload(
    signaturePayload(branchCode, input.campaignCode, expiresAt),
    secret
  );
  const received = Buffer.from(receivedSignature);
  const expected = Buffer.from(expectedSignature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return null;
  }
  return branchCode;
}

function configuredHostnameBranch(hostname: string) {
  const rawMap = env.PUBLIC_LEAD_HOST_BRANCH_MAP;
  if (!rawMap) return null;
  try {
    const value: unknown = JSON.parse(rawMap);
    if (!value || Array.isArray(value) || typeof value !== "object") return null;
    const candidate = (value as Record<string, unknown>)[hostname.toLowerCase()];
    return typeof candidate === "string" && candidate.trim()
      ? candidate.trim()
      : null;
  } catch {
    return null;
  }
}

async function activeBranch(code: string | null | undefined) {
  if (!code) return null;
  return prisma.clinicBranch.findFirst({
    where: { code, status: "active" },
    select: { code: true }
  });
}

/**
 * Resuelve ownership antes de persistir contacto. Nunca acepta branchCode del
 * cuerpo: solo una prueba firmada, un hostname configurado en servidor o la
 * configuración fija del formulario de este despliegue.
 */
export async function resolvePublicLeadBranch(
  request: Request,
  input: { campaignCode?: string; branchProof?: string }
): Promise<PublicLeadBranchResolution | null> {
  if (input.branchProof) {
    if (!input.campaignCode) return null;
    const branchCode = verifyPublicLeadBranchProof({
      proof: input.branchProof,
      campaignCode: input.campaignCode
    });
    const branch = await activeBranch(branchCode);
    return branch
      ? { branchCode: branch.code, source: "signed-campaign" }
      : null;
  }

  const hostname = new URL(request.url).hostname.toLowerCase();
  const byHostname = await activeBranch(configuredHostnameBranch(hostname));
  if (byHostname) return { branchCode: byHostname.code, source: "hostname" };

  const byFormConfig = await activeBranch(env.PUBLIC_LEAD_FORM_BRANCH_CODE);
  return byFormConfig
    ? { branchCode: byFormConfig.code, source: "form-config" }
    : null;
}
