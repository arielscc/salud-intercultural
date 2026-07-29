# Progress — Mejoras Integrales De SIGECO

Última actualización: 2026-07-29.

Plan de ejecución: [tasks.md](./tasks.md)

## Estado General

Las tareas fueron reorganizadas según el orden real de implementación. El plan ahora comienza con CI y termina con el piloto completo del personal.

Las Tareas 1, 2, 3, 4, 5, 6 y 7 están en progreso. La Tarea 8 está terminada. CI, las barreras de aislamiento,
la auditoría, la administración de usuarios y los límites de privacidad están
implementados localmente. Los adjuntos clínicos privados ya tienen
implementación local. El backup cifrado y la restauración conjunta de
PostgreSQL y adjuntos están demostrados en bases locales aisladas. El simulacro
de incidentes y el gate técnico local también están aprobados, sin autorizar
producción. Las doce migraciones anteriores están en staging y las quince
migraciones actuales están aplicadas en desarrollo. Falta validar las tres
nuevas mediante CI y staging, completar QA autenticado, cerrar los pendientes
remotos antes de autorizar producción. Dirección ya aprobó el runbook y el
funcionamiento del gate de la Tarea 8.

## Resumen

| Estado | Cantidad |
| --- | ---: |
| Pendiente | 21 |
| En progreso | 7 |
| Bloqueada | 0 |
| Terminada | 1 |
| Descartada | 0 |

## Progreso Por Fase

| Fase | Tareas | Estado | Gate |
| --- | --- | --- | --- |
| 1. Base segura | 1-8 | En progreso | Tarea 8 aprobada; producción conserva bloqueos remotos |
| 2. Datos y flujo | 9-17 | Pendiente | Recorrido clínico íntegro y auditable |
| 3. Caja e inventario | 18-21 | Pendiente | Caja, compra y stock reconcilian |
| 4. Medición y continuidad | 22-27 | Pendiente | Indicadores reconciliados y móvil validado |
| 5. Expansión y piloto | 28-29 | Pendiente | Piloto de El Alto aprobado |

## Estado Por Tarea

| # | Tarea | Prioridad | Estado | Dependencias |
| --- | --- | --- | --- | --- |
| 1 | CI y control de dependencias | P0 | En progreso | Ninguna |
| 2 | Staging aislado | P0 | En progreso | 1 |
| 3 | Auditoría append-only | P0 | En progreso | 1-2 |
| 4 | Usuarios, roles y sesiones | P0 | En progreso | 3 |
| 5 | Permisos, privacidad, logs y secretos | P0 | En progreso | 3-4 |
| 6 | Adjuntos clínicos seguros | P0 | En progreso | 2-5 |
| 7 | Backup y restauración | P0 | En progreso | 2, 6 |
| 8 | Incidentes y gate de seguridad | P0 | Terminada | 1-7 |
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

Estado de las tareas de la base segura:

- **Tarea 1 — CI y control de dependencias:** pendiente de ejecución remota y protecciones.
- **Tarea 2 — Staging completamente aislado:** pendiente de seed, deployment y validación de cuentas.
- **Tarea 3 — Auditoría append-only:** implementación local terminada; pendiente de migración y QA remotos.
- **Tarea 4 — Usuarios, roles y sesiones:** implementación local terminada; pendiente de integración y QA en staging.
- **Tarea 5 — Permisos, privacidad, logs y secretos:** controles locales
  implementados; pendiente de verificación remota y QA negativo por rol.
- **Tarea 6 — Adjuntos clínicos seguros:** modelo, storage privado, permisos y
  UI implementados y probados localmente; pendiente de integración autorizada,
  QA negativo remoto por rol y Blob privado de staging.
- **Tarea 7 — Backup y restauración comprobada:** copia cifrada y restauración
  completa demostradas localmente; pendiente de aprobar y activar la estrategia
  remota de producción.
- **Tarea 8 — Respuesta a incidentes y gate de seguridad:** terminada; runbook,
  simulacro, gate técnico y aprobación de Dirección documentados. Producción
  sigue bloqueada por cinco evidencias remotas o humanas.

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

