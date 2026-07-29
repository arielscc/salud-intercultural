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
  "src/app/(internal)/sigeco/(app)/administracion/page.tsx": ["sales_read"],
  "src/app/(internal)/sigeco/(app)/administracion/ventas/[saleId]/page.tsx": [
    "sales_read"
  ],
  "src/app/(internal)/sigeco/(app)/auditoria/page.tsx": ["audit_read"],
  "src/app/(internal)/sigeco/(app)/consultas/[visitId]/page.tsx": [
    "clinical_read"
  ],
  "src/app/(internal)/sigeco/(app)/consultas/page.tsx": ["clinical_read"],
  "src/app/(internal)/sigeco/(app)/enfermeria/[workItemId]/page.tsx": [
    "nursing_read"
  ],
  "src/app/(internal)/sigeco/(app)/enfermeria/page.tsx": ["nursing_read"],
  "src/app/(internal)/sigeco/(app)/inventario/[itemId]/page.tsx": [
    "inventory_read"
  ],
  "src/app/(internal)/sigeco/(app)/inventario/page.tsx": ["inventory_read"],
  "src/app/(internal)/sigeco/(app)/recepcion/nuevo/page.tsx": ["visits_create"],
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
  "src/app/(internal)/sigeco/(app)/seguimientos/[taskId]/page.tsx": [
    "followups_read"
  ],
  "src/app/(internal)/sigeco/(app)/seguimientos/page.tsx": [
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
  changeOwnInternalPasswordAction: "internal_access",
  createClinicalOrderAction: "clinical_write",
  createFollowUpAttemptAction: "followups_write",
  createFollowUpTaskAction: "followups_write",
  createInternalLeadAction: "leads_create",
  createInventoryAdjustmentAction: "inventory_adjust",
  createInventoryItemAction: "inventory_write",
  createLeadContactAttemptAction: "leads_contact",
  createLeadReminderAction: "leads_reminder",
  createManagedInternalUserAction: "users_manage",
  createNursingApplicationAction: "nursing_write",
  createNursingNoteAction: "nursing_write",
  createPaidStudyOrderAction: "clinical_write",
  createPatientAction: "patients_create",
  createPaymentAction: "payments_write",
  createReceptionPaidStudyOrderAction: "visits_update",
  createSaleAction: "sales_write",
  createStudyAction: "studies_write",
  createVitalSignsAction: "nursing_write",
  createVisitAction: "visits_create",
  loginInternalUser: null,
  logoutInternalUser: null,
  requireInternalUserPasswordChangeAction: "users_manage",
  returnStudiesToDoctorAction: "nursing_write",
  revokeManagedInternalUserSessionsAction: "users_manage",
  revokeOwnInternalSessionAction: "internal_access",
  saveClinicalConsultationAction: "clinical_write",
  searchReceptionPatientsAction: "patients_read",
  sendPaidStudiesToNursingAction: "visits_update",
  submitReceptionIntakeAction: "visits_create",
  unlockManagedInternalUserAction: "users_manage",
  updateLeadStatusAction: "leads_update",
  updateManagedInternalUserAccessAction: "users_manage",
  updateNursingWorkItemAction: "nursing_write",
  updateReceptionPatientAction: "patients_update",
  updateVisitStatusAction: "visits_update"
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

  it("allows and denies every action permission according to the role matrix", () => {
    const roles = Object.keys(internalRolePermissions) as InternalRole[];
    const permissions = new Set(
      Object.values(actionPermissions).filter(
        (permission): permission is InternalPermission => Boolean(permission)
      )
    );

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

  it("does not expose clinical queries to Payload, marketing or analytics", () => {
    const protectedQueryImport =
      /@\/modules\/database\/queries\/(?:clinical-care|follow-ups|internal-users|inventory|nursing|paid-studies|patients|reception|sales|studies|visits)/;
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
        /requirePermission\("[a-z_]+"\)/
      );
    }
  });
});
