# Tarea 6: Leads, Campañas Y Entradas Públicas

## Fecha

2026-09-09.

## Objetivo

Asignar toda captación a una sede verificable antes de almacenar información
de contacto y evitar que campañas, leads o métricas mezclen sucursales.

## Cambios Implementados

- `Lead`, intentos, recordatorios e historial exigen `branchCode`; sus hijos
  usan relaciones compuestas con el lead de la misma sede.
- `CaptureCampaign` continúa global y `CaptureCampaignBranch` materializa sus
  asignaciones. Leads y atribuciones solo pueden usar una campaña asignada a
  su sede.
- `VisitAttribution` y sus touches llevan la sede de la visita. El dashboard
  `/sigeco/atribucion`, catálogos, métricas y exportación Payload-SIGECO filtran
  la sucursal antes de agregar.
- El formulario público resuelve la sede por prueba de campaña firmada,
  hostname configurado o configuración fija del despliegue. No acepta una sede
  editable del cuerpo y no persiste PII cuando no logra verificarla.
- Idempotencia, deduplicación y rate limit incorporan la sucursal. Payload
  guarda ownership inmutable y limita a cada editor a su sede configurada.
- La conversión a paciente nuevo valida la sede del lead; para una identidad
  existente se agregó una operación que crea solamente el expediente local de
  esa sede.
- Las campañas de Payload exigen al menos una sucursal existente y sincronizan
  sus asignaciones activas/inactivas con Prisma.

## Migración Y Reconciliación

- `20260909150000_lead_campaign_branch_scope` agrega la estructura y deriva
  únicamente atribuciones desde visitas y leads con evidencia consistente.
- `pnpm branch:reconcile:leads` y
  `pnpm branch:reconcile:payload-leads` generan reportes sin PII, funcionan en
  dry-run y requieren confirmación explícita para escribir.
- `20260909160000_harden_lead_campaign_branch_scope` bloquea `NOT NULL` ante
  cualquier pendiente y agrega FKs compuestas para impedir cruces.
- No se ejecutaron migraciones ni se modificó ninguna base de datos.

## Configuración Requerida

Cada despliegue público debe configurar al menos una vía de resolución:
`PUBLIC_LEAD_HOST_BRANCH_MAP`, `PUBLIC_LEAD_FORM_BRANCH_CODE` o enlaces firmados
con `PUBLIC_LEAD_BRANCH_SIGNING_SECRET`. Los ejemplos locales declaran su sede;
staging permanece vacío hasta que Operaciones elija el ownership correcto.

## Validación

- El detector reconoce 103 modelos: 21 maestros globales, 80 operaciones
  locales, un evento de plataforma y una lectura controlada entre sedes. La
  deuda temporal bajó a 54 modelos; los seis ownerships resueltos por esta tarea
  ya no son excepciones.
- `pnpm lint`: aprobado sin errores.
- `pnpm typecheck`: aprobado; regeneró Prisma/Payload, validó TypeScript y el
  detector confirmó los 103 modelos clasificados.
- Ambos comandos mostraron una advertencia de entorno porque el proyecto exige
  Node 22 y la sesión actual usa Node 24.19.0; no produjo errores de validación.
- La suite completa, migraciones reales y QA de navegador se reservan para la
  Tarea 17 conforme a la política del proyecto.

**Commit sugerido:** `feat(sigeco): scope leads and campaigns by branch`