La Tarea 6 empezó por instrucción explícita de Dirección. El QA local autenticado
ya cubrió carga, lectura temporal y eliminación. La Tarea 7 ya incluye metadata
y contenido de adjuntos locales; su activación remota depende de contar con el
Blob clínico privado y las credenciales separadas aprobadas.

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

### 2026-07-29 — Tarea 3 — Auditoría Append-Only

**Estado anterior:** Pendiente.

**Estado nuevo:** En progreso.

**Responsables:** equipo técnico y Dirección.

#### Resultado Implementado Localmente

- Creado el modelo Prisma `AuditEvent` con actor, rol, acción, entidad, resultado,
  fecha, `requestId` y contexto operativo permitido.
- La migración agrega un trigger de PostgreSQL que rechaza `UPDATE` y `DELETE`.
- Creado un servicio común que registra exactamente un evento de éxito, fallo o
  acceso denegado para cada acción crítica.
- La limpieza defensiva elimina claves de contraseñas, tokens, sesiones, texto
  clínico, notas y archivos, además de limitar tamaño y profundidad.
- Cubiertos los flujos funcionales vigentes: sesiones, pacientes, visitas,
  consulta, enfermería, estudios, Caja, ventas, pagos, seguimiento e inventario.
- Por decisión operativa, solo se auditan acciones importantes. Búsquedas,
  apertura de fichas, listados, filtros, paginación y consulta del visor no
  generan eventos; conservan sus validaciones de permisos.
- Creado `audit_read`, disponible únicamente para Dirección y super administrador.
- Creado `/sigeco/auditoria` con filtros por fecha, persona, acción y entidad en
  escritorio, y tarjetas simplificadas con paginación en móvil.
- Documentada la forma obligatoria de incorporar auditoría en las siguientes tareas.

#### Archivos Y Migraciones

- Migración `20260729130000_append_only_audit_events`.
- Módulos nuevos en `src/modules/audit`.
- Visor nuevo en `src/app/(internal)/sigeco/(app)/auditoria`.
- Guía técnica [audit-events.md](../../operations/audit-events.md).
- Reporte [2026-07-29-tarea-3-auditoria-append-only.md](../task-reports/2026-07-29-tarea-3-auditoria-append-only.md).

#### Validación Ejecutada

- `pnpm test`: pasó, 29 archivos y 109 pruebas unitarias.
- `pnpm lint`: pasó sin advertencias.
- `pnpm typecheck`: pasó.
- `pnpm run build`: pasó y generó `/sigeco/auditoria` como ruta dinámica.
- Pruebas de exactamente un evento para éxito, fallo y denegación.
- Prueba de cobertura que impide dejar una server action crítica sin auditoría
  y exige autorización en las lecturas excluidas.
- Pruebas de exclusión de secretos, texto clínico y archivos.
- Prueba estática del trigger append-only.
- Prueba de integración preparada para demostrar que PostgreSQL permite insertar,
  pero rechaza actualizar y borrar.
- La integración local quedó detenida por la protección de Prisma: el comando
  necesita reiniciar irreversiblemente la base de pruebas
  `salud_intercultural_test` en `localhost:5432` y requiere consentimiento
  explícito. CI la ejecutará en PostgreSQL efímero.

#### Pendientes Para Cerrar

- Ejecutar `pnpm test:integration` en CI con PostgreSQL 16.
- Aplicar la nueva migración en staging.
- Probar el visor con Dirección y super administrador y confirmar la denegación al resto.
- Completar QA responsive en 390, 768, 1024, 1280 y 1440 px.
- Compras, adjuntos, reportes y exportaciones se auditarán cuando se
  implementen sus módulos en las tareas correspondientes.

**Commit sugerido:** `feat(sigeco): add append-only audit events`

### 2026-07-29 — Tarea 4 — Usuarios, Roles Y Sesiones

**Estado anterior:** Pendiente.

**Estado nuevo:** En progreso.

**Responsable:** Super administrador y equipo técnico.

#### Resultado Implementado Localmente

- Creado `users_manage`, exclusivo de `super_admin`; todos los demás roles
  conservan únicamente la gestión de su propia cuenta.
