import type {
  FollowUpContactPreference,
  PatientCaptureSource,
  PatientGender,
  SymptomDurationUnit,
  VisitIntakeType
} from "@/generated/prisma/client";
import { prisma, withDatabaseError } from "@/modules/database";
import { createVisitInTransaction } from "@/modules/database/queries/visits";

export type ReceptionIntakeRecordInput = {
  userId?: string;
  patientId?: string;
  patient: {
    fullName: string;
    phone: string;
    birthDate?: Date;
    gender?: PatientGender;
    city?: string;
    captureSource?: PatientCaptureSource;
    allergies?: string;
    relevantHistory?: string;
    currentMedication?: string;
    followUpPreference?: FollowUpContactPreference;
  };
  visit: {
    reason: string;
    intakeType?: VisitIntakeType;
    symptomDurationValue?: number;
    symptomDurationUnit?: SymptomDurationUnit;
    previouslyTreated?: boolean;
    bringsStudies?: boolean;
  };
};

export async function createReceptionIntake(input: ReceptionIntakeRecordInput) {
  return withDatabaseError("createReceptionIntake", async () => {
    return prisma.$transaction(async (tx) => {
      let patientId = input.patientId;

      if (patientId) {
        await tx.patient.update({
          where: { id: patientId },
          data: input.patient
        });
      } else {
        const patientCount = await tx.patient.count();
        const patient = await tx.patient.create({
          data: {
            internalCode: `SI-${String(patientCount + 1).padStart(6, "0")}`,
            ...input.patient,
            gender: input.patient.gender ?? "unknown",
            captureSource: input.patient.captureSource ?? "other",
            followUpPreference: input.patient.followUpPreference ?? "unknown"
          }
        });
        patientId = patient.id;
      }

      const visit = await createVisitInTransaction(tx, {
        patientId,
        userId: input.userId,
        note: "Llegada registrada en recepción",
        ...input.visit
      });

      return { patientId, visit };
    });
  });
}

export async function searchReceptionPatients(search: string) {
  return withDatabaseError("searchReceptionPatients", async () => {
    return prisma.patient.findMany({
      where: {
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
          { secondaryPhone: { contains: search, mode: "insensitive" } },
          { internalCode: { contains: search, mode: "insensitive" } }
        ]
      },
      select: {
        id: true,
        internalCode: true,
        fullName: true,
        phone: true,
        birthDate: true,
        gender: true,
        city: true,
        captureSource: true,
        allergies: true,
        relevantHistory: true,
        currentMedication: true,
        followUpPreference: true
      },
      orderBy: { updatedAt: "desc" },
      take: 5
    });
  });
}
