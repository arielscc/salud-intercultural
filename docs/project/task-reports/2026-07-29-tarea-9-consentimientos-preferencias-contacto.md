# Reporte De Cambios — Tarea 9: Consentimientos Y Preferencias De Contacto

## Fecha

2026-07-29.

## Objetivo

Separar las decisiones del paciente por finalidad, demostrar qué texto aceptó
y bloquear nuevos contactos remotos cuando no exista autorización vigente.

## Cambios

- Se añadieron cinco finalidades independientes: seguimiento, recordatorios,
  educación, promociones e imagen/voz.
- Cada evento conserva decisión, fecha, canales, forma de confirmación, versión,
  texto exacto, responsable y evento anterior.
- Los registros son append-only en PostgreSQL. El retiro crea un evento nuevo.
- Solo Recepción y Super administrador pueden registrar decisiones; los demás
  roles autorizados consultan sin escribir.
- La ficha muestra estado actual, explicación breve, retiro y un historial
  filtrable con el texto exacto.
- La antigua preferencia genérica dejó de preguntarse y editarse. Sus valores
  positivos no se interpretan como consentimiento.
- Una antigua negativa `no_contact` se migra como negativa segura de seguimiento.
- Seguimiento muestra únicamente llamada o WhatsApp autorizados. El servidor
  vuelve a validar dentro de la transacción antes de guardar el intento.
- El detalle de visita dejó de ofrecer una llamada directa ambigua; muestra el
  número como dato y dirige el contacto saliente al flujo validado de Seguimiento.
- Las acciones de contacto denegadas quedan en auditoría con una razón técnica.

## Textos

Dirección aprobó la versión `v1` para desarrollo y staging. El sistema guarda
una copia exacta del texto en cada decisión, por lo que una versión futura no
reescribe el pasado.

La aprobación para producción está pendiente por instrucción expresa de
Dirección. El ambiente productivo no pasa su validación sin
`PATIENT_CONSENT_PRODUCTION_TEXT_VERSION=v1`, y la operación vuelve a comprobar
la misma condición.

## Base De Datos

- Migración `20260729170000_patient_consents`.
- Tabla `PatientConsent` con restricciones de finalidad, decisión y canales.
- Trigger que rechaza `UPDATE` y `DELETE`.
- Nuevos permisos `patient_consents_read` y `patient_consents_write`.
- Migración aplicada únicamente en `salud_intercultural_dev`.
- No se utilizó staging ni producción.

## Validación

- `pnpm test:unit`: 45 archivos y 215 pruebas aprobadas.
- `pnpm typecheck`: aprobado.
- `pnpm lint`: aprobado.
- `pnpm run build` en modo CI: aprobado.
- `prisma validate` y `git diff --check`: aprobados.
- `prisma migrate deploy`: 16 migraciones aplicadas en desarrollo local.
- `pnpm test:integration`: preparado pero no ejecutado, porque reinicia
  `salud_intercultural_test` y requiere una autorización textual nueva.
- QA autenticado local con rol Recepción:
  - autorización de seguimiento únicamente por WhatsApp;
  - retiro posterior conservando ambos eventos y el texto exacto;
  - cambio visible del estado a `Retirado`;
  - tarea posterior con solo el método `Presencial`;
  - llamada y WhatsApp ausentes después del retiro;
  - cero errores de consola;
  - escritorio de 1440 × 900 y móvil de 390 × 844 sin desbordamiento horizontal.
- Revisión `cso` de solo lectura: sin hallazgos críticos o altos; detectó el
  acceso directo de llamada en una visita y se cerró el gap antes de finalizar.

Para esta prueba se creó `qa-consentimientos@local.invalid`, con rol Recepción,
y se utilizaron un paciente y una tarea identificados como QA en desarrollo.

## Pendientes

- Ejecutar integración cuando el usuario autorice expresamente reiniciar la
  base exclusiva de test.
- Probar los roles Recepción, Dirección y Seguimiento en staging.
- Revisar los cinco textos antes de producción y recibir autorización expresa
  de Dirección.
- Configurar la variable productiva solo después de esa aprobación.

La implementación local queda **en progreso** hasta cerrar integración y QA.
Producción permanece bloqueada.

## Nota De Privacidad

La implementación técnica ayuda a separar finalidades y conservar evidencia,
pero no sustituye la revisión legal o profesional aplicable al tratamiento de
datos personales, clínicos, imagen o voz.

## Commit Sugerido

`feat(sigeco): separate patient consents`
