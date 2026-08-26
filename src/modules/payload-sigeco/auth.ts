import { timingSafeEqual } from "node:crypto";
import { resolvePayloadSigecoIntegrationSecret } from "@/lib/deployment-environment";

type RateLimitEntry = { count: number; expiresAt: number };

const integrationGlobals = globalThis as typeof globalThis & {
  __payloadSigecoRateLimit?: Map<string, RateLimitEntry>;
};

function equalSecret(candidate: string, expected: string) {
  const left = Buffer.from(candidate);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function authorizePayloadSigecoRequest(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return Boolean(
    match?.[1] &&
      equalSecret(match[1].trim(), resolvePayloadSigecoIntegrationSecret())
  );
}

export function allowPayloadSigecoRequest(scope: string, now = Date.now()) {
  const store =
    (integrationGlobals.__payloadSigecoRateLimit ??= new Map<
      string,
      RateLimitEntry
    >());
  const existing = store.get(scope);

  if (!existing || existing.expiresAt <= now) {
    store.set(scope, { count: 1, expiresAt: now + 60_000 });
    return true;
  }
  if (existing.count >= 60) return false;
  existing.count += 1;
  return true;
}

export function resetPayloadSigecoRateLimitForTests() {
  integrationGlobals.__payloadSigecoRateLimit?.clear();
}

export const payloadSigecoResponseHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff"
} as const;

