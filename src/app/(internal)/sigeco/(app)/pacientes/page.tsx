import Link from "next/link";
import { getPatients } from "@/modules/database/queries/patients";
import { requirePermission } from "@/modules/permissions";

type PatientsPageProps = {
  searchParams: Promise<{ search?: string }>;
};

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
  await requirePermission("patients_read");
  const params = await searchParams;
  const patients = await getPatients({ search: params.search, pageSize: 30 });

  return (
    <div className="grid gap-5">
      <section className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted">Recepción</p>
          <h2 className="font-sora text-2xl font-bold">Pacientes</h2>
        </div>
        <Link
          href="/sigeco/pacientes/nuevo"
          className="focus-ring min-h-11 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-sm"
        >
          Nuevo
        </Link>
      </section>

      <form className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <input
          className="min-h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
          type="search"
          name="search"
          placeholder="Buscar por nombre, teléfono, código o ciudad"
          defaultValue={params.search}
        />
        <button className="focus-ring mt-3 min-h-12 w-full rounded-xl border border-border bg-surface-soft px-4 text-sm font-bold">
          Buscar
        </button>
      </form>

      <section className="grid gap-3">
        {patients.map((patient) => (
          <Link
            key={patient.id}
            href={`/sigeco/pacientes/${patient.id}`}
            className="focus-ring rounded-2xl border border-border bg-surface p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold">{patient.fullName}</p>
                <p className="text-sm text-muted">{patient.phone}</p>
                <p className="mt-1 text-xs font-semibold text-muted">
                  {patient.internalCode}
                  {patient.city ? ` · ${patient.city}` : ""}
                </p>
              </div>
              <span className="rounded-full border border-border bg-surface-soft px-3 py-1 text-xs font-bold text-muted">
                {patient._count.visits} visitas
              </span>
            </div>
          </Link>
        ))}
        {patients.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
            <p className="font-bold">No hay pacientes con esa búsqueda.</p>
            <p className="mt-1 text-sm text-muted">Registra un paciente nuevo desde recepción.</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
