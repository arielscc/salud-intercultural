# Reporte De Cambios — Tarea 3: Auditoría Append-Only

## Fecha

2026-07-29.

## Objetivo

Permitir que Dirección conozca quién consultó o cambió información crítica en SIGECO, cuándo ocurrió y si la acción terminó correctamente, sin guardar secretos ni copiar historias clínicas en el historial.

## Cambios

- Se creó `AuditEvent` con actor, rol, acción, entidad, resultado, fecha, `requestId` y contexto permitido.
- PostgreSQL rechaza cualquier `UPDATE` o `DELETE` del historial mediante un trigger.
- Se creó una envoltura común que registra exactamente un evento de éxito, fallo o acceso denegado.
- Se auditan login, logout y cambios importantes de pacientes, visitas, consulta,
  enfermería, estudios, Caja, ventas, pagos, seguimiento e inventario.
- Se creó el permiso `audit_read`, exclusivo de Dirección y super administrador.
- Se agregó `/sigeco/auditoria` con filtros de escritorio y una vista móvil simplificada.
- El filtro de período reutiliza el calendario global `DateRangePickerField`.
- Se incorporó una limpieza defensiva que elimina contraseñas, tokens, texto clínico y archivos del contexto.

## Archivos Principales

- `prisma/schema.prisma`.
- `prisma/migrations/20260729130000_append_only_audit_events/migration.sql`.
- `src/modules/audit/service.ts`.
- `src/modules/audit/sanitize.ts`.
- `src/modules/audit/queries.ts`.
- `src/app/(internal)/sigeco/(app)/auditoria/page.tsx`.
- Server actions críticas de los módulos operativos vigentes.
- `docs/operations/audit-events.md`.

## Decisiones Técnicas

- Prisma/PostgreSQL es la única fuente de verdad; Payload no puede editar auditoría.
- La aplicación falla de forma cerrada si no puede insertar el evento.
- La navegación, búsquedas, filtros, paginación y apertura de fichas no generan
  eventos; continúan protegidos por permisos.
- Los eventos no almacenan notas clínicas, notas de enfermería, contraseñas, tokens o archivos.
- El rol se guarda como una fotografía del momento para conservar contexto histórico.
- Los usuarios con historia de auditoría se desactivan; la relación restringe su
  borrado para no alterar ni dejar sin actor eventos antiguos.
- Los módulos aún inexistentes —compras, adjuntos, reportes y exportaciones—
  deben adoptar el mismo servicio en sus tareas futuras. Usuarios y sesiones
  ya lo utilizan desde la Tarea 4.

## Validación

- `pnpm test`: 29 archivos y 109 pruebas unitarias aprobadas.
- `pnpm lint`: aprobado sin advertencias.
- `pnpm typecheck`: aprobado.
- `pnpm run build`: aprobado; `/sigeco/auditoria` fue reconocida como ruta dinámica.
- Prueba unitaria de un solo evento para éxito, fallo y acceso denegado.
- Prueba de cobertura que impide agregar una server action crítica sin auditoría
  y exige permisos en las lecturas excluidas.
- Pruebas de limpieza de secretos, contenido clínico y límites de tamaño.
- Prueba de migración que confirma el trigger append-only.
- Prueba de integración preparada para insertar un evento y rechazar su actualización y borrado.
- La integración local no se ejecutó porque `pnpm test:integration` reinicia
  irreversiblemente `salud_intercultural_test` en `localhost:5432` y Prisma
  exige consentimiento explícito del usuario para ese borrado. CI debe ejecutarla
  sobre su PostgreSQL efímero.

## Pendiente

- Ejecutar la prueba de integración contra PostgreSQL mediante CI.
- Aplicar la migración primero en staging y probar el visor con Dirección y super administrador.
- Realizar QA visual de `/sigeco/auditoria` en 390, 768, 1024, 1280 y 1440 px.
- Integrar compras, adjuntos, reportes y exportaciones cuando esos módulos sean implementados.

## Commit Sugerido

`feat(sigeco): add append-only audit events`
