import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  InternalPermission,
  InternalRole
} from "@/generated/prisma/client";
import {
  internalRolePermissions,
  roleHasPermission
} from "@/features/internal-auth/permissions";
import { assertAuditedPermission } from "@/modules/audit/service";
import { sigecoNavItems } from "@/components/internal/nav-items";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function applicationFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "generated" ? [] : applicationFiles(path);
    }
    return /\.(ts|tsx)$/.test(entry.name) && !entry.name.includes(".test.")
      ? [path]
      : [];
  });
}

const pagePermissions: Record<string, InternalPermission[]> = {
  "src/app/(internal)/sigeco/(app)/administracion/[workItemId]/page.tsx": [
    "sales_read"
  ],
  "src/app/(internal)/sigeco/(app)/administracion/caja/page.tsx": [
    "cash_sessions_read"
  ],
  "src/app/(internal)/sigeco/(app)/administracion/caja/cierres/[sessionId]/page.tsx": [
    "cash_sessions_read"
  ],
  "src/app/(internal)/sigeco/(app)/administracion/page.tsx": ["sales_read"],
  "src/app/(internal)/sigeco/(app)/administracion/ventas/[saleId]/page.tsx": [
    "sales_read"
  ],
  "src/app/(internal)/sigeco/(app)/administracion/ventas/[saleId]/comprobantes/[documentId]/page.tsx": [
    "sales_read"
  ],
  "src/app/(internal)/sigeco/(app)/auditoria/page.tsx": ["audit_read"],
  "src/app/(internal)/sigeco/(app)/atribucion/page.tsx": ["reports_read"],
  "src/app/(internal)/sigeco/(app)/consultas/[visitId]/page.tsx": [
    "clinical_read"
  ],
  "src/app/(internal)/sigeco/(app)/consultas/[visitId]/historial/page.tsx": [
    "clinical_read"
  ],
  "src/app/(internal)/sigeco/(app)/consultas/[visitId]/recetas/[documentId]/page.tsx": [
    "clinical_read"
  ],
  "src/app/(internal)/sigeco/(app)/consultas/page.tsx": ["clinical_read"],
  "src/app/(internal)/sigeco/(app)/documentos/configuracion/page.tsx": [
    "documents_configure"
  ],
  "src/app/(internal)/sigeco/(app)/compras/page.tsx": ["purchases_read"],
  "src/app/(internal)/sigeco/(app)/compras/nueva/page.tsx": [
    "purchases_write"
  ],
  "src/app/(internal)/sigeco/(app)/compras/[purchaseId]/page.tsx": [
    "purchases_read"
  ],
  "src/app/(internal)/sigeco/(app)/compras/[purchaseId]/recibir/page.tsx": [
    "purchase_receipts_write"
  ],
  "src/app/(internal)/sigeco/(app)/enfermeria/[workItemId]/page.tsx": [
    "nursing_read"
  ],
  "src/app/(internal)/sigeco/(app)/enfermeria/page.tsx": ["nursing_read"],
  "src/app/(internal)/sigeco/(app)/inventario/[itemId]/page.tsx": [
    "inventory_read"
  ],
  "src/app/(internal)/sigeco/(app)/inventario/[itemId]/editar/page.tsx": [
    "inventory_write"
  ],
  "src/app/(internal)/sigeco/(app)/inventario/nuevo/page.tsx": [
    "inventory_write"
  ],
  "src/app/(internal)/sigeco/(app)/inventario/lotes/page.tsx": [
    "inventory_read"
  ],
  "src/app/(internal)/sigeco/(app)/inventario/page.tsx": ["inventory_read"],
  "src/app/(internal)/sigeco/(app)/inventario/proveedores/page.tsx": [
    "suppliers_read"
  ],
  "src/app/(internal)/sigeco/(app)/inventario/proveedores/nuevo/page.tsx": [
    "suppliers_write"
  ],
  "src/app/(internal)/sigeco/(app)/inventario/proveedores/[supplierId]/page.tsx": [
    "suppliers_read"
  ],
  "src/app/(internal)/sigeco/(app)/inventario/proveedores/[supplierId]/editar/page.tsx": [
    "suppliers_write"
  ],
  "src/app/(internal)/sigeco/(app)/recepcion/nuevo/page.tsx": ["visits_create"],
  "src/app/(internal)/sigeco/(app)/recepcion/abandonos/page.tsx": [
    "visit_discontinuations_read"
  ],
  "src/app/(internal)/sigeco/(app)/recepcion/duplicados/page.tsx": [
    "patient_duplicates_read"
  ],
  "src/app/(internal)/sigeco/(app)/recepcion/duplicados/[candidateId]/page.tsx": [
    "patient_duplicates_read"
  ],
  "src/app/(internal)/sigeco/(app)/recepcion/pacientes/[id]/editar/page.tsx": [
    "patients_update"
  ],
  "src/app/(internal)/sigeco/(app)/recepcion/pacientes/[id]/page.tsx": [
    "patients_read"
  ],
  "src/app/(internal)/sigeco/(app)/recepcion/page.tsx": [
    "patients_read",
    "visits_read"
  ],
  "src/app/(internal)/sigeco/(app)/recepcion/visitas/[id]/page.tsx": [
    "visits_read"
  ],
  "src/app/(internal)/sigeco/(app)/reportes/recorrido/page.tsx": [
    "reports_read"
  ],
  "src/app/(internal)/sigeco/(app)/reportes/tiempos/page.tsx": [
    "reports_read"
  ],
  "src/app/(internal)/sigeco/(app)/seguimientos/[taskId]/page.tsx": [
    "followups_read"
  ],
  "src/app/(internal)/sigeco/(app)/seguimientos/page.tsx": [
    "followups_read"
  ],
  "src/app/(internal)/sigeco/(app)/seguimientos/recordatorios/page.tsx": [
    "followups_read"
  ],
  "src/app/(internal)/sigeco/(app)/usuarios/[userId]/page.tsx": [
    "users_manage"
  ],
  "src/app/(internal)/sigeco/(app)/usuarios/page.tsx": ["users_manage"]
};

