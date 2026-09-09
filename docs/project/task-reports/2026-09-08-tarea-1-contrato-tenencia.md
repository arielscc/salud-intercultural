# Tarea 1: Contrato De Tenencia Y Detector Automático

## Fecha

2026-09-08.

## Objetivo

Convertir el modelo híbrido de sucursales en una frontera ejecutable que
clasifique todas las tablas y detenga automáticamente nuevas operaciones sin
sucursal, defaults silenciosos y fallbacks heredados.

## Cambios Implementados

- Se creó el contrato canónico de tenencia para los 100 modelos Prisma.
- La clasificación vigente contiene 20 maestros globales, 78 modelos de
  operación por sucursal, un evento de plataforma y una lectura transversal
  controlada.
- El detector compara el schema, el cliente Prisma generado y el contrato. Un
  modelo nuevo o retirado sin actualizar las tres fuentes hace fallar el
  chequeo.
- Para cada operación local valida campos `branchCode` obligatorios —o los dos
  extremos en un traslado—, ausencia de `@default` y FK restrictiva hacia la
  sucursal.
- Se verifica que la migración
  `20260908120000_require_explicit_branch_code` conserve las siete eliminaciones
  de defaults operativos.
- El barrido AST de TypeScript/TSX detecta el literal `"el-alto"`, parámetros de
  sucursal opcionales, parámetros con default y fallbacks `??`/`||` asignados a
  una sucursal.
- Una escritura con fallback se rechaza sin posibilidad de excepción.
- La deuda anterior al contrato quedó registrada por coincidencia exacta con
  responsable, tarea de retiro y cantidad esperada. Una excepción obsoleta o
  un hallazgo adicional también hace fallar el chequeo.
- Se agregó el comando `pnpm branch:tenancy:check`, se integró al final de
  `pnpm typecheck` y se escribieron pruebas unitarias que demuestran el rechazo
  de modelos no clasificados, operaciones sin sede, defaults y excepciones
  sobre escrituras. Así se ejecuta en cada tarea y también en CI.

## Inventario Y Deuda Temporal

| Alcance | Modelos |
| --- | ---: |
| `global-master` | 20 |
| `branch-operation` | 78 |
| `platform-event` | 1 |
| `controlled-cross-branch-read` | 1 |

De los modelos que deben terminar siendo locales, 63 todavía tienen una
excepción temporal exacta por campo ausente o nullable. En código existen 51
hallazgos heredados permitidos únicamente hasta sus tareas asignadas. No se
encontró ninguna escritura con fallback a El Alto.

Estos números describen deuda visible, no aislamiento terminado. Las tareas
2–14 deben ir retirando las excepciones; no pueden aumentar silenciosamente.

## Archivos Modificados

- `src/features/branches/tenancy-contract.ts`
- `scripts/branch-tenancy-check.ts`
- `scripts/branch-tenancy-check.test.ts`
- `package.json`
- `docs/project/sigeco-aislamiento-estricto-sucursales/tasks.md`
- `docs/project/sigeco-aislamiento-estricto-sucursales/progress.md`
- `docs/project/task-reports/README.md`
- `docs/project/task-reports/2026-09-08-tarea-1-contrato-tenencia.md`

## Decisiones Técnicas

- `Patient`, `Supplier` e `InventoryItem` siguen siendo maestros globales; sus
  visitas, condiciones comerciales, existencias y movimientos no lo son.
- `ClinicalAttachmentAccessGrant` expresa el único alcance transversal
  controlado actual y debe materializar la sede en la Tarea 9.
- `AuditEvent` se clasifica como evento de plataforma mientras la Tarea 14
  separa auditoría global de auditoría operacional por sede.
- Se usa el enum de modelos del cliente Prisma generado junto con el parser del
  schema, porque Prisma 7 no expone DMMF desde el cliente público.
- Las excepciones permiten incorporar deuda anterior sin debilitar el guard:
  deben coincidir por archivo, símbolo, regla y cantidad.

## Validación

- `pnpm lint`: aprobado.
- `pnpm typecheck`: aprobado.
- El detector ejecutable reportó 100 modelos clasificados y ninguna infracción
  fuera del inventario temporal.
- No se ejecutaron pruebas, build, integración ni QA de navegador, de acuerdo
  con la política vigente por tarea.
- El entorno mostró una advertencia porque usa Node `v24.19.0` y el proyecto
  declara Node 22; no afectó las dos validaciones.

## Pendientes

- Tarea 2: centralizar el contexto de sucursal autenticado y retirar el default
  operativo de El Alto.
- Las tareas 5–14 retirarán las 63 excepciones de modelo y los 51 hallazgos de
  código conforme se particione cada dominio.
- La Tarea 17 ejecutará la suite acumulada, integración, build, RLS real y QA.

**Commit sugerido:** `test(sigeco): enforce branch ownership contract`