- Creada `/sigeco/usuarios` para altas y revisión general en escritorio.
- Creada `/sigeco/usuarios/[userId]` para rol, estado, último acceso,
  desbloqueo, cambio obligatorio y revocación de sesiones.
- Creada `/sigeco/mi-cuenta` para contraseña y sesiones propias, usable en móvil.
- Creada `/sigeco/cambiar-contrasena` para primer ingreso o cambio forzado.
- Las cuentas nuevas usan contraseña temporal de al menos 12 caracteres y no
  acceden a módulos hasta reemplazarla.
- El bloqueo de cambio obligatorio también se aplica a server actions.
- Cambiar rol o estado revoca sesiones; desactivar una cuenta corta su acceso.
- Nadie puede cambiar su propio rol o desactivarse.
- El último super administrador activo no puede desactivarse ni degradarse.
- `captacion` sigue visible solo para migrar registros antiguos y nunca puede
  asignarse a una cuenta nueva.
- Las sesiones guardan una etiqueta breve de dispositivo, sin user-agent completo
  ni dirección IP.
- Creación, acceso, desbloqueo, contraseñas y revocaciones generan auditoría.

#### Archivos Y Migraciones

- Migración `20260729160000_manage_internal_users_sessions`, aplicada en desarrollo.
- Actions auditadas en `src/features/internal-auth/user-management-actions.ts`.
- Reglas transaccionales en `src/modules/database/queries/internal-users.ts`.
- Guía [internal-users-sessions.md](../../operations/internal-users-sessions.md).
- Reporte [2026-07-29-tarea-4-usuarios-roles-sesiones.md](../task-reports/2026-07-29-tarea-4-usuarios-roles-sesiones.md).

#### Validación Ejecutada

- `pnpm test`: 33 archivos y 123 pruebas unitarias aprobadas.
- `pnpm lint`: pasó sin advertencias.
- `pnpm typecheck`: pasó.
- `pnpm run build`: pasó; usuarios, Mi cuenta y cambio obligatorio son rutas dinámicas.
- Matriz negativa confirma que únicamente `super_admin` posee `users_manage`.
- Pruebas de rol deprecado, contraseña temporal, confirmación, etiquetas de
  dispositivo y bloqueo por cambio obligatorio.
- Pruebas de integración preparadas para último administrador, cambio propio,
  revocación inmediata y rol deprecado.

#### Pendientes Para Cerrar

- Ejecutar `pnpm test:integration` en CI con PostgreSQL 16 efímero.
- Aplicar la migración en staging y verificar las siete cuentas QA.
- Probar creación, cambio de rol, desactivación, desbloqueo y revocación.
- Completar QA autenticado en 390, 768, 1024, 1280 y 1440 px.

**Commit sugerido:** `feat(sigeco): manage users roles and sessions`

### 2026-07-29 — Tarea 5 — Permisos, Privacidad, Logs Y Secretos

**Estado anterior:** Pendiente.

**Estado nuevo:** En progreso.

**Responsables:** equipo técnico y Dirección.

#### Resultado Implementado Localmente

- Documentada la matriz de acceso por rol y módulo.
- Todas las páginas de datos y las 38 server actions actuales tienen una
  política automatizada de permiso.
- La navegación se contrasta con el permiso exigido por el servidor.
- La búsqueda global de pacientes se oculta sin `patients_read`.
- Login, duplicados, búsqueda de pacientes y errores de stock dejaron de
  incluir datos sensibles en URLs.
- SIGECO, Payload Admin y API usan `no-store`, `no-referrer` y `noindex`.
- Prisma no imprime consultas y los scripts omiten mensajes libres que podrían
  contener credenciales o datos personales.
- Staging y producción exigen un `PAYLOAD_SECRET` fuerte de al menos 32 caracteres.
- El JSON-LD escapa contenido administrable para evitar inyección.
- Todas las acciones de GitHub están fijadas a commits inmutables.
- Payload, marketing y analytics no importan consultas clínicas.
- Propietarios y procedimientos de rotación de secretos quedaron documentados.

#### Archivos Y Documentación

