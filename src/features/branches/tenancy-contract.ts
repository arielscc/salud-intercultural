import type { Prisma } from "@/generated/prisma/client";

export type TenancyScope =
  | "global-master"
  | "branch-operation"
  | "platform-event"
  | "hybrid-event"
  | "controlled-cross-branch-read";

export type BranchIsolationTask =
  | 2
  | 3
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15;

export type LegacyTenancyIssue = "missing-branch-field" | "nullable-branch-field";

export type ModelTenancyContract = {
  scope: TenancyScope;
  remediationTask: BranchIsolationTask;
  requiredBranchFields: readonly string[];
  legacyException?: {
    issue: LegacyTenancyIssue;
    responsible: string;
    reason: string;
  };
};

const taskResponsible: Record<BranchIsolationTask, string> = {
  2: "Plataforma SIGECO",
  3: "Identidad y accesos",
  5: "Pacientes",
  6: "Captación",
  7: "Operación clínica",
  8: "Consulta médica",
  9: "Enfermería",
  10: "Catálogo comercial",
  11: "Inventarios",
  12: "Caja y Administración",
  13: "Seguimiento y reportes",
  14: "Plataforma SIGECO",
  15: "Arquitectura SIGECO"
};

type ModelName = Prisma.ModelName;

export const globalMasterModels = [
  "InternalUser",
  "ClinicBranch",
  "InternalUserBranch",
  "InternalSession",
  "Patient",
  "PatientIdentityVersion",
  "PatientDuplicateCandidate",
  "PatientMerge",
  "PatientAlias",
  "CaptureSource",
  "CaptureCampaign",
  "Supplier",
  "SupplierVersion",
  "InventoryItem",
  "InventoryItemSupplier",
  "InventoryItemCatalogVersion",
  "PaymentMethod",
  "IndicationCatalogItem",
  "DiagnosisCatalogItem",
  "ClinicalNoteCatalogItem",
  "ServiceCatalogItem",
  "ServiceCatalogComponent",
  "ServiceCatalogItemVersion"
] as const satisfies readonly ModelName[];

const globalMasterTaskByModel: Record<
  (typeof globalMasterModels)[number],
  BranchIsolationTask
> = {
  InternalUser: 3,
  ClinicBranch: 2,
  InternalUserBranch: 3,
  InternalSession: 2,
  Patient: 5,
  PatientIdentityVersion: 5,
  PatientDuplicateCandidate: 5,
  PatientMerge: 5,
  PatientAlias: 5,
  CaptureSource: 6,
  CaptureCampaign: 6,
  Supplier: 10,
  SupplierVersion: 10,
  InventoryItem: 10,
  InventoryItemSupplier: 10,
  InventoryItemCatalogVersion: 10,
  PaymentMethod: 10,
  IndicationCatalogItem: 8,
  DiagnosisCatalogItem: 8,
  ClinicalNoteCatalogItem: 8,
  ServiceCatalogItem: 10,
  ServiceCatalogComponent: 10,
  ServiceCatalogItemVersion: 10
};

export const platformEventModels = [] as const satisfies readonly ModelName[];

/** Eventos con filas globales definidas y filas operativas obligatoriamente locales. */
export const hybridEventModels = ["AuditEvent"] as const satisfies readonly ModelName[];

export const controlledCrossBranchReadModels = [
  "ClinicalAttachmentAccessGrant",
  "NursingContinuityAccess"
] as const satisfies readonly ModelName[];

export const branchModelGroups = [
  {
    remediationTask: 5,
    models: ["PatientBranchRecord", "PatientConsent", "PatientContact", "PatientNote"]
  },
  {
    remediationTask: 6,
    models: [
      "Lead",
      "LeadContactAttempt",
      "LeadReminder",
      "LeadStatusHistory",
      "CaptureCampaignBranch"
    ]
  },
  {
    remediationTask: 7,
    models: [
      "Visit",
      "VisitDiscontinuation",
      "VisitAttribution",
      "VisitAttributionTouch",
      "VisitStatusHistory",
      "ReceptionCheckIn",
      "PatientRoute",
      "PatientRouteStep",
      "VisitAreaTimeEvent",
      "VisitWorkItem"
    ]
  },
  {
    remediationTask: 8,
    models: [
      "ClinicalConsultation",
      "ClinicalConsultationVersion",
      "Diagnosis",
      "TreatmentPlan",
      "TreatmentProposalOutcome",
      "Prescription",
      "PrescriptionItem",
      "ClinicalEvolution",
      "ClinicalNote",
      "ClinicalOrder",
      "ClinicalProfessionalProfile",
      "DoctorOrder",
      "DoctorOrderLine",
      "ClinicalContinuityAccess",
      "IndicationCatalogItemBranch",
      "DiagnosisCatalogItemBranch",
      "ClinicalNoteCatalogItemBranch"
    ]
  },
  {
    remediationTask: 9,
    models: [
      "Study",
      "VitalSigns",
      "NursingApplication",
      "NursingNote",
      "ClinicalAttachment",
      "NursingWorkItemResult",
      "ServiceSessionPackage",
      "ServiceSessionUse"
    ]
  },
  {
    remediationTask: 10,
    models: [
      "SupplierBranchProfile",
      "BranchInventoryItem",
      "PaymentMethodBranch",
      "ServiceCatalogItemBranch"
    ]
  },
  {
    remediationTask: 11,
    models: [
      "BranchInventoryBalance",
      "Purchase",
      "PurchaseLine",
      "PurchasePayment",
      "PurchaseReceipt",
      "PurchaseReceiptLine",
      "InventoryLot",
      "InventoryLotAdjustment",
      "PurchaseDocument",
      "InventoryMovement",
      "InventoryAdjustment",
      "InventoryTransfer",
      "InventoryTransferLotAllocation",
      "InventoryAlert"
    ]
  },
  {
    remediationTask: 12,
    models: [
      "Sale",
      "GeneratedDocument",
      "SaleItem",
      "Payment",
      "DeliveredProduct",
      "CashMovement",
      "CashSession",
      "CashSessionReconciliation",
      "CashExpense",
      "CashExpenseBeneficiary"
    ]
  },
  {
    remediationTask: 13,
    models: [
      "FollowUpTask",
      "FollowUpAttempt",
      "FollowUpStatusHistory",
      "FollowUpTemplate",
      "SupervisedReminderRule",
      "SupervisedReminderRuleVersion",
      "SupervisedReminderCandidate",
      "SupervisedReminderReviewEvent",
      "PatientFeedbackRequest",
      "PatientFeedback",
      "PatientFeedbackCase",
      "PatientFeedbackCaseEvent"
    ]
  },
  {
    remediationTask: 14,
    models: ["ModuleActivation", "ModuleActivationEvent"]
  }
] as const satisfies ReadonlyArray<{
  remediationTask: BranchIsolationTask;
  models: readonly ModelName[];
}>;

