import { NextResponse } from "next/server";
import {
  allowPayloadSigecoRequest,
  authorizePayloadSigecoRequest,
  payloadSigecoResponseHeaders
} from "@/modules/payload-sigeco/auth";
import { payloadMetricsQuerySchema } from "@/modules/payload-sigeco/contract";
import { getApprovedPayloadCampaignMetrics } from "@/modules/payload-sigeco/metrics";
import { appendAuditEvent } from "@/modules/audit/service";

function response(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: payloadSigecoResponseHeaders
  });
}

export async function GET(request: Request) {
  if (!authorizePayloadSigecoRequest(request)) {
    return response({ ok: false, error: "unauthorized" }, 401);
  }
  if (!allowPayloadSigecoRequest("metrics-export")) {
    return response({ ok: false, error: "rate_limited" }, 429);
  }

  const url = new URL(request.url);
  const parsed = payloadMetricsQuerySchema.safeParse({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to")
  });
  if (!parsed.success) {
    return response({ ok: false, error: "invalid_range" }, 422);
  }

  try {
    const metrics = await getApprovedPayloadCampaignMetrics(parsed.data);
    return response({ ok: true, metrics }, 200);
  } catch {
    await appendAuditEvent({
      action: "integration.payload_metrics.export",
      entityType: "attribution_metrics",
      result: "failure",
      context: { reason: "export_failed" }
    }).catch(() => undefined);
    return response(
      { ok: false, error: "metrics_unavailable", retryable: true },
      503
    );
  }
}