- Pruebas en `scripts/security-boundaries.test.ts`,
  `scripts/privacy-controls.test.ts` y `scripts/secret-policy.test.ts`.
- Guía [permissions-privacy-secrets.md](../../operations/permissions-privacy-secrets.md).
- Reporte
  [2026-07-29-tarea-5-permisos-privacidad-logs-secretos.md](../task-reports/2026-07-29-tarea-5-permisos-privacidad-logs-secretos.md).
- No requiere una migración nueva.

#### Validación Ejecutada

- Pruebas específicas: 5 archivos y 32 pruebas aprobadas.
- Suite completa: 37 archivos y 143 pruebas aprobadas.
- `pnpm lint`, `pnpm typecheck` y `pnpm run build`: aprobados.
- `pnpm staging:check`: aprobado con base, storage y Blob de staging,
  comunicaciones bloqueadas y analytics deshabilitado.
- `pnpm deps:check`: 0 vulnerabilidades altas o críticas; 4 bajas y 14 moderadas.

#### Pendientes Para Cerrar

- Ejecutar integración y los cinco jobs en CI.
- Verificar headers en el deployment de staging.
- Entrar con los siete roles QA y probar navegación visible y URL directa.
- Confirmar en Vercel propietario y fecha de rotación de cada secreto.
- Rotar `PAYLOAD_SECRET` si algún despliegue remoto utilizó el fallback anterior.

**Commit sugerido:** `test(sigeco): enforce privacy and permission boundaries`

### 2026-07-29 — Tarea 6 — Adjuntos Clínicos Seguros

**Estado anterior:** Pendiente.

**Estado nuevo:** En progreso.

**Responsables:** equipo técnico y Dirección.

#### Resultado Implementado Localmente

- Unificadas las estructuras anteriores de adjuntos en un modelo clínico privado
  relacionado con paciente, visita, estudio, usuario que sube y usuario que
  elimina.
- Añadidos permisos separados para ver, subir y eliminar archivos.
- Los archivos locales se guardan fuera de `public/`, con rutas opacas, directorios
  `0700` y archivos `0600`.
- Staging y producción quedan obligados a usar un Blob Store privado distinto del
  almacenamiento editorial de Payload.
- Cada archivo se valida por tamaño, nombre, extensión, MIME, firma real,
  estructura básica, marcador EICAR y SHA-256 antes de quedar disponible.
- Cada lectura exige sesión, permiso, mismo origen y una concesión aleatoria de
  dos minutos, un solo uso y vinculada al usuario.
- Subida, lectura, rechazo y eliminación controlada generan auditoría sin guardar
  tokens, nombres originales, checksum o texto clínico.
- La ficha del paciente permite carga múltiple, progreso individual, cámara,
  compresión de JPG, reintento idempotente, vista previa y descarga.
- La eliminación borra el objeto privado, invalida concesiones y conserva la
  metadata histórica como `deleted`.

#### Archivos Y Documentación

- Migración `20260729140000_secure_clinical_attachments`.
- Módulo `src/modules/clinical-attachments/`.
- API privada `src/app/(internal)/sigeco/api/clinical-attachments/`.
- Interfaz `src/components/internal/clinical-attachments/ClinicalAttachmentsPanel.tsx`.
- Guía [clinical-attachments.md](../../operations/clinical-attachments.md).
- Reporte
  [2026-07-29-tarea-6-adjuntos-clinicos-seguros.md](../task-reports/2026-07-29-tarea-6-adjuntos-clinicos-seguros.md).

#### Validación Ejecutada

- Migración aplicada únicamente a la base local de desarrollo.
- Suite unitaria: 39 archivos y 160 pruebas aprobadas.
- `pnpm lint`, `pnpm typecheck`, `pnpm env:check`, `prisma validate` y
  `pnpm run build`: aprobados.
- `pnpm deps:check`: sin vulnerabilidades altas o críticas; permanecen 4 bajas
  y 14 moderadas.
- QA autenticado local en escritorio y móvil: carga, progreso, previsualización,
  descarga autorizada, eliminación y ausencia de desbordamiento horizontal.