const authenticatedPages = [
  "src/app/(internal)/sigeco/(app)/page.tsx",
  "src/app/(internal)/sigeco/(app)/mi-cuenta/page.tsx"
];

const legacyRedirectPages = [
  "src/app/(internal)/sigeco/(app)/pacientes/[id]/page.tsx",
  "src/app/(internal)/sigeco/(app)/pacientes/nuevo/page.tsx",
  "src/app/(internal)/sigeco/(app)/pacientes/page.tsx",
  "src/app/(internal)/sigeco/(app)/visitas/[id]/page.tsx",
  "src/app/(internal)/sigeco/(app)/visitas/page.tsx"
];

const actionPermissions: Record<string, InternalPermission | null> = {
  addInventoryEntryAction: "inventory_write",
  applyVisitFlowAction: "visits_update",
  approveCashSessionCloseAction: "cash_sessions_approve",
  changeOwnInternalPasswordAction: "internal_access",
  configureProfessionalProfileAction: "documents_configure",
  correctClinicalConsultationAction: "clinical_correct",
  correctPrescriptionAction: "clinical_correct",
  createClinicalOrderAction: "clinical_write",
  createCaptureCampaignAction: "attribution_manage",
  createCaptureSourceAction: "attribution_manage",
  createFollowUpAttemptAction: "followups_write",
  createFollowUpTaskAction: "followups_write",
  createInternalLeadAction: "leads_create",
  createInventoryAdjustmentAction: "inventory_adjust",
  createInventoryLotAdjustmentAction: "inventory_lot_adjust",
  createInventoryItemAction: "inventory_write",
  createLeadContactAttemptAction: "leads_contact",
  createLeadReminderAction: "leads_reminder",
  createManagedInternalUserAction: "users_manage",
  createNursingApplicationAction: "nursing_write",
  createNursingNoteAction: "nursing_write",
  createOtherCashExpenseAction: "cash_movements_create",
  createPaidStudyOrderAction: "clinical_write",
  createPatientAction: "patients_create",
  createPurchaseAction: "purchases_write",
  createPurchaseReceiptAction: "purchase_receipts_write",
  dismissPatientDuplicateAction: "patient_duplicates_review",
  finalizeClinicalConsultationAction: "clinical_finalize",
  generateInternalReceiptDocumentAction: "sales_write",
  generatePrescriptionDocumentAction: "clinical_write",
  generateReminderCandidatesAction: "reminders_review",
  confirmPurchaseAction: "purchases_write",
  createPaymentAction: "payments_write",
  createReceptionPaidStudyOrderAction: "visits_update",
  createSaleAction: "sales_write",
  createStaffCashExpenseAction: "cash_movements_create",
  createStudyAction: "studies_write",
  createSupplierAction: "suppliers_write",
  createUrgentPurchaseExpenseAction: "cash_movements_create",
  createVitalSignsAction: "nursing_write",
  createVisitAction: "visits_create",
  loginInternalUser: null,
  mergePatientDuplicateAction: "patient_duplicates_merge",
  logoutInternalUser: null,
  openCashSessionAction: "cash_sessions_open",
  recordAreaTimeTransitionAction: "area_time_write",
  requireInternalUserPasswordChangeAction: "users_manage",
  recordPatientConsentAction: "patient_consents_write",
  recordPurchasePaymentAction: "purchases_write",
  recordVisitDiscontinuationAction: "visit_discontinuations_write",
  recordTreatmentProposalOutcomeAction: "clinical_write",
  requestCashSessionCloseAction: "cash_sessions_close",
  returnStudiesToDoctorAction: "nursing_write",
  reverseCashMovementAction: "cash_movements_reverse",
  reviewReminderCandidateAction: "reminders_review",
  revokeManagedInternalUserSessionsAction: "users_manage",
  revokeOwnInternalSessionAction: "internal_access",
  saveClinicalConsultationAction: "clinical_write",
  saveReminderRuleVersionAction: "reminder_rules_manage",
  searchReceptionPatientsAction: "patients_read",
  sendPaidStudiesToNursingAction: "visits_update",
  submitReceptionIntakeAction: "visits_create",
  setCaptureCampaignActiveAction: "attribution_manage",
  cancelPurchaseAction: "purchases_write",
  setInventoryItemStatusAction: "inventory_write",
  setSupplierStatusAction: "suppliers_write",
  unlockManagedInternalUserAction: "users_manage",
  updateLeadStatusAction: "leads_update",
  updateManagedInternalUserAccessAction: "users_manage",
  updateCaptureSourceAction: "attribution_manage",
  updateInventoryItemAction: "inventory_write",
  updateInventoryItemSuppliersAction: "suppliers_write",
  updateNursingWorkItemAction: "nursing_write",
  updateReceptionPatientAction: "patients_update",
  updateSupplierAction: "suppliers_write",
  updateVisitStatusAction: "visits_update"
};

