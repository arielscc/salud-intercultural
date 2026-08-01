# Integración Segura Payload-SIGECO

Esta guía define cómo relacionar campañas de Marketing con llegadas e ingresos
sin entregar pacientes ni datos clínicos a Payload.

## Propiedad De Los Datos

| Dato | Fuente de verdad | Copia permitida |
| --- | --- | --- |
| Contenido y campañas | Payload | SIGECO conserva una copia técnica de la campaña para atribución histórica. |
| Leads anteriores a la llegada | Payload | SIGECO recibe únicamente el código de evidencia cuando la persona llega. |
| Pacientes, visitas, atención, ventas y pagos | SIGECO | Payload no recibe registros individuales. |
| Indicadores de campaña | SIGECO, derivados | Payload recibe solo grupos agregados aprobados. |

Las campañas se crean y editan en `/admin/collections/marketing-campaigns`.
La pantalla `/sigeco/atribucion` muestra la copia sincronizada, pero ya no
permite crear, activar o desactivar campañas.

## Datos Permitidos

De Payload hacia SIGECO:

- identificador externo y fecha de revisión;
- código y nombre de campaña;
- código de fuente;
- nombre público de la cuenta y usuario público;
- tipo orgánico, pagado o no identificado;
- estado y fechas de vigencia.

De SIGECO hacia Payload:

- período consultado;
- total agregado de llegadas, ventas e ingresos cobrados;
- código de campaña y los mismos tres totales por campaña.

Nunca se envían nombres, teléfonos, correos, identificadores de paciente o
visita, diagnósticos, síntomas, recetas, tratamientos, notas ni archivos. Un
grupo con menos de cinco llegadas se oculta para reducir la posibilidad de
identificar a una persona.

## Contrato Y Seguridad

- `POST /api/integrations/payload-sigeco/campaigns` recibe una campaña.
- `GET /api/integrations/payload-sigeco/metrics?from=AAAA-MM-DD&to=AAAA-MM-DD`
  entrega indicadores agregados.
- Ambos usan `Authorization: Bearer <token>`.
- El token vive en `PAYLOAD_SIGECO_INTEGRATION_SECRET`, tiene 32 o más
  caracteres y nunca puede ser igual a `PAYLOAD_SECRET`.
- Las respuestas usan `private, no-store` y no revelan errores internos.
- El cuerpo de campaña admite como máximo 16 KB y rechaza campos no definidos.
- Cada contrato admite 60 solicitudes por minuto y el reporte un máximo de 366
  días.

## Reintentos

La identidad técnica es `externalId + revision`. Reenviar la misma revisión no
crea otra campaña ni reescribe una versión más reciente.

Para un consumidor externo se recomienda reintentar después de 1, 5, 30, 120 y
600 segundos, con un máximo de cinco intentos. Los códigos HTTP `429` y `503`
son reintentables; `401`, `413` y `422` requieren corregir configuración o
datos. Payload guarda primero su campaña y el hook de sincronización no cancela
ese guardado si SIGECO está temporalmente indisponible.

## Llegada Con Payload Caído

Recepción nunca vuelve a crear la llegada. Si Payload no responde:

1. SIGECO registra al paciente y la visita normalmente.
2. Conserva la fuente que la persona indicó, por ejemplo Facebook o TikTok.
3. Informa que la campaña exacta quedó pendiente.
4. Marketing o TI concilia después el código; no se inventa una cuenta ni se
   repite la visita.

La captura manual de fuente es el respaldo oficial tanto en web como en móvil.

## Auditoría

SIGECO registra como eventos importantes:

- creación o actualización de una copia de campaña;
- desactivación derivada de una eliminación en Payload;
- exportación de métricas, período, supresión y cantidad de grupos.

El token y los errores internos nunca entran al historial.

## Activación Por Ambiente

Local quedó inicializado con `TIKTOK-DR`, `TIKTOK-DRA`, `FACEBOOK-CLINICA` y
`WEB-FORM`.

Antes de staging o producción:

1. generar un token exclusivo con `openssl rand -base64 32`;
2. configurar `PAYLOAD_SIGECO_INTEGRATION_SECRET` solo en ese ambiente;
3. aplicar la migración Prisma;
4. actualizar el esquema y seed de Payload;
5. confirmar que las campañas aparecen como sincronizadas;
6. probar una falla de Payload y una exportación con grupos pequeños;
7. pedir autorización antes de tocar producción.