- Petición anónima a la concesión temporal: rechazada con `401`.
- Pruebas automatizadas cubren tipos falsificados, PDF truncado, EICAR, exceso
  de tamaño, traversal, idempotencia, concesión de un uso y relaciones cruzadas.

#### Pendientes Para Cerrar

- Ejecutar `pnpm test:integration` cuando Dirección autorice el reinicio
  destructivo de la base exclusiva `salud_intercultural_test`.
- Crear Blob Stores clínicos privados y separados para staging y producción.
- Aplicar la migración y validar con los roles QA en staging.
- Validar la exportación y restauración de metadata y objetos desde el Blob
  clínico privado cuando se active el procedimiento remoto de la Tarea 7.
- Evaluar un motor antimalware real antes de describir los archivos como
  “analizados por antivirus”.

**Commit sugerido:** `feat(sigeco): secure clinical attachments`

### 2026-07-29 — Tarea 7 — Backup Y Restauración Comprobada

**Estado anterior:** Pendiente.

**Estado nuevo:** En progreso.

**Responsables:** equipo técnico y Dirección.

#### Resultado Implementado Localmente

- Definidos RPO de 6 horas y RTO de 4 horas.
- Implementado un paquete coordinado con PostgreSQL, adjuntos clínicos y
  manifiesto de conteos, migraciones, tamaños y SHA-256.
- `pg_dump`, los conteos y la metadata usan el mismo snapshot consistente de
  PostgreSQL; una diferencia con los objetos físicos bloquea la copia.
- El paquete se cifra y autentica con AES-256-GCM y una clave derivada mediante
  `scrypt`; la clave no aparece en argumentos ni logs.
- La creación rechaza bases remotas, staging y producción.
- La restauración solo acepta una base local vacía con nombre controlado,
  directorio vacío y confirmación exacta.
- La comprobación posterior compara pacientes, visitas, Caja, inventario,
  usuarios por rol, auditoría, metadata y contenido de adjuntos.
- Programado un simulacro sintético mensual en GitHub Actions y una ejecución
  manual trimestral por otra persona autorizada.
- Documentadas frecuencia, retención, separación de credenciales, responsables
  y pasos de activación remota.

#### Archivos Y Documentación

- Implementación y pruebas en `scripts/backup/`.
- Comandos `backup:create:local`, `backup:restore:local` y
  `backup:drill:local`.
- Workflow `.github/workflows/backup-restore-drill.yml`.
- Guía [backup-restore.md](../../operations/backup-restore.md).
- Reporte
  [2026-07-29-tarea-7-backup-restauracion-comprobada.md](../task-reports/2026-07-29-tarea-7-backup-restauracion-comprobada.md).
- No requiere una migración nueva.

#### Validación Ejecutada

- Simulacro final `ms6gm2gq_cf63188f` aprobado únicamente en PostgreSQL local.
- Aplicadas y restauradas 15 migraciones en dos bases sintéticas aisladas.
- Backup: 407 ms; restauración y verificación: 2.507 ms; total: 8.091 ms.
- Verificados un paciente, una visita, Caja por Bs 125, un producto con stock
  7, un `super_admin`, un evento de auditoría y un adjunto clínico.
- Cifrado autenticado, checksum y limpieza de texto plano: aprobados.
- Evidencia privada con permisos `0700/0600`.
- Las dos bases efímeras fueron eliminadas y se confirmó que no quedaron
  destinos temporales.
- Pruebas focalizadas: 3 archivos y 23 pruebas aprobadas.
- Suite completa: 41 archivos y 179 pruebas aprobadas.
- `pnpm lint`, `pnpm typecheck`, `pnpm env:check`, `prisma validate`,
  `git diff --check` y `pnpm run build`: aprobados.
- `pnpm deps:check`: sin vulnerabilidades altas o críticas; permanecen 4 bajas
  y 14 moderadas.
#### Pendientes Para Cerrar

- Aprobar RPO, RTO, retención y responsables con Dirección.
- Activar historial o snapshots adecuados en Neon.
- Configurar un destino de backup externo y separado.
- Crear credenciales exclusivas de lectura, almacenamiento y restauración.
- Implementar la exportación paginada del Blob clínico privado.
- Restaurar una copia real en infraestructura remota aislada y firmar el
  resultado.
