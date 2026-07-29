# Progress — Mejoras Integrales De SIGECO

Última actualización: 2026-07-29.

Plan de ejecución: [tasks.md](./tasks.md)

## Estado General

Las tareas fueron reorganizadas según el orden real de implementación. El plan ahora comienza con CI y termina con el piloto completo del personal.

Las Tareas 1 y 2 están en progreso. CI, las barreras de aislamiento, la base y
el Blob Store QA están preparados. Las doce migraciones ya se aplicaron en
staging. Falta verificar los jobs remotos, ejecutar seed, validar las cuentas y
probar el deployment antes de cerrar ambas tareas.

## Resumen

| Estado | Cantidad |
| --- | ---: |
| Pendiente | 27 |
| En progreso | 2 |
| Bloqueada | 0 |
| Terminada | 0 |
| Descartada | 0 |

## Progreso Por Fase

| Fase | Tareas | Estado | Gate |
| --- | --- | --- | --- |
| 1. Base segura | 1-8 | En progreso | Dirección aprueba seguridad e incidentes |
| 2. Datos y flujo | 9-17 | Pendiente | Recorrido clínico íntegro y auditable |
| 3. Caja e inventario | 18-21 | Pendiente | Caja, compra y stock reconcilian |
| 4. Medición y continuidad | 22-27 | Pendiente | Indicadores reconciliados y móvil validado |
| 5. Expansión y piloto | 28-29 | Pendiente | Piloto de El Alto aprobado |

## Estado Por Tarea

| # | Tarea | Prioridad | Estado | Dependencias |
| --- | --- | --- | --- | --- |
| 1 | CI y control de dependencias | P0 | En progreso | Ninguna |
| 2 | Staging aislado | P0 | En progreso | 1 |
| 3 | Auditoría append-only | P0 | Pendiente | 1-2 |
| 4 | Usuarios, roles y sesiones | P0 | Pendiente | 3 |
| 5 | Permisos, privacidad, logs y secretos | P0 | Pendiente | 3-4 |
| 6 | Adjuntos clínicos seguros | P0 | Pendiente | 2-5 |
| 7 | Backup y restauración | P0 | Pendiente | 2, 6 |
| 8 | Incidentes y gate de seguridad | P0 | Pendiente | 1-7 |
| 9 | Consentimientos | P0 | Pendiente | 3-5, textos aprobados |
| 10 | Procedencia geográfica | P1 | Pendiente | 8 |
| 11 | Fuentes de captación | P1 | Pendiente | 9-10 |
| 12 | Duplicados y fusión | P1 | Pendiente | 3-5 |
| 13 | Actualización de bandejas | P1 | Pendiente | 1-5 |
| 14 | Resultado de propuesta | P1 | Pendiente | 3, 4, 9 |
| 15 | Tipos de seguimiento | P1 | Pendiente | 9, 14 |
| 16 | Abandono, bloqueo y pendientes | P1 | Pendiente | 13, 15 |
| 17 | Correcciones y firma clínica | P1 | Pendiente | 3-5 |
| 18 | Caja, dinero al personal, gastos y cierre | P0 | Pendiente | 3-5, 8 |
| 19 | Catálogo y proveedores | P0 | Pendiente | 3-5, 18 |
| 20 | Compras, recepciones, lotes y stock | P0 | Pendiente | 18-19 |
| 21 | Recetas y comprobantes | P1 | Pendiente | 17-20 |
| 22 | Reporte del recorrido completo | P1 | Pendiente | 9-21 |
| 23 | Tiempo por área | P1 | Pendiente | 13, 16, 22 |
| 24 | Recordatorios supervisados | P1 | Pendiente | 9, 15 |
| 25 | Encuestas y reclamos | P2 | Pendiente | 9, 24, piloto manual |
| 26 | Móvil y conectividad lenta | P1 | Pendiente | 2, 5, 13, 18, 20 |
| 27 | Integración Payload-SIGECO | P2 | Pendiente | 3, 5, 9, 11, 22 |
| 28 | Multi-sucursal | P1 | Pendiente | 10, 18-20, 22, 26 |
| 29 | Piloto completo con personal | P0 | Pendiente | Módulos del despliegue |

## Próximo Trabajo

Las tareas activas son:

