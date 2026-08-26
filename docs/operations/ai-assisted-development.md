# Desarrollo Asistido Con Skills

Guia para usar skills de gstack y Codex en Salud Intercultural sin perder el control tecnico, funcional ni clinico del proyecto.

## Contexto Del Proyecto

El proyecto ya tiene una trayectoria clara:

- V1: sitio web institucional implementado.
- V2: CMS, marketing, SEO, leads publicos, Payload, PostgreSQL, media, analytics y operacion base implementados.
- V3: Sigeco, el sistema interno clinico-operativo, implementado localmente hasta inventario.

El presente tecnico es V3 sobre un monolito modular Next.js App Router. Payload sigue siendo la fuente de verdad para contenido publico y CMS. Prisma/PostgreSQL es la fuente de verdad para datos operativos transaccionales: usuarios internos, leads internos, pacientes, visitas, consultas, estudios, enfermeria, ventas, cobros, seguimientos e inventario.

El futuro definido en los documentos maestros avanza hacia ERP clinico, automatizaciones, portal del paciente, multi-sucursal, telemedicina, IA y plataforma nacional. No se debe saltar a esas fases sin cerrar primero trazabilidad, permisos, auditoria, QA mobile y calidad operativa de V3.

## Fuentes De Verdad

Antes de iniciar una tarea, revisar el documento que corresponde:

- Producto y negocio V3: `docs/masters/Documento_de_Negocio_V3_0.md`.
- Vision de largo plazo V1-V8: `docs/masters/Documento_Maestro_Estratégico.md`.
- Roadmap tecnico V3: `docs/project/v3-technical-implementation.md`.
- Ownership Payload vs Prisma: `docs/architecture/data-ownership.md`.
- Operacion local, testing y deploy: `docs/operations/README.md`.
- Cierre historico por entrega: `docs/project/task-reports/`.

## Instalacion Actual

gstack quedo instalado globalmente para Codex:

```txt
~/.gstack/repos/gstack
~/.codex/skills/gstack-*
```

Version instalada:

```txt
1.58.5.0
```

Reiniciar Codex para que la sesion cargue todas las skills nuevas. Algunas ya estaban disponibles antes por symlinks de otro proyecto, pero ahora apuntan a una instalacion persistente propia en `~/.gstack/repos/gstack`.

## Skills Recomendadas

### Planificacion

Usar estas antes de tocar codigo cuando la tarea cambie flujo clinico, datos, permisos, UX o alcance V3.

| Skill | Cuándo usarla | Por qué importa aqui |
| --- | --- | --- |
| `gstack-spec` | Convertir una idea ambigua en especificacion ejecutable. | Evita construir pantallas que no resuelven el flujo real de la clinica. |
| `gstack-plan-ceo-review` | Revisar alcance, prioridad y valor para la clinica. | Mantiene el foco en paciente, trazabilidad y operacion diaria. |
| `gstack-plan-eng-review` | Revisar arquitectura, datos, transacciones, permisos y tests antes de implementar. | Protege Prisma, migraciones, rutas activas, ventas, inventario y datos clinicos. |
| `gstack-plan-design-review` | Revisar flujos mobile-first antes de construir UI. | La clinica opera principalmente desde Android; 390px es viewport base. |
| `gstack-autoplan` | Ejecutar revision combinada CEO, diseno, ingenieria y DX en tareas grandes. | Util para nuevas fases tipo auditoria, realtime, compras o dashboard de direccion. |

### Implementacion Y Debugging

| Skill | Cuándo usarla | Por qué importa aqui |
| --- | --- | --- |
| `gstack-investigate` | Cualquier bug, error de build, login, DB, permisos o fallo de UI. | Obliga a encontrar causa raiz antes de aplicar fixes. |
| `gstack-guard` | Cambios delicados en Prisma, migraciones, permisos, auth o datos clinicos. | Activa cuidado y limita el alcance de edicion. |
| `gstack-careful` | Antes de comandos destructivos o sensibles. | Reduce riesgo con DB local, staging, produccion y git. |
| `gstack-freeze` / `gstack-unfreeze` | Debugging o cambios concentrados en un modulo. | Evita que un fix pequeño termine tocando medio sistema. |
| `gstack-context-save` / `gstack-context-restore` | Pausar y retomar trabajo largo. | Conserva decisiones, estado Git y pendientes entre sesiones. |

### Calidad, Revision Y QA

| Skill | Cuándo usarla | Por qué importa aqui |
| --- | --- | --- |
| `gstack-health` | Al cerrar una tarea o antes de promover. | Agrupa checks de calidad y detecta regresiones temprano. |
| `gstack-review` | Antes de commit, PR o merge. | Busca bugs de produccion que pueden pasar CI, especialmente permisos, transacciones y estados. |
| `gstack-qa-only` | Cuando se necesita reporte sin modificar codigo. | Bueno para auditorias de Sigeco antes de decidir fixes. |
| `gstack-qa` | Cuando se quiere probar y corregir bugs encontrados. | Abre navegador real, reproduce flujos y verifica fixes. |
| `gstack-browse` | Dogfooding rapido de rutas y screenshots. | Validar `/sigeco` en mobile 390px, formularios, auth y estados. |
| `gstack-design-review` | Auditoria visual de UI ya implementada. | Detecta problemas de jerarquia, espaciado, mobile y experiencia operativa. |
| `gstack-cso` | Cambios de auth, roles, permisos, datos clinicos, analytics o deploy. | Revisa seguridad tipo OWASP/STRIDE y privacidad de PII/clinica. |
| `gstack-benchmark` | Cambios en sitio publico o performance. | Protege Core Web Vitals, peso JS, LCP, CLS e INP. |

