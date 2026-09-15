# Tarea 17 — Cierre acumulado y despliegue controlado

Fecha: 2026-09-11  
Estado: cierre técnico aprobado en local y base de staging; despliegue del
runtime y producción pendientes de credenciales separadas, QA manual y firma de
Dirección.

## Resultado

Las 17 tareas quedaron verificadas como un conjunto. La base se reconstruyó
desde cero, la aplicación compiló, el simulacro de backup/restauración pasó y
la matriz automatizada cubrió aislamiento por sucursal, continuidad clínica,
archivos, idempotencia, documentos, Caja, compras, stock, lotes y reutilización
de conexiones.

Staging recibió las 94 migraciones y completó un ensayo sintético de los once
pasos de la Etapa 1. Producción no fue consultada ni modificada.

## Defectos encontrados y corregidos durante el cierre

- Los backfills de `PatientConsent` y `VisitAreaTimeEvent` chocaban con sus
  triggers append-only al migrar una base con historia. Las ventanas de
  migración quedaron explícitas, transaccionales y reanudables; los triggers se
  restauran antes del commit y cualquier fallo revierte el bloque.
- La migración RLS asumía que el proveedor permitiría conceder
  `BYPASSRLS`. Neon lo prohíbe a sus propietarios administrados. La migración
  ahora valida atributos inseguros y usa dos variantes equivalentes: `FORCE`
  cuando mantenimiento posee bypass, o `ENABLE` sin `FORCE` cuando
  `sigeco_maintenance` es el propietario técnico. `sigeco_web` nunca es
  propietario ni recibe bypass.
- Se corrigieron incompatibilidades de backfill, relaciones compuestas y
  triggers descubiertas por la reconstrucción real, además de fixtures de
  integración que intentaban borrar evidencia inmutable.
- Se actualizaron Next.js, Sharp y MySQL2 a revisiones que cierran hallazgos
  críticos/altos no aceptados. La auditoría conserva solo dos vulnerabilidades
  altas preexistentes, explícitamente documentadas e ignoradas por política.

## Reconciliación de staging

La base contenía únicamente datos QA/sintéticos anteriores al nuevo contrato.
Se preservó su evidencia y no se ejecutó reset:

- dos cuentas de ensayo sin membresía se asignaron a El Alto según sus ventas,
  Caja y autorizaciones existentes: 8/8 cuentas resueltas;
- el fixture `QA-000006` se asignó a El Alto, sede fija demostrada por la
  versión histórica del seed: 12/12 registros de paciente resueltos;
- `QA-INV-001` tenía tres salidas y omitía su apertura histórica de 3 unidades;
  se agregó un movimiento compensatorio append-only de +3. Libro y saldo
  terminaron en 0, sin reescribir las tres salidas;
- una alerta antigua de ese producto se atribuyó a El Alto;
- 12 eventos de módulos y 147 eventos operativos de auditoría se clasificaron
  como El Alto usando el checksum exacto del dry-run: 159/159 resueltos;
- una Caja QA del 28 de agosto se cerró mediante el flujo normal con diferencia
  0, sin borrar movimientos.

Después de la reconciliación, `pnpm staging:migrate` aplicó las 94 migraciones.
El detector SQL arrojó 127/127 controles en cero antes y después del ensayo.

## Ensayo de staging

El ensayo `ENSAYO-2026-09-12` completó sin defectos:

1. activación de `core`, Administración, Inventario, Compras y Catálogo;
2. producto con stock inicial 10;
3. apertura de Caja por 100 Bs;
4. cliente sin visita;
5. venta por 90 Bs y stock 8;
6. cobro completo y saldo 0;
7. recibo versionado;
8. egreso autorizado por 30 Bs;
9. compra recibida con lote y stock final 13;
10. suspensión/reactivación de Compras con lectura para Dirección y escritura
    bloqueada;
11. cierre de Caja con esperado 35 Bs y diferencia 0.

La verificación encontró 6/6 cuentas QA y 6 pacientes sintéticos, con
comunicaciones bloqueadas, analytics desactivado y almacenamiento de staging.

## Evidencia RLS

La prueba directa contra Neon autenticó temporalmente como `sigeco_web` y
retiró la contraseña efímera al terminar:

- sin contexto: 0 visitas visibles;
- contexto El Alto: 4 visitas, todas con `branchCode=el-alto`;
- contexto Cochabamba: 0 visitas;
- intento de cambiar visitas de El Alto a Cochabamba: rechazado con SQLSTATE
  `42501`;
