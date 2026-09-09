# Identidad Global Y Expediente Local Del Paciente

## Frontera Vigente

`Patient` representa una sola persona para toda la clínica. Conserva el código
corporativo, documento, nombre, fecha de nacimiento, teléfono, dirección y los
campos normalizados usados para coincidencias exactas. `status` en esta tabla
solo expresa el ciclo de vida de la identidad o una fusión; no habilita una
operación local.

`PatientBranchRecord` representa la relación asistencial con una sucursal. Su
clave es `(patientId, branchCode)` y contiene número de ficha, estado operativo,
observaciones, alergias, antecedentes, medicación y fechas de primera/última
atención de esa sede. Una lista o una búsqueda aproximada siempre parte de esta
relación.

## Escritura Y Lectura

- Recepción puede buscar globalmente solo por teléfono, documento o código
  exactos. Un nombre o fragmento solo busca dentro de la sede activa.
- Elegir una identidad de otra sede no la duplica: el alta valida otra vez la
  coincidencia exacta en servidor y crea el `PatientBranchRecord` local.
- Administración lista y abre únicamente identidades ya relacionadas con la
  sede activa; sus advertencias de duplicidad tampoco muestran otra sede.
- Consentimientos de contacto, contactos asistenciales y notas llevan
  `branchCode` obligatorio y una FK compuesta al expediente local.
- `clinical_continuity` es la única finalidad de consentimiento cuyo estado
  vigente se calcula para toda la clínica. Seguimiento, recordatorios,
  educación, promociones, imagen/voz y opiniones permanecen locales.
- El acceso clínico entre sedes requiere el modo de consulta autorizado de la
  sucursal correspondiente. Cambiar de sede de consulta no mueve ni copia el
  expediente.

## Historia Inmutable

Cada `Visit` copia al crearse el nombre, documento, teléfono y dirección
vigentes. Esos cuatro campos no se vuelven a sincronizar. Las correcciones del
maestro incrementan `Patient.revision`, agregan un `PatientIdentityVersion` y
quedan además cubiertas por la auditoría de la Server Action.

La FK compuesta `(patientId, branchCode)` de la visita apunta a
`PatientBranchRecord`; PostgreSQL rechaza una atención que intente cruzar la
identidad de una persona con una sucursal donde todavía no tiene expediente.

Los alias y candidatos a duplicidad son globales. Documento exacto, teléfonos
normalizados o nombre más fecha de nacimiento pueden identificar una posible
duplicidad; la fusión conserva alias, combina por sucursal los expedientes y
registra una nueva versión del maestro.

## Migración Segura

La migración `20260909130000_patient_identity_branch_record` crea la estructura,
fotografía visitas y mueve únicamente perfiles/filas con una sola sucursal
demostrable. Los pendientes se resuelven con `pnpm branch:reconcile:patients`.
La migración `20260909140000_harden_patient_branch_record` se niega a eliminar
los campos antiguos o aplicar `NOT NULL` mientras quede un ID pendiente.
