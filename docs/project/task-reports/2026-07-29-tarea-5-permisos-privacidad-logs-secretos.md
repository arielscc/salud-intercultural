# Reporte De Cambios — Tarea 5: Permisos, Privacidad, Logs Y Secretos

## Fecha

2026-07-29.

## Objetivo

Comprobar que las rutas alternativas de SIGECO no revelen datos prohibidos y
dejar controles automáticos para páginas, acciones, roles, logs y secretos.

## Hallazgos Corregidos

- Payload podía usar un secreto público de desarrollo si faltaba
  `PAYLOAD_SECRET`.
- El login, los duplicados, las búsquedas de pacientes y los errores de stock
  incluían información sensible en URLs.
- El contenido de FAQs y servicios podía cerrar el script JSON-LD.
- Las acciones de GitHub usaban etiquetas mutables.

## Cambios

- Staging y producción exigen `PAYLOAD_SECRET` de 32 o más caracteres y
  rechazan valores de ejemplo.
- Las búsquedas de pacientes usan acciones autenticadas sin escribir el texto
  en la URL.
- Los redirects conservan únicamente códigos controlados e identificadores opacos.
- SIGECO, Payload Admin y las API usan `no-store`, `no-referrer` y `noindex`.
- Prisma dejó de imprimir consultas y usa formato mínimo de errores.
- Los scripts ya no imprimen emails, nombres de pacientes o mensajes completos
  de excepciones.
- JSON-LD escapa contenido CMS antes de insertarlo en un elemento `script`.
- GitHub Actions quedó fijado a commits completos.
- Se agregó una matriz de permisos y pruebas negativas para todos los roles.
- Se comprobó que Payload, marketing y analytics no importen consultas clínicas.
- Se documentó propietario, ambiente y rotación de cada secreto.

## Archivos Principales

- `scripts/security-boundaries.test.ts`.
- `scripts/privacy-controls.test.ts`.
- `scripts/secret-policy.test.ts`.
- `src/lib/deployment-environment.ts`.
- `src/lib/structured-data.ts`.
- `next.config.mjs`.
- `docs/operations/permissions-privacy-secrets.md`.

## Decisiones Técnicas

- La autorización se mantiene en el servidor; la navegación solo refleja la
  misma matriz.
- Identificadores CUID pueden aparecer en rutas; los datos humanos y clínicos no.
- Las búsquedas de pacientes devuelven resultados por una acción con
  `patients_read`, no mediante query strings.
- Payload conserva leads y contenido público, pero no accede a tablas clínicas.
- Los adjuntos y exportaciones clínicas continúan fuera de alcance hasta la
  Tarea 6.
- Los logs sacrifican detalle libre para evitar filtrar credenciales o pacientes;
  la investigación usa operación, código y request ID.

## Validación

- Pruebas específicas de seguridad: 5 archivos y 32 pruebas aprobadas.
- Suite completa: 37 archivos y 143 pruebas aprobadas.
- `pnpm lint`, `pnpm typecheck` y `pnpm run build`: aprobados.
- `pnpm staging:check`: aprobado con base, storage y Blob identificados como
  staging, comunicaciones bloqueadas y analytics deshabilitado.
- Auditoría de dependencias: 0 vulnerabilidades altas o críticas; permanecen
  4 bajas y 14 moderadas.

## Pendiente

- Ejecutar la suite de integración en PostgreSQL efímero mediante CI.
- Verificar los headers desplegados en staging.
- Probar cada rol QA contra navegación y URLs directas.
- Rotar `PAYLOAD_SECRET` si algún despliegue remoto llegó a usar el fallback.
- Confirmar en Vercel el propietario humano de cada secreto de producción.

## Commit Sugerido

`test(sigeco): enforce privacy and permission boundaries`