const clinicalAttachmentRoutePermissions: Record<string, InternalPermission> = {
  "src/app/(internal)/sigeco/api/clinical-attachments/route.ts":
    "attachments_write",
  "src/app/(internal)/sigeco/api/clinical-attachments/[attachmentId]/route.ts":
    "attachments_delete",
  "src/app/(internal)/sigeco/api/clinical-attachments/[attachmentId]/grant/route.ts":
    "attachments_read",
  "src/app/(internal)/sigeco/api/clinical-attachments/[attachmentId]/content/route.ts":
    "attachments_read"
};

const cashReceiptRoutePermissions: Record<string, InternalPermission> = {
  "src/app/(internal)/sigeco/api/cash-receipts/[expenseId]/route.ts":
    "cash_sessions_read"
};

const purchaseDocumentRoutePermissions: Record<string, InternalPermission> = {
  "src/app/(internal)/sigeco/api/purchase-documents/[documentId]/route.ts":
    "purchases_read"
};

const generatedDocumentRoutePermissions: Record<
  string,
  InternalPermission[]
> = {
  "src/app/(internal)/sigeco/api/generated-documents/[documentId]/pdf/route.ts":
    ["clinical_read", "sales_read"]
};

function exportedActionSegments(file: string) {
  const contents = source(file);
  const starts = [...contents.matchAll(/export async function (\w+)\b/g)];

  return starts.map((match, index) => ({
    name: match[1],
    source: contents.slice(
      match.index,
      starts[index + 1]?.index ?? contents.length
    )
  }));
}

