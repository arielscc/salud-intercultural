# Tarea 9 — Enfermería, Estudios, Adjuntos Y Sesiones

Fecha: 2026-09-10.

## Resultado

Se implementó la pertenencia obligatoria a sucursal para estudios, signos
vitales, aplicaciones y notas de Enfermería, resultados de trabajos, adjuntos
clínicos, paquetes de sesiones y sus usos. Las escrituras reciben la sede desde
el contexto autenticado y las relaciones compuestas hacen que PostgreSQL rechace
una visita, orden, trabajo, estudio, expediente o paquete de otra sucursal.

Las bandejas, fichas y cronologías ordinarias filtran directamente por la sede
activa. Conocer un `workItemId` de otra sede produce ausencia de resultado. Una
aplicación que descuenta un inyectable exige una visita de la misma sede y pasa
esa sede al movimiento de inventario; no puede descontar el saldo de otra.

Los paquetes de sesiones y cada consumo conservan su sucursal. Su consulta,
creación, actualización y vínculo opcional con una visita usan la clave compuesta
local. No se cambió el catálogo comercial ni la contabilidad, reservados para
las Tareas 10 a 12.

## Continuidad Limitada De Enfermería

En `/sigeco/enfermeria/[workItemId]`, una persona con rol `enfermeria` activo en
la sede puede solicitar antecedentes necesarios indicando un motivo asistencial.
La solicitud exige una visita local del mismo paciente y el consentimiento
corporativo de continuidad vigente. Registra enfermera, paciente, visita, sede
solicitante, sedes consultadas, motivo y vencimiento, además del evento de
auditoría. Dura quince minutos.

Cada lectura revalida cuenta, membresía, rol, sede activa, paciente, visita,
vencimiento y consentimiento. Cambiar de sucursal invalida esa URL. La vista es
de solo lectura y contiene únicamente signos vitales, aplicaciones, notas de
Enfermería, sesiones aplicadas, órdenes dirigidas a Enfermería y adjuntos de esos
estudios. No consulta ni devuelve diagnóstico, plan, receta, evolución, nota
médica o consulta clínica completa.

La continuidad médica creada en la Tarea 8 también puede autorizar sus adjuntos.
Recepción y Administración no reciben una vista transversal de archivos. Dirección
y Superadministración conservan su operación mediante el selector y los permisos
de la sede activa; estos grants clínicos remotos siguen exigiendo el rol asistencial
específico.

## Adjuntos Clínicos

Las cuatro APIs de archivos resuelven el contexto activo antes de cargar,
eliminar, conceder o consumir contenido. Metadatos, idempotencia y checksum se
buscan por sucursal. Una carga solo acepta paciente, visita y estudio locales; una
eliminación usa `attachmentId + branchCode`. Un ID foráneo devuelve la misma
ausencia que un ID inexistente y no permite obtener metadatos ni borrar contenido.

Las claves nuevas siguen `clinical/<entorno>/<sucursal>/<id>.<extensión>`. El
grant de lectura registra archivo, profesional, rol, paciente, sede de origen,
sede solicitante y motivo. Dura dos minutos, se consume una sola vez y vuelve a
validar la membresía y el contexto antes de leer. El archivo se verifica por
tamaño y SHA-256; una discrepancia lo pone en cuarentena.

## Migración Y Reconciliación

1. `20260910130000_nursing_clinical_files_branch_scope` añade columnas sin
   default y deriva la sede desde visita, orden, trabajo, estudio, venta o un
   único expediente local demostrable. Las filas ambiguas quedan pendientes.
   Los grants anteriores, de dos minutos y sin evidencia de sede solicitante,
   se revocan; no se elimina ningún archivo ni metadato clínico.
2. `pnpm attachments:reconcile-keys` informa en modo `dry-run` los IDs técnicos
   cuyas claves aún no contienen sucursal. Después de revisar el resultado, la
   aplicación explícita requiere:

   ```bash
   pnpm attachments:reconcile-keys -- --apply --confirm=APPLY_CLINICAL_ATTACHMENT_STORAGE_RECONCILIATION
   ```

   El script verifica tamaño y SHA-256 antes de actualizar la referencia y
   eliminar la copia antigua. No imprime nombres de pacientes ni contenido.
3. `20260910140000_harden_nursing_clinical_files_branch_scope` se niega a
   continuar si existe ownership pendiente, una clave antigua o un paquete
   enlazado a una venta de otra sede. Solo entonces activa `NOT NULL`, índices
   locales y FKs compuestas.

Los pasos se prepararon para el despliegue controlado de la Tarea 17. No se
ejecutó ninguna migración, reconciliación ni modificación de datos reales.

## Validación

- `pnpm typecheck`: aprobado, incluida la generación Prisma/Payload/Next y el
  detector de tenencia.
- Contrato: 108 modelos clasificados; 84 operaciones locales, 21 maestros
  globales, un evento de plataforma y dos lecturas transversales controladas.
  Quedan 25 excepciones de modelo y 28 hallazgos de código para tareas futuras.
- Cobertura de integración preparada para ausencia de metadatos/grants/borrado
  ante un adjunto foráneo, continuidad limitada de Enfermería, invalidación por
  cambio de sede y rechazo de una escritura ligada a visita remota.
- `pnpm lint`: aprobado sin errores. Integración, base de datos, build y
  navegador quedan para la Tarea 17 según `CLAUDE.md`.
- El entorno usa Node 24.19.0 y el proyecto declara Node 22; la advertencia no
  produjo errores de TypeScript.

Este avance no certifica todavía aislamiento completo del sistema: catálogos
comerciales, inventario general, Caja, seguimientos, RLS y QA acumulado conservan
sus tareas posteriores.

Commit sugerido: `feat(sigeco): isolate nursing and clinical files by branch`
