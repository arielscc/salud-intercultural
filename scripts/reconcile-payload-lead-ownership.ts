import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import config from "@payload-config";
import { getPayload, type Payload } from "payload";
import {
  assertBranchReconciliationReady,
  createBranchReconciliationPlan,
  parseManualBranchDecisions,
  requireBranchReconciliationWriteConfirmation,
  type BranchOwnershipRecord,
  type ManualBranchDecision
} from "../src/features/branches/reconciliation";
import { prisma } from "../src/modules/database";
import { reportScriptError } from "./safe-error";

const domain = "payload-lead-ownership";
const confirmationToken = "APPLY_BRANCH_RECONCILIATION";

type PayloadLeadRow = {
  id: number | string;
  branchCode: string | null;
  phone: string;
  campaignCode: string | null;
};

function argumentValue(args: string[], name: string) {
  const inline = args.find((argument) => argument.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function options(args: string[]) {
  if (args.includes("--help")) {
    console.log(`Uso:
  pnpm branch:reconcile:payload-leads
  pnpm branch:reconcile:payload-leads -- --template
  pnpm branch:reconcile:payload-leads -- --decisions ruta/decisiones.json
  pnpm branch:reconcile:payload-leads -- --decisions ruta/decisiones.json --apply --confirm=${confirmationToken}
  pnpm branch:reconcile:payload-leads -- --assert-ready

El reporte nunca imprime nombres, teléfonos, emails ni mensajes.`);
    process.exit(0);
  }
  return {
    apply: args.includes("--apply"),
    assertReady: args.includes("--assert-ready"),
    template: args.includes("--template"),
    confirmation: argumentValue(args, "--confirm"),
    decisionsPath: argumentValue(args, "--decisions")
  };
}

function decisions(path: string | undefined): ManualBranchDecision[] {
  if (!path) return [];
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  return parseManualBranchDecisions(parsed, domain).decisions;
}

async function allPayloadLeads(payload: Payload): Promise<PayloadLeadRow[]> {
  const rows: PayloadLeadRow[] = [];
  let page = 1;
  do {
    const result = await payload.find({
      collection: "lead-submissions",
      depth: 0,
      limit: 100,
      page,
      overrideAccess: true,
      sort: "id"
    });
    rows.push(
      ...result.docs.map((doc) => ({
        id: doc.id,
        branchCode: typeof doc.branchCode === "string" ? doc.branchCode : null,
        phone: doc.phone,
        campaignCode: doc.campaignCode || null
      }))
    );
    if (!result.hasNextPage) break;
    page += 1;
  } while (true);
  return rows;
}

async function campaignBranches(payload: Payload) {
  const result = await payload.find({
    collection: "marketing-campaigns",
    depth: 0,
    limit: 1000,
    overrideAccess: true
  });
  return new Map(
    result.docs.map((campaign) => [
      campaign.code,
      (campaign.branchAssignments ?? []).map((assignment) => assignment.branchCode)
    ])
  );
}

function ownershipRecords(
  leads: readonly PayloadLeadRow[],
  branchesByCampaign: ReadonlyMap<string, string[]>
) {
  return leads.map<BranchOwnershipRecord>((lead) => ({
    recordId: `payload-lead:${lead.id}`,
    currentBranchCode: lead.branchCode,
    evidence: (lead.campaignCode ? branchesByCampaign.get(lead.campaignCode) ?? [] : []).map(
      (branchCode) => ({ source: "expediente", branchCode })
    ),
    needsReconciliation: lead.branchCode === null
  }));
}

async function main() {
  const parsedOptions = options(process.argv.slice(2));
  if (parsedOptions.template) {
    console.log(JSON.stringify({ version: 1, domain, decisions: [] }, null, 2));
    return;
  }
  requireBranchReconciliationWriteConfirmation(parsedOptions);
  const payload = await getPayload({ config });
  const [knownBranches, leads, branchesByCampaign] = await Promise.all([
    prisma.clinicBranch.findMany({
      where: { status: { not: "inactive" } },
      select: { code: true }
    }),
    allPayloadLeads(payload),
    campaignBranches(payload)
  ]);
  const plan = createBranchReconciliationPlan({
    domain,
    records: ownershipRecords(leads, branchesByCampaign),
    knownBranchCodes: knownBranches.map((branch) => branch.code),
    decisions: decisions(parsedOptions.decisionsPath),
    mode: parsedOptions.apply ? "apply" : "dry-run"
  });

  if (parsedOptions.apply) {
    const leadById = new Map(leads.map((lead) => [`payload-lead:${lead.id}`, lead]));
    for (const change of plan.changes) {
      const lead = leadById.get(change.recordId);
      if (!lead) throw new Error("PAYLOAD_LEAD_RECONCILIATION_RECORD_NOT_FOUND");
      await payload.update({
        collection: "lead-submissions",
        id: lead.id,
        overrideAccess: true,
        data: {
          branchCode: change.toBranchCode,
          idempotencyKey: createHash("sha256")
            .update(`${change.toBranchCode}\0legacy\0${lead.id}`)
            .digest("hex"),
          deduplicationKey: createHash("sha256")
            .update(`${change.toBranchCode}\0${lead.phone.replace(/\D/g, "")}`)
            .digest("hex")
        }
      });
    }
    const after = createBranchReconciliationPlan({
      domain,
      records: ownershipRecords(await allPayloadLeads(payload), branchesByCampaign),
      knownBranchCodes: knownBranches.map((branch) => branch.code),
      mode: "apply"
    });
    if (after.report.checksums.before !== plan.report.checksums.after) {
      throw new Error("BRANCH_RECONCILIATION_CHECKSUM_MISMATCH");
    }
    assertBranchReconciliationReady(after.report);
    plan.report.writes.applied = plan.changes.length;
  }

  console.log(JSON.stringify(plan.report, null, 2));
  if (parsedOptions.assertReady) assertBranchReconciliationReady(plan.report);
}

main().catch((error) => {
  reportScriptError("Payload lead branch ownership reconciliation", error);
  process.exitCode = 1;
});