- control de revocación: una conexión nueva con la clave efímera ya retirada
  fue rechazada con SQLSTATE `28P01`. El campo `rolpassword` de `pg_roles` no
  se usa como verificación porque PostgreSQL lo enmascara siempre.

La integración local agregó además cuatro pruebas PostgreSQL directas: SELECT
sin filtro Prisma, INSERT/UPDATE cruzado, continuidad médica y de Enfermería,
aislamiento del pool y bloqueo de escalamiento del rol web.

## Validación acumulada

- `pnpm lint`: aprobado.
- `pnpm typecheck`: aprobado; 112 modelos clasificados, deuda de modelos 0 y
  deuda de código 0.
- `pnpm test`: 99 archivos y 516/516 pruebas aprobadas.
- `pnpm test:integration`: 26 archivos y 121/121 pruebas aprobadas sobre una
  base reconstruida con las 94 migraciones.
- `pnpm build`: aprobado con Next.js 16.3.4, TypeScript y 23 páginas estáticas.
- `pnpm backup:drill:local`: backup y restauración aprobados; evidencia
  `.data/backup-evidence/mtxoorm2_a76ce99e.json`.
- `pnpm security:gate:local`: aprobado, 0 hallazgos críticos o altos no
  aceptados; evidencia `.data/incident-evidence/ms6hi8bf_ad569853.json`.
- `pnpm deps:check`: aprobado; 0 críticas y 0 altas no ignoradas.
- `pnpm branch:isolation:sql`: 127/127 controles en cero en local y staging.
- `pnpm staging:sync-vercel --dry-run`: aprobado; reconoció las 14 variables
  acotadas a Preview de la rama `staging` sin escribirlas.

El build mantiene dos advertencias no bloqueantes ya conocidas: Turbopack
incluye un trazado amplio por las rutas dinámicas de archivos locales de
recibos de Caja y documentos de compra. No se amplió esta tarea para rediseñar
el almacenamiento.

## Plan de reversión

No se usarán migraciones descendentes sobre evidencia clínica o financiera.
Para producción, el procedimiento preparado es:

1. bloquear el despliegue y las escrituras antes de migrar;
2. generar y verificar un backup conjunto de PostgreSQL y adjuntos;
3. registrar conteos de filas, Caja, stock, lotes y documentos por sucursal;
4. migrar con la credencial de mantenimiento y ejecutar los 127 controles;
5. ante un fallo, mantener producción detenida, restaurar el backup en una base
   nueva, verificarlo y cambiar la conexión de forma atómica;
6. reabrir solo después de comprobar conteos y canarios por sucursal.

El backup nunca se restaura encima de la base fallida y los movimientos
append-only no se eliminan para “deshacer” una migración.

## Bloqueos deliberados antes del deploy

- `DATABASE_URL` de staging todavía usa `neondb_owner`, que posee
  `BYPASSRLS`. Debe sustituirse por una credencial permanente de `sigeco_web`.
- La sincronización real con Vercel quedó deliberadamente sin ejecutar: el
  `dry-run` aprobó, pero con la URL actual publicaría la credencial propietaria.
- Falta guardar `MAINTENANCE_DATABASE_URL` con una credencial independiente de
  `sigeco_maintenance`.
- El runtime de staging no fue desplegado con esas credenciales, por lo que el
  QA visual en móvil/escritorio y pestañas simultáneas queda pendiente.
- Dirección debe firmar la matriz por dominio y sucursal.
- El gate conserva `productionApproval=false`; no existe autorización separada
  para migrar o desplegar producción.

Estos bloqueos no permiten promover el sitio, aunque código, migraciones y base
de staging hayan superado el cierre técnico.

## Archivos principales

- `prisma/migrations/20260909130000_patient_identity_branch_record/migration.sql`
- `prisma/migrations/20260909170000_visit_flow_branch_scope/migration.sql`
- `prisma/migrations/20260911210000_postgres_row_level_security/migration.sql`
- `src/modules/database/rls-branch-isolation.integration.test.ts`
- `scripts/security/security-gate.ts`
- `scripts/backup/local-backup.ts`
- `docs/operations/staging.md`
- `docs/project/sigeco-aislamiento-estricto-sucursales/progress.md`

**Commit sugerido:** `test(sigeco): verify strict branch isolation end to end`