- **Tarea 1 — CI y control de dependencias:** pendiente de ejecución remota y protecciones.
- **Tarea 2 — Staging completamente aislado:** pendiente de seed, deployment y validación de cuentas.

Para terminar la Tarea 1:

- Publicar los cambios en una rama.
- Observar los cinco jobs en GitHub Actions.
- Confirmar que PostgreSQL efímero aplica migraciones y pasa integración.
- Configurar los checks obligatorios en `staging` y `main`.
- Registrar nombres y resultados de los checks.

Para terminar la Tarea 2:

- Configurar secretos Preview únicamente para la rama `staging`.
- Ejecutar `pnpm staging:seed` y `pnpm staging:verify`.
- Verificar los siete roles, media y bloqueo de comunicaciones en el deployment.

No comenzar la Tarea 3 hasta cerrar las Tareas 1 y 2.

## Decisiones Vigentes

- `tasks.md` es la única fuente de tareas activas.
- Este archivo es la única fuente de estado y avance.
- El médico cierra la propuesta del tratamiento.
- Administración controla Caja, gastos, compras e inventario.
- Marlen realiza seguimiento de pacientes en tratamiento.
- Yazmin conserva solo comunicación y apoyo para la llegada.
- Una entrega grupal de dinero registra beneficiarios y montos individuales.
- Registrar una compra no aumenta stock; la recepción confirmada sí.
- Compra, pago/egreso, recepción y movimiento de stock quedan enlazados.
- Los registros históricos se corrigen, no se borran.
- Web y móvil responsive usan las mismas reglas y permisos.
- El Alto debe estabilizarse antes de activar Cochabamba.
- Recepción pregunta “Facebook” de forma general; no exige que el paciente distinga publicidad de contenido orgánico.
- El detalle pagado u orgánico solo se atribuye internamente cuando una campaña o enlace entrega evidencia.
- Agenda y citas quedan aplazadas hasta un piloto manual.
- FHIR queda fuera del plan actual.

## Decisiones Pendientes Que No Bloquean La Tarea 1

### Consentimientos

- Aprobar los textos para seguimiento, recordatorios, educación, promociones e imagen/voz.

### Caja

- Definir qué usuarios abren y cierran.
- Definir el límite de diferencia que requiere aprobación.
- Definir qué gastos exigen comprobante.
- Definir cuánto tiempo puede quedar pendiente un comprobante.

### Inventario

- Definir qué categorías usan lote y vencimiento.
- Definir si se bloquea la venta de producto vencido.
- Definir quién autoriza merma, daño y devolución.

### Documentos

- Confirmar requisitos clínicos y tributarios de receta y comprobante.

## Registro De La Reorganización

### 2026-07-28 — Numeración Y Documentación

**Estado anterior:** existían 21 tareas principales, una Tarea 19 dividida en numeración secundaria y cuatro archivos dentro del directorio.

**Estado nuevo:** existen 29 tareas consecutivas en orden de implementación y únicamente dos archivos activos: `tasks.md` y `progress.md`.

**Cambios:**

- Seguridad pasó del número 19 a las tareas 1-8.
- Los puntos operativos fueron renumerados según sus dependencias.
- Caja, catálogo y compras se dividieron en las tareas 18-20.
- Correcciones clínicas quedó como Tarea 17.
- El piloto completo quedó al final como Tarea 29.
- La matriz del backlog anterior se incorporó en `tasks.md`.
- Agenda y FHIR quedaron documentados como aplazados, no como tareas activas.
- El backlog `sigeco-mejoras-futuras` permanece como antecedente técnico, pero no controla estados.

**Validación documental requerida:**

- Deben existir exactamente dos archivos en este directorio.
- Deben existir 29 encabezados de tareas en `tasks.md`.
- Esta tabla debe contener 29 filas de estado.
- Las referencias antiguas deben apuntar a `tasks.md` o `progress.md`.

### 2026-07-28 — Tarea 1 — CI Y Control De Dependencias

**Estado anterior:** Pendiente.

**Estado nuevo:** En progreso.

**Responsable:** equipo técnico.

**Commit sugerido:** `ci(sigeco): add quality gates and dependency controls`

#### Resultado Implementado Localmente