const legacyMissingBranchModelsByTask: ReadonlyArray<{
  remediationTask: BranchIsolationTask;
  models: readonly ModelName[];
}> = [];

const legacyNullableBranchModelsByTask = [] as const satisfies ReadonlyArray<{
  remediationTask: BranchIsolationTask;
  models: readonly ModelName[];
}>;

const requiredBranchFieldOverrides: Partial<Record<ModelName, readonly string[]>> = {
  InventoryTransfer: ["sourceBranchCode", "destinationBranchCode"],
  InventoryTransferLotAllocation: ["sourceBranchCode", "destinationBranchCode"]
};

function addContract(
  contracts: Record<string, ModelTenancyContract>,
  model: ModelName,
  contract: ModelTenancyContract
) {
  if (contracts[model]) throw new Error(`Duplicate tenancy contract for ${model}.`);
  contracts[model] = contract;
}

function legacyIssueMap(
  groups: ReadonlyArray<{
    remediationTask: BranchIsolationTask;
    models: readonly ModelName[];
  }>,
  issue: LegacyTenancyIssue
) {
  const result = new Map<ModelName, { issue: LegacyTenancyIssue; task: BranchIsolationTask }>();
  for (const group of groups) {
    for (const model of group.models) {
      if (result.has(model)) throw new Error(`Duplicate legacy tenancy exception for ${model}.`);
      result.set(model, { issue, task: group.remediationTask });
    }
  }
  return result;
}

function buildContract() {
  const contracts: Record<string, ModelTenancyContract> = {};
  const legacyIssues = legacyIssueMap(
    legacyMissingBranchModelsByTask,
    "missing-branch-field"
  );
  for (const [model, value] of legacyIssueMap(
    legacyNullableBranchModelsByTask,
    "nullable-branch-field"
  )) {
    if (legacyIssues.has(model)) throw new Error(`Conflicting legacy issue for ${model}.`);
    legacyIssues.set(model, value);
  }

  for (const model of globalMasterModels) {
    addContract(contracts, model, {
      scope: "global-master",
      remediationTask: globalMasterTaskByModel[model],
      requiredBranchFields: []
    });
  }
  for (const model of platformEventModels) {
    addContract(contracts, model, {
      scope: "platform-event",
      remediationTask: 14,
      requiredBranchFields: []
    });
  }
  for (const model of hybridEventModels) {
    addContract(contracts, model, {
      scope: "hybrid-event",
      remediationTask: 14,
      requiredBranchFields: []
    });
  }
  for (const group of branchModelGroups) {
    for (const model of group.models) {
      const legacy = legacyIssues.get(model);
      if (legacy && legacy.task !== group.remediationTask) {
        throw new Error(`Legacy exception for ${model} points to the wrong task.`);
      }
      addContract(contracts, model, {
        scope: "branch-operation",
        remediationTask: group.remediationTask,
        requiredBranchFields: requiredBranchFieldOverrides[model] ?? ["branchCode"],
        ...(legacy
          ? {
              legacyException: {
                issue: legacy.issue,
                responsible: taskResponsible[legacy.task],
                reason: `Deuda heredada registrada para la Tarea ${legacy.task}.`
              }
            }
          : {})
      });
    }
  }
  for (const model of controlledCrossBranchReadModels) {
    const legacy = legacyIssues.get(model);
    addContract(contracts, model, {
      scope: "controlled-cross-branch-read",
      remediationTask: 9,
      requiredBranchFields: ["branchCode"],
      ...(legacy
        ? {
            legacyException: {
              issue: legacy.issue,
              responsible: taskResponsible[legacy.task],
              reason: "El grant actual se materializará por sede en la Tarea 9."
            }
          }
        : {})
    });
  }

  for (const model of legacyIssues.keys()) {
    if (!contracts[model]?.legacyException) {
      throw new Error(`Orphan legacy tenancy exception for ${model}.`);
    }
  }

  return Object.freeze(contracts) as Readonly<Record<ModelName, ModelTenancyContract>>;
}

export const branchTenancyContract = buildContract();
