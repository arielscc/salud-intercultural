import { NextResponse } from "next/server";
import {
  allowPayloadSigecoRequest,
  authorizePayloadSigecoRequest,
  payloadSigecoResponseHeaders
} from "@/modules/payload-sigeco/auth";
import {
  PAYLOAD_SIGECO_MAX_BODY_BYTES,
  payloadCampaignContractSchema
} from "@/modules/payload-sigeco/contract";
import { syncPayloadCampaignToSigeco } from "@/modules/payload-sigeco/campaign-sync";
import { appendAuditEvent } from "@/modules/audit/service";

function response(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: payloadSigecoResponseHeaders
  });
}

export async function POST(request: Request) {
  if (!authorizePayloadSigecoRequest(request)) {
    return response({ ok: false, error: "unauthorized" }, 401);
  }
  if (!allowPayloadSigecoRequest("campaign-sync")) {
    return response({ ok: false, error: "rate_limited" }, 429);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > PAYLOAD_SIGECO_MAX_BODY_BYTES) {
    return response({ ok: false, error: "payload_too_large" }, 413);
  }
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > PAYLOAD_SIGECO_MAX_BODY_BYTES) {
    return response({ ok: false, error: "payload_too_large" }, 413);
  }
  const parsedJson = (() => {
    try {
      return JSON.parse(rawBody) as unknown;
    } catch {
      return null;
    }
  })();
  const parsed = payloadCampaignContractSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return response({ ok: false, error: "invalid_contract" }, 422);
  }

  try {
    const result = await syncPayloadCampaignToSigeco(parsed.data);
    return response(
      {
        ok: true,
        campaign: { code: result.campaign.code },
        outcome: result.outcome
      },
      result.outcome === "created" ? 201 : 200
    );
  } catch {
    await appendAuditEvent({
      action: "integration.payload_campaign.sync",
      entityType: "capture_campaign",
      result: "failure",
      context: { reason: "sync_failed" }
    }).catch(() => undefined);
    return response({ ok: false, error: "sync_unavailable", retryable: true }, 503);
  }
}
