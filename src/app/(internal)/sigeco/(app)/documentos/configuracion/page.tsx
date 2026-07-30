import { Field, internalInputClassName } from "@/components/internal/Field";
import { SubmitButton } from "@/components/internal/SubmitButton";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { Chip } from "@/components/internal/ui/Chip";
import { PageHeader } from "@/components/internal/ui/PageHeader";
import { configureProfessionalProfileAction } from "@/features/generated-documents/actions";
import { getClinicalProfessionalProfiles } from "@/modules/generated-documents/service";
import { requirePermission } from "@/modules/permissions";

export default async function DocumentConfigurationPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; aviso?: string }>;
}) {
  await requirePermission("documents_configure");
  const query = await searchParams;
  const doctors = await getClinicalProfessionalProfiles();

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Identidad para recetas"
        description="Datos profesionales confirmados que aparecerán en el PDF"
      />

      {query.error ? (
        <div className="rounded-[9px] border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          Revisa todos los datos profesionales obligatorios.
        </div>
      ) : null}
      {query.aviso === "perfil-guardado" ? (
        <div className="rounded-[9px] border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          Identidad profesional actualizada.
        </div>
      ) : null}

      <Card>
        <p className="text-sm text-muted">
          SIGECO usa estos datos únicamente para preparar la receta. La receta
          todavía debe ser revisada, firmada y sellada por el profesional antes de
          entregarse al paciente.
        </p>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {doctors.map((doctor) => {
          const profile = doctor.professionalProfile;
          return (
            <Card key={doctor.id}>
              <CardHeader
                title={doctor.name ?? doctor.email}
                description={doctor.email}
                action={
                  <Chip tone={profile?.active ? "success" : "warning"}>
                    {profile?.active ? "Listo para emitir" : "Falta confirmar"}
                  </Chip>
                }
              />
              <form action={configureProfessionalProfileAction} className="grid gap-3">
                <input type="hidden" name="userId" value={doctor.id} />
                <Field label="Nombre que aparecerá">
                  <input
                    className={internalInputClassName}
                    name="displayName"
                    defaultValue={profile?.displayName ?? doctor.name ?? ""}
                    required
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Título profesional">
                    <input
                      className={internalInputClassName}
                      name="professionalTitle"
                      defaultValue={profile?.professionalTitle ?? "Dr."}
                      placeholder="Dr. / Dra."
                      required
                    />
                  </Field>
                  <Field label="Especialidad">
                    <input
                      className={internalInputClassName}
                      name="specialty"
                      defaultValue={profile?.specialty ?? ""}
                      required
                    />
                  </Field>
                </div>
                <Field label="Registro del Ministerio de Salud">
                  <input
                    className={internalInputClassName}
                    name="ministryRegistration"
                    defaultValue={profile?.ministryRegistration ?? ""}
                    required
                  />
                </Field>
                <Field label="Registro del Colegio Médico">
                  <input
                    className={internalInputClassName}
                    name="medicalCollegeRegistration"
                    defaultValue={profile?.medicalCollegeRegistration ?? ""}
                    required
                  />
                </Field>
                <label className="flex min-h-11 items-center gap-3 rounded-[9px] border border-border px-3 text-sm text-text">
                  <input
                    className="h-5 w-5 accent-primary"
                    type="checkbox"
                    name="active"
                    defaultChecked={profile?.active ?? true}
                  />
                  Datos revisados y habilitados para nuevas recetas
                </label>
                <SubmitButton className="w-full sm:w-auto">
                  Guardar identidad
                </SubmitButton>
              </form>
            </Card>
          );
        })}
      </div>

      {doctors.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            No hay usuarios médicos activos. Primero registra o activa al
            profesional en Usuarios.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