- Creado `.github/workflows/ci.yml`.
- Configurados triggers para PR hacia `develop`, `staging` y `main`, push a `develop` y ejecución manual.
- Configurados cinco jobs independientes: quality, unit-tests, integration-tests, build y dependency-audit.
- Integración usa PostgreSQL 16 efímero y la base `salud_intercultural_test`.
- El token del workflow solo tiene `contents: read`.
- Las variables del workflow son sintéticas y no usan secretos remotos.
- Node quedó limitado a la versión mayor 22.
- pnpm se actualizó y fijó en `11.17.0`.
- Next, Payload, Prisma, React, PostgreSQL client, Vitest, Vite, PostCSS, Sharp y dependencias relacionadas fueron actualizadas.
- Se agregaron overrides mínimos para PostCSS y Sharp transitivos.
- Se corrigieron las etiquetas de fuente Facebook para coincidir con el enum Prisma vigente.
- Se actualizaron testing, ramas, deploy y el plan de GitHub Actions.

#### Control De Vulnerabilidades

- Baseline inicial: 22 vulnerabilidades altas.
- Estado actual de producción: 0 altas o críticas; permanecen 4 bajas y 14 moderadas.
- Excepción temporal de desarrollo: `GHSA-mh99-v99m-4gvg` en `brace-expansion`, alcanzada únicamente por ESLint/minimatch.
- Forzar la versión corregida rompe ESLint; ESLint 10 también fue descartado temporalmente porque los plugins actuales no son compatibles.
- CI bloquea cualquier otra vulnerabilidad alta o crítica.

#### Validación Ejecutada

- `pnpm install --frozen-lockfile`: pasó.
- `pnpm peers check`: pasó.
- `pnpm audit:prod`: pasó.
- `pnpm audit:high`: pasó con la única excepción documentada.
- `pnpm lint`: pasó.
- `pnpm test`: pasó, 22 archivos y 75 pruebas.
- `pnpm typecheck`: pasó.
- `pnpm run build`: pasó con Next.js 16.2.12.
- `.github/workflows/ci.yml`: YAML válido con cinco jobs detectados.
- `pnpm test:integration`: no pudo ejecutarse localmente porque Docker/PostgreSQL no están disponibles en este WSL; falló antes de modificar datos con `P1001`.

#### Pendientes Para Cerrar

- Publicar la rama y observar los cinco jobs en GitHub Actions.
- Confirmar que el job de integración aplica todas las migraciones y pasa con PostgreSQL 16.
- Configurar checks obligatorios y protección de `staging` y `main`.
- Registrar evidencia de la primera ejecución remota.

### 2026-07-29 — Ajuste De La Fuente Facebook

**Motivo:** la mayoría de los pacientes son adultos mayores y no necesariamente puede distinguir entre una publicación normal y una publicidad pagada.

**Resultado:**

- Recepción muestra una sola opción: `Facebook`.
- Los valores anteriores `facebook_ads` y `facebook_organic` se aceptan por compatibilidad, pero se normalizan a `facebook`.
- La migración convierte registros históricos y elimina duplicados de Facebook en la lista de fuentes del paciente.
- El detalle pagado u orgánico queda reservado para la atribución interna automática definida en la Tarea 11.
- La Tarea 11 continúa pendiente porque todavía no se implementaron el catálogo administrable, los enlaces de campaña ni los reportes de atribución.

**Validación:** esquema Prisma válido, lint y typecheck aprobados, 22 archivos y 77 pruebas unitarias aprobadas. La migración no pudo probarse localmente porque Docker no está disponible en este WSL; debe validarse en el job de integración de CI.

**Commit sugerido:** `fix(sigeco): simplify Facebook capture source`

### 2026-07-29 — Tarea 2 — Staging Completamente Aislado

**Estado anterior:** Pendiente.

**Estado nuevo:** En progreso.

**Responsable:** equipo técnico.

#### Resultado Implementado Localmente

- Validación central de `APP_ENV`, URLs, base, schema Payload, storage, comunicaciones y analytics.
- El build, Prisma y Payload se niegan a usar una configuración de staging incompleta o mezclada con producción.
- `.env.staging.example` documenta únicamente placeholders y recursos exclusivos.
- Vercel Blob usa `STAGING_BLOB_READ_WRITE_TOKEN` y el prefijo remoto `staging/`;
  producción conserva `BLOB_READ_WRITE_TOKEN`.