- Observar la primera ejecución mensual del nuevo workflow.

**Commit sugerido:** `docs(ops): prove sigeco backup and restore`

### 2026-07-29 — Tarea 8 — Respuesta A Incidentes Y Gate De Seguridad

**Estado anterior:** En progreso.

**Estado nuevo:** Terminada.

**Responsables:** equipo técnico y Dirección.

#### Resultado Implementado Localmente

- Creado un runbook para acceso indebido, teléfono perdido, pérdida de datos,
  malware, indisponibilidad y secreto expuesto.
- Definidas severidades, responsables, evidencia mínima, comunicación,
  contención, recuperación y revisión posterior.
- Implementado un simulacro local con dos sesiones sintéticas, revocación,
  cambio obligatorio de contraseña y auditoría append-only.
- El mismo ejercicio ejecuta el backup y la restauración cifrada de la Tarea 7.
- Implementado un gate local que exige evidencia menor a 90 días, artefactos de
  las Tareas 1–8, pruebas de seguridad y dependencias sin altas o críticas.
- El gate local nunca aprueba producción; conserva cinco bloqueos remotos o
  humanos visibles.
- La auditoría CSO local no confirmó hallazgos críticos ni altos.
- Dirección aprobó expresamente el runbook y el gate de la Tarea 8 sin
  autorizar producción.

#### Archivos Y Documentación

- Scripts y pruebas en `scripts/security/`.
- Comandos `security:incident:drill:local` y `security:gate:local`.
- Guía [incident-response.md](../../operations/incident-response.md).
- Reporte
  [2026-07-29-tarea-8-respuesta-incidentes-gate-seguridad.md](../task-reports/2026-07-29-tarea-8-respuesta-incidentes-gate-seguridad.md).
- Aprobación estructurada
  [task-8-approval.json](../security-gate/task-8-approval.json).
- No requiere una migración nueva.

#### Validación Ejecutada

- Simulacro `ms6hi8bf_ad569853` aprobado únicamente en PostgreSQL local.
- Dos sesiones revocadas, cero restantes y cambio de contraseña exigido.
- Contención: 19 ms; auditoría append-only protegida.
- Restauradas 15 migraciones y un adjunto; recuperación: 2.576 ms.
- Duración completa del simulacro: 14.333 ms.
- No quedaron bases temporales; evidencia con permisos `0700/0600`.
- Gate local aprobado con `criticalOrHighFindings=0`,
  `taskImplementationApproval=true`, `productionApproval=false` y cinco
  bloqueos remotos.
- Pruebas focalizadas: 4 archivos y 40 pruebas aprobadas.
- Suite completa: 42 archivos y 203 pruebas aprobadas.
- `pnpm lint`, `pnpm typecheck`, `pnpm env:check`, `prisma validate`,
  `git diff --check` y `pnpm run build`: aprobados.
- `pnpm deps:check`: sin vulnerabilidades altas o críticas; permanecen 4 bajas
  y 14 moderadas.
- `pnpm test:integration` no es un criterio de cierre de esta tarea y requiere
  consentimiento textual específico porque reinicia la base exclusiva
  `salud_intercultural_test`. La protección no se omitió y no se reinició
  ninguna base.

#### Bloqueos Que Permanecen Para Producción

- Confirmar los cinco checks remotos y branch protection.
- Cerrar QA de siete roles, headers y secretos en staging.
- Probar Blob clínico privado, auditoría y revocación remotamente.
- Restaurar y firmar una copia real fuera de producción.
- Completar propietarios y fechas de rotación.
- Ejecutar la integración cuando exista el consentimiento textual nuevo que
  Prisma exige para reiniciar `salud_intercultural_test`.

Estos puntos no reabren la Tarea 8. El gate los conserva visibles y bloquea
producción hasta que las tareas responsables aporten evidencia y Dirección
emita una autorización posterior.

**Commit sugerido:** `docs(ops): complete sigeco security readiness`

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