### Release Y Documentacion

| Skill | Cuándo usarla | Por qué importa aqui |
| --- | --- | --- |
| `gstack-ship` | Preparar commit/PR con checks, revision y changelog. | Encaja con el flujo `develop -> staging -> main`. |
| `gstack-setup-deploy` | Una vez para configurar deploy verificable. | Permite que land/deploy conozca plataforma, URL y health checks. |
| `gstack-land-and-deploy` | Despues de PR aprobado, merge y verificacion de deploy. | Reduce riesgo de publicar sin validar staging/produccion. |
| `gstack-canary` | Despues de deploy productivo. | Vigila errores post-release en rutas clave. |
| `gstack-document-release` | Al cerrar una entrega grande. | Mantiene docs, task reports y estado alineados al codigo. |
| `gstack-document-generate` | Crear docs tecnicas nuevas desde codigo existente. | Util para auditoria, permisos, inventario, realtime o compras. |
| `gstack-diagram` | Diagramar flujos complejos. | Bueno para ruta del paciente, ownership de datos y eventos entre areas. |

## Skills No Prioritarias Ahora

No son prioridad para este repo en su estado actual:

- Skills iOS (`gstack-ios-*`): no hay app nativa en V3.
- `gstack-supabase`: el proyecto usa PostgreSQL via Prisma/Payload, no Supabase como plataforma principal.
- `gstack-design-shotgun` y `gstack-design-html`: utiles para exploracion visual, pero Sigeco necesita UI operativa consistente, no variantes decorativas.
- `gstack-setup-gbrain` / `gstack-sync-gbrain`: opcionales si se quiere memoria semantica entre maquinas; no bloquean el desarrollo.

## Flujo Recomendado Por Tarea

### Tarea grande o nueva fase

1. Leer fuentes de verdad relevantes.
2. Ejecutar `gstack-spec` si el pedido es ambiguo.
3. Ejecutar `gstack-plan-ceo-review` para validar valor clinico/operativo.
4. Ejecutar `gstack-plan-eng-review` para datos, permisos, migraciones y tests.
5. Ejecutar `gstack-plan-design-review` si toca UI.
6. Implementar con cambios acotados.
7. Crear o actualizar task report en `docs/project/task-reports/`.

### Fix de bug

1. Ejecutar `gstack-investigate`.
2. Confirmar causa raiz.
3. Aplicar fix minimo.
4. Agregar test o verificacion equivalente.
5. Ejecutar checks relevantes.

### Cambio con datos, Prisma o permisos

1. Revisar `docs/architecture/data-ownership.md`.
2. Ejecutar `gstack-plan-eng-review` si cambia modelo o contrato.
3. Usar `gstack-guard` si hay riesgo de tocar mas archivos de los necesarios.
4. Ejecutar `pnpm test:integration`.
5. Ejecutar `gstack-cso` si toca datos clinicos, roles, sesiones o analytics.

### Cierre antes de staging

Ejecutar como minimo:

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm run build
```

Si toca DB o queries:

```bash
pnpm test:integration
```

Despues usar:

```txt
gstack-review
gstack-qa
```

Para UI interna, QA debe cubrir mobile 390px en:

- Login `/sigeco/login`.
- Dashboard `/sigeco`.
- Bandejas por area.
- Formularios de creacion/edicion.
- Estados loading, empty, error y success.
- Permisos server-side, no solo visibilidad de UI.

## Gates De Calidad Del Proyecto

Una entrega no deberia considerarse cerrada si falta alguno de estos puntos:

1. El cambio responde a una necesidad documentada de la clinica.
2. La fuente de verdad esta clara: Payload, Prisma o `src/data`.
3. Los permisos se validan en servidor.
4. No se expone PII ni informacion clinica en analytics, logs o roles indebidos.
5. Los formularios criticos funcionan en 390px.
6. Las mutaciones financieras, clinicas o de inventario corren en transacciones.
7. Hay tests unitarios para schemas/permisos y tests de integracion para queries criticas.
8. Hay task report con cambios, decisiones, validacion y pendientes.
9. Pasan lint, tests, typecheck y build.
10. Si se publica, staging fue validado antes de produccion.

## Cadencia Recomendada

- Cada feature V3: `spec` si hay ambiguedad, `plan-eng-review`, implementacion, `review`, `qa`, task report.
- Cada UI nueva: agregar `plan-design-review` antes y `design-review` despues.
- Cada flujo clinico o financiero: agregar `cso` y `test:integration`.
- Cada deploy: `ship`, staging, QA, `land-and-deploy`, `canary`.
- Cada pausa larga: `context-save`.