describe("SIGECO permission and privacy boundaries", () => {
  it("enumerates every private page and guards each data page", () => {
    const currentPages = applicationFiles(
      resolve(process.cwd(), "src/app/(internal)/sigeco/(app)")
    )
      .filter((file) => file.endsWith("/page.tsx"))
      .map((file) => file.replace(`${process.cwd()}/`, ""))
      .sort();
    const documentedPages = [
      ...Object.keys(pagePermissions),
      ...authenticatedPages,
      ...legacyRedirectPages
    ].sort();

    expect(currentPages).toEqual(documentedPages);

    for (const [file, permissions] of Object.entries(pagePermissions)) {
      const contents = source(file);
      for (const permission of permissions) {
        expect(contents, `${file} must require ${permission}`).toContain(
          `requirePermission("${permission}")`
        );
      }
    }

    expect(
      source("src/app/(internal)/sigeco/(app)/layout.tsx")
    ).toContain("requireInternalUser()");
    expect(
      source("src/app/(internal)/sigeco/(app)/page.tsx")
    ).toContain("requireInternalUser()");
    expect(
      source("src/app/(internal)/sigeco/(app)/mi-cuenta/page.tsx")
    ).toContain("requireInternalSession()");

    for (const file of legacyRedirectPages) {
      expect(source(file), `${file} must only redirect`).toContain("redirect(");
    }
  });

  it("keeps the navigation permission equal to a server page permission", () => {
    const rootPagePermissions = new Map<string, InternalPermission[]>([
      ["/sigeco", ["internal_access"]],
      ["/sigeco/mi-cuenta", ["internal_access"]],
      ...Object.entries(pagePermissions)
        .filter(([file]) => /\/page\.tsx$/.test(file))
        .map(([file, permissions]) => {
          const path = file
            .replace("src/app/(internal)", "")
            .replace("/(app)", "")
            .replace(/\/page\.tsx$/, "")
            .replace(/\[.*?\]/g, "");
          return [path.replace(/\/$/, ""), permissions] as [
            string,
            InternalPermission[]
          ];
        })
    ]);

    for (const item of sigecoNavItems) {
      expect(
        rootPagePermissions.get(item.href),
        `${item.href} has no server permission policy`
      ).toContain(item.permission);
    }
  });

  it("maps every server action to its exact server permission", () => {
    const actionFiles = applicationFiles(
      resolve(process.cwd(), "src/features")
    ).filter((file) => file.endsWith("actions.ts"));
    const actions = actionFiles.flatMap((file) => {
      const relativeFile = file.replace(`${process.cwd()}/`, "");
      return exportedActionSegments(relativeFile);
    });

    expect(actions.map((action) => action.name).sort()).toEqual(
      Object.keys(actionPermissions).sort()
    );

    for (const action of actions) {
      const permission = actionPermissions[action.name];
      if (permission) {
        expect(
          action.source,
          `${action.name} must enforce ${permission}`
        ).toMatch(
          new RegExp(
            `(?:permission:\\s*"${permission}"|requirePermission\\("${permission}"\\))`
          )
        );
      } else {
        expect(["loginInternalUser", "logoutInternalUser"]).toContain(
          action.name
        );
        expect(action.source).toContain("appendAuditEvent");
      }
    }
  });

  it("keeps patient contact shortcuts inside the consent-aware follow-up flow", () => {
    expect(
      source(
        "src/app/(internal)/sigeco/(app)/recepcion/visitas/[id]/page.tsx"
      )
    ).not.toContain("createCallLink");
    expect(
      source(
        "src/app/(internal)/sigeco/(app)/seguimientos/[taskId]/page.tsx"
      )
    ).toContain("canContactPatient");
    expect(source("src/modules/database/queries/follow-ups.ts")).toContain(
      "PatientFollowUpConsentRequiredError"
    );
  });

  it("allows and denies every action permission according to the role matrix", () => {
    const roles = Object.keys(internalRolePermissions) as InternalRole[];
    const permissions = new Set([
      ...Object.values(actionPermissions).filter(
        (permission): permission is InternalPermission => Boolean(permission)
      ),
      ...Object.values(clinicalAttachmentRoutePermissions),
      ...Object.values(cashReceiptRoutePermissions),
      ...Object.values(purchaseDocumentRoutePermissions),
      ...Object.values(generatedDocumentRoutePermissions).flat()
    ]);

    for (const permission of permissions) {
      for (const role of roles) {
        const assertion = () =>
          assertAuditedPermission({ id: `qa-${role}`, role }, permission);
        if (roleHasPermission(role, permission)) {
          expect(assertion, `${role} should have ${permission}`).not.toThrow();
        } else {
          expect(assertion, `${role} should not have ${permission}`).toThrow();
        }
      }
    }
  });

  it("enumerates clinical file routes and enforces their exact permission", () => {
    const routeRoot = resolve(
      process.cwd(),
      "src/app/(internal)/sigeco/api/clinical-attachments"
    );
    const currentRoutes = applicationFiles(routeRoot)
      .filter((file) => file.endsWith("/route.ts"))
      .map((file) => file.replace(`${process.cwd()}/`, ""))
      .sort();

    expect(currentRoutes).toEqual(
      Object.keys(clinicalAttachmentRoutePermissions).sort()
    );

    for (const [file, permission] of Object.entries(
      clinicalAttachmentRoutePermissions
    )) {
      expect(source(file), `${file} must enforce ${permission}`).toContain(
        `permission: "${permission}"`
      );
    }

    for (const [file, permission] of Object.entries(cashReceiptRoutePermissions)) {
      const contents = source(file);
      expect(contents, `${file} must authenticate`).toContain(
        "getCurrentInternalUser()"
      );
      expect(contents, `${file} must enforce ${permission}`).toContain(
        `roleHasPermission(user.role, "${permission}")`
      );
    }

    for (const [file, permission] of Object.entries(
      purchaseDocumentRoutePermissions
    )) {
      const contents = source(file);
      expect(contents, `${file} must authenticate`).toContain(
        "getCurrentInternalUser()"
      );
      expect(contents, `${file} must enforce ${permission}`).toContain(
        `roleHasPermission(user.role, "${permission}")`
      );
    }

    for (const [file, permissions] of Object.entries(
      generatedDocumentRoutePermissions
    )) {
      const contents = source(file);
      expect(contents, `${file} must authenticate`).toContain(
        "getCurrentInternalUser()"
      );
      for (const permission of permissions) {
        expect(contents, `${file} must enforce ${permission}`).toContain(
          `roleHasPermission(user.role, "${permission}")`
        );
      }
      expect(contents).toContain('"Cache-Control": "private, no-store');
    }
  });

  it("does not expose clinical queries to Payload, marketing or analytics", () => {
    const protectedQueryImport =
      /@\/modules\/(?:clinical-attachments|generated-documents|database\/queries\/(?:area-times|clinical-care|follow-ups|internal-users|inventory|nursing|paid-studies|patient-journey|patients|reception|sales|studies|supervised-reminders|visits))/;
    const publicRoots = [
      "src/payload",
      "src/features/analytics",
      "src/app/(public)",
      "src/components/public",
      "src/components/landing"
    ];

    for (const root of publicRoots) {
      for (const file of applicationFiles(resolve(process.cwd(), root))) {
        expect(
          source(file.replace(`${process.cwd()}/`, "")),
          `${file} crosses the clinical data boundary`
        ).not.toMatch(protectedQueryImport);
      }
    }

    const analytics = applicationFiles(
      resolve(process.cwd(), "src/features/analytics")
    )
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    expect(analytics).not.toMatch(
      /\b(?:patient|diagnosis|prescription|clinical|phone|email|fullName)\b/i
    );
  });

  it("requires a server permission on future file or export route handlers", () => {
    const routeFiles = applicationFiles(
      resolve(process.cwd(), "src/app")
    ).filter(
      (file) => {
        if (!file.endsWith("route.ts")) return false;
        const contents = readFileSync(file, "utf8");
        return (
          /(?:download|attachment|clinical-file)/i.test(`${file}\n${contents}`) ||
          /Content-Disposition|filename=/i.test(contents) ||
          /\/export(?:\/|$)/i.test(file)
        );
      }
    );

    for (const file of routeFiles) {
      expect(readFileSync(file, "utf8"), `${file} needs a server guard`).toMatch(
        /(?:requirePermission\("[a-z_]+"\)|requireClinicalAttachmentApiAccess|roleHasPermission\(user\.role,\s*"[a-z_]+"\))/
      );
    }
  });
});
