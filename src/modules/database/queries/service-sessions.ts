import { prisma, withDatabaseError } from "@/modules/database";

export class ServiceSessionError extends Error {
  constructor(public readonly code: "not-active" | "no-sessions-left") {
    super(code);
    this.name = "ServiceSessionError";
  }
}

export function findServiceSessionError(error: unknown): ServiceSessionError | null {
  let current = error;
  while (current instanceof Error) {
    if (current instanceof ServiceSessionError) return current;
    current = "cause" in current ? current.cause : undefined;
  }
  return null;
}

/** Paquetes de sesiones de un paciente, con sus consumos, para ver usadas y restantes. */
export async function getPatientServiceSessionPackages(patientId: string) {
  return withDatabaseError("getPatientServiceSessionPackages", () =>
    prisma.serviceSessionPackage.findMany({
      where: { patientId },
      include: {
        uses: {
          orderBy: { sessionNumber: "asc" },
          include: { appliedBy: { select: { id: true, name: true, email: true } } }
        }
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    })
  );
}

/** Paquetes activos con sesiones restantes (para consumir en Enfermería). */
export async function getActivePatientServiceSessionPackages(patientId: string) {
  return withDatabaseError("getActivePatientServiceSessionPackages", async () => {
    const packages = await prisma.serviceSessionPackage.findMany({
      where: { patientId, status: "active" },
      orderBy: { createdAt: "asc" }
    });
    return packages.filter((pkg) => pkg.sessionsUsed < pkg.totalSessions);
  });
}

/** Consume una sesión de un paquete pagado (Enfermería). Cuenta como una visita. */
export async function consumeServiceSession(input: {
  packageId: string;
  visitId?: string;
  userId?: string;
  notes?: string;
}) {
  return withDatabaseError("consumeServiceSession", () =>
    prisma.$transaction(async (tx) => {
      const pkg = await tx.serviceSessionPackage.findUniqueOrThrow({
        where: { id: input.packageId }
      });
      if (pkg.status !== "active") throw new ServiceSessionError("not-active");
      if (pkg.sessionsUsed >= pkg.totalSessions) {
        throw new ServiceSessionError("no-sessions-left");
      }

      const sessionNumber = pkg.sessionsUsed + 1;
      await tx.serviceSessionUse.create({
        data: {
          packageId: pkg.id,
          visitId: input.visitId,
          sessionNumber,
          appliedById: input.userId,
          notes: input.notes
        }
      });

      const sessionsUsed = sessionNumber;
      return tx.serviceSessionPackage.update({
        where: { id: pkg.id },
        data: {
          sessionsUsed,
          status: sessionsUsed >= pkg.totalSessions ? "completed" : "active"
        }
      });
    })
  );
}