- La marca persistente `STAGING · DATOS SINTÉTICOS · CONTACTOS BLOQUEADOS` aparece en sitio público, SIGECO y Payload.
- WhatsApp, llamadas, SMS y correo quedan neutralizados; no basta con ocultar la marca.
- `/api/leads` rechaza datos de contacto que no sean sintéticos cuando corre en staging.
- Analytics y verificación productiva se rechazan en staging.
- El seed crea cuentas QA para los siete roles vigentes, cinco pacientes sintéticos, bandejas operativas, seguimiento e inventario.
- Los correos usan el dominio reservado `.invalid`; el rol deprecado `captacion` no recibe cuenta.
- El reset requiere `CONFIRM_STAGING_RESET=RESET-SIGECO-STAGING` y restaura el estado sintético.
- Creada la guía [staging.md](../../operations/staging.md) con preparación, migración, seed, verificación, reinicio y prohibiciones.

#### Validación Ejecutada

- `pnpm env:check`: pasó para local.
- Configuración sintética completa de staging con `STAGING_BLOB_READ_WRITE_TOKEN`: pasó.
- El `.env.staging` privado ya supera ambiente, URL, base, schema y aislamiento;
  todavía espera el token real del store QA bajo el nuevo nombre.
- `pnpm lint`: pasó.
- `pnpm typecheck`: pasó.
- `pnpm test:unit`: pasó, 26 archivos y 97 pruebas.
- `pnpm run build`: pasó con 18 páginas estáticas.
- QA de navegador en `/sigeco/login`: marca visible a 390x844 y 1280x800, sin overflow horizontal.
- Al pulsar `Contactar soporte`, la URL no cambió y la marca mostró `CONTACTO REAL BLOQUEADO`.

#### Pendientes Para Cerrar

- Configurar variables y secretos por rama en Vercel.
- Activar control de acceso al deployment de staging.
- Ejecutar `pnpm staging:seed` y `pnpm staging:verify` contra los recursos reales.
- Entrar con las siete cuentas y verificar permisos.
- Subir media QA y confirmar que no aparece en el store productivo.
- El reset remoto no se ejecutó porque la migración pudo recuperarse sin borrar la base.

#### Ajuste Durante El Aprovisionamiento De Blob

- Vercel detectó que `BLOB_READ_WRITE_TOKEN` ya pertenece al store productivo.
- El store QA se crea con el prefijo personalizado `STAGING_BLOB`.
- SIGECO selecciona `STAGING_BLOB_READ_WRITE_TOKEN` únicamente en staging.
- Ya no es necesario copiar el token QA bajo el nombre productivo.
- Falta limitar el token QA a Preview de la rama `staging` y retirar el token
  productivo de cualquier alcance Preview general.

#### Recuperación De La Primera Migración Remota

- La primera ejecución de `pnpm staging:migrate` aplicó once migraciones y
  detectó correctamente un error en
  `20260729000000_general_facebook_capture_source`.
- La causa fue un nombre de tabla incorrecto: el SQL usaba `InternalLead`,
  pero el modelo y el historial crean la tabla `Lead`.
- Se corrigió la migración y se agregó
  `scripts/migration-files.test.ts` como prueba de regresión.
- Prisma marcó únicamente esa migración como revertida; no se reinició ni se
  borró la base de staging.
- La segunda ejecución aplicó la migración corregida y confirmó las doce
  migraciones instaladas.

**Commit sugerido:** `chore(sigeco): isolate staging environment`

## Cómo Actualizar El Progreso

Al iniciar:

1. Cambiar la tarea a `En progreso`.
2. Actualizar los conteos.
3. Registrar fecha, alcance y responsable.

Al terminar:

1. Verificar el gate definido en `tasks.md`.
2. Cambiar a `Terminada`.
3. Registrar archivos, migraciones, pruebas, QA web/móvil y pendientes.
4. Actualizar la documentación técnica afectada.

## Plantilla De Avance

```markdown
## AAAA-MM-DD — Tarea N — Nombre

Estado anterior:
Estado nuevo:
Responsable:

### Resultado

- Qué se implementó o decidió.

### Archivos Y Migraciones

- Archivos modificados.
- Migraciones o cambios de datos.

### Validación

- Lint, tipos, pruebas y build.
- Pruebas de permisos.
- QA web y móvil.

### Pendientes

- Riesgos, decisiones o trabajo posterior.
```
