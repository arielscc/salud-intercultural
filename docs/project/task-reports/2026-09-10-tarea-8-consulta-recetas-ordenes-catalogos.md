# Tarea 8 — Consulta, Recetas, Órdenes Y Catálogos Clínicos

Fecha: 2026-09-10.

## Resultado

Se implementó la pertenencia a sucursal en los trece modelos clínicos previstos.
Las escrituras y consultas operativas reciben la sede del contexto autenticado;
las relaciones compuestas unen consulta, visita, expediente local y sus hijos.
El pedido médico y sus líneas pertenecen a la sede de la visita, incluida la
referencia al trabajo creado al derivarlo a Enfermería.

La generación y corrección de recetas validan la sede. Los perfiles profesionales
se configuran por usuario/sucursal y el documento usa el de la sede de atención.
El selector de medicamentos muestra existencias locales y las escrituras rechazan
IDs de productos sin disponibilidad registrada en esa sede.

Las definiciones de diagnósticos, indicaciones, hallazgos y observaciones siguen
siendo canónicas globales. Su activación y contador de uso son locales. Desactivar
una indicación no cambia otra sede. Las semillas existentes requieren ahora
`--branch=<codigo>` y validan que la sucursal exista; no modifican la activación de
otras sedes ni reactivan configuraciones desactivadas previamente.

## Continuidad Médica

En `/sigeco/consultas/[visitId]`, el médico puede solicitar antecedentes de otras
sedes indicando el motivo asistencial. Se valida la visita del paciente en la sede,
la asignación médica activa y el consentimiento de continuidad vigente. El acceso
registra médico, paciente, visita, sede solicitante, sedes consultadas, motivo y
fecha, además del evento auditado de la acción. Dura quince minutos y se vincula
al usuario, paciente, visita y sede: copiar su URL a otra cuenta no otorga acceso.
El motivo permite consultar también desde una visita ya cerrada, sin reabrirla.

Cada lectura revalida el rol, la asignación y el consentimiento. Un acceso
expirado o revocado vuelve a la historia local. La vista etiqueta las sedes y
presenta diagnóstico, hallazgos, observaciones, plan, indicaciones, receta,
evoluciones, notas y órdenes cronológicamente, sin acciones de edición remota.
Las precargas de recetas anteriores se limitan a la sede activa. Los importes
y sesiones comerciales en este resumen siguen limitados a la sucursal activa.

Recepción y Administración no obtienen esta vista transversal. Enfermería conserva
el alcance pendiente de Tarea 9. Superadministración y Dirección mantienen sus
permisos operativos mediante el selector de sede; este acceso específico de
continuidad médica exige rol médico, conforme al contrato de Tarea 8.

## Migración Y Reconciliación

1. `20260910110000_clinical_branch_scope`: añade columnas sin default y deriva
   la sede desde visita, consulta, receta o pedido. Para el perfil profesional
   solo atribuye automáticamente cuando hay exactamente una asignación activa.
   El trigger inmutable de resultados se suspende únicamente durante este
   backfill estructural, dentro de una transacción, y se restaura antes de cerrar.
2. `20260910120000_harden_clinical_branch_scope`: bloquea campos pendientes,
   activa `NOT NULL`, índices y relaciones compuestas dentro de una transacción.
   Habilita sugerencias históricas solo en sedes con evidencia de uso.

Antes del endurecimiento, revisar perfiles pendientes mediante:

```sql
SELECT p."id", p."userId", m."branchCode", m."active", m."isDefault"
FROM "ClinicalProfessionalProfile" p
LEFT JOIN "InternalUserBranch" m ON m."userId" = p."userId"
WHERE p."branchCode" IS NULL
ORDER BY p."id", m."branchCode";
```

La persona responsable debe confirmar la sede histórica y actualizar únicamente
el perfil identificado por ID. No se debe rellenar con la sede predeterminada:
la sede actual de trabajo no prueba dónde se validó el perfil. Los perfiles de
otras sedes se confirman desde `/sigeco/documentos/configuracion`. Cualquier FK
que encuentre una relación histórica cruzada abortará el endurecimiento completo
y requerirá reconciliación. No se ejecutó ninguna migración ni semilla.

Los catálogos canónicos sin evidencia de uso local conservan sus definiciones,
pero necesitan habilitación explícita para aparecer como sugerencias. Para las
listas mínimas ya incluidas en el proyecto, ejecutar la semilla correspondiente
con `--branch=<codigo>` al preparar cada sede.

## Validación

- `pnpm lint`: aprobado sin errores.
- `pnpm typecheck`: aprobado, incluyendo generación de tipos y detector de tenencia.
- Contrato: 107 modelos; 84 operaciones locales, 21 maestros globales, un evento
  de plataforma y una lectura transversal controlada. Quedan 34 excepciones de
  modelo y 31 hallazgos de código para las siguientes tareas.
- Cobertura de integración preparada para rechazo de visita remota en lectura
  operativa, escritura y FK; acceso médico frente a Administración; vínculo del
  acceso a la cuenta y revocación de la asignación. Fixtures existentes adaptadas
  a la sucursal obligatoria. Estas pruebas no se ejecutaron en esta tarea.
- Integración, base de datos, build y navegador quedan para el cierre acumulado,
  según `CLAUDE.md`. El entorno usa Node 24.19.0 y el proyecto pide Node 22.

El catálogo comercial, los paquetes de sesiones, Caja, adjuntos y RLS conservan
sus tareas posteriores. Este avance no certifica aislamiento completo del sistema.

Commit sugerido: `feat(sigeco): isolate clinical records by branch`
