# Tarea 8 (Dashboard del médico) — Catálogo Administrable De Estudios

Fecha: 2026-08-03. Entorno modificado: código y base local de `develop`.
Iniciativa: [Dashboard del médico](../sigeco-medico-dashboard/tasks.md). Depende
de la Tarea 1.

## Objetivo

Eliminar la lista fija de estudios del código y permitir que Administración
gestione nombres, precios y disponibilidad desde el catálogo de SIGECO, sin
cambiar el recorrido clínico existente.

## Resultado

- `ServiceCatalogKind` incorpora `study` y el catálogo permite crear, editar,
  filtrar, activar y desactivar estudios.
- Consulta y Recepción cargan únicamente estudios activos desde la base de
  datos. Si no existe ninguno, el diálogo explica que Administración debe
  registrarlos en Catálogo.
- El formulario envía el identificador del estudio y su precio. El servidor
  rechaza selecciones duplicadas, inactivas, inexistentes o de otro tipo.
- La orden conserva el recorrido vigente: Médico o Recepción ordena →
  Administración cobra → Enfermería recibe únicamente después del pago.
- La venta y la orden clínica guardan el nombre y precio usados en ese momento;
  cambios posteriores del catálogo no alteran el registro histórico.
- Recepción recibe `service_catalog_read`, porque también puede iniciar el flujo
  de estudios desde la ficha de la visita.
- Se actualizaron las matrices automáticas de páginas, acciones y permisos para
  incluir el catálogo y las acciones del dashboard implementadas en las Tareas
  1–7.

## Migraciones

- `20260803210000_service_catalog_study_kind`: agrega el valor `study` al enum
  PostgreSQL en una transacción separada.
- `20260803210500_seed_study_catalog`: registra Hemograma, Hemograma +
  resonancia, Resonancia y Análisis de orina con los precios que antes estaban
  en el código. Usa códigos únicos y `ON CONFLICT DO NOTHING`.
- `20260803211000_seed_study_catalog_versions`: crea la versión inicial
  append-only de los cuatro estudios, sin duplicarla si ya existe.
- Las tres migraciones fueron aplicadas únicamente en
  `salud_intercultural_dev`. No se aplicaron en staging ni producción.

## Archivos Principales

- `prisma/schema.prisma` y las tres migraciones de la tarea.
- `src/features/service-catalog/`: formulario, etiquetas y validación del tipo
  `study`.
- `src/components/internal/PaidStudyOrderDialog.tsx`: selector alimentado por
  catálogo.
- `src/features/clinical-care/schemas/paid-study.schema.ts`: lista dinámica y
  validación de duplicados.
- `src/modules/database/queries/service-catalog.ts`: consulta de estudios
  activos.
- `src/modules/database/queries/paid-studies.ts`: validación en servidor y
  creación de orden/venta.
- Pantallas de Consulta, Recepción y Catálogo.
- Pruebas unitarias, de integración y fronteras de seguridad.

## Validación

- Prisma `format`, `validate` y `generate`: aprobados.
- Migraciones locales: 49 al día; cuatro versiones iniciales de estudio
  comprobadas en la base local.
- `pnpm lint`: aprobado.
- `pnpm typecheck`: aprobado.
- Prueba específica del formulario: 4/4 aprobadas.
- Suite unitaria acumulada: 363/363 aprobadas.
- `pnpm run build`: aprobado. Conserva una advertencia preexistente de trazado
  amplio en `purchase-documents/storage.ts`, sin fallo de compilación.
- `pnpm deps:check`: aprobado; cero vulnerabilidades nuevas altas o críticas.
- `pnpm security:gate:local`: aprobado; producción permanece bloqueada.
- QA autenticado de gstack aprobado en Catálogo, alta móvil de estudio y
  selector desde Consulta: cuatro estudios y precios correctos, controles
  accesibles y cero errores de consola. El reintento de Recepción quedó
  limitado por la sesión del navegador automatizado; comparte el mismo selector.
- `pnpm test:integration`: aprobado con autorización explícita contra
  únicamente `salud_intercultural_test`; 49 migraciones aplicadas, 23 archivos
  y 54 pruebas aprobadas. El caso nuevo demuestra catálogo → orden → bloqueo
  sin pago → pago → liberación a Enfermería.

## Recuperación

Las migraciones son aditivas. Si se requiere desactivar un estudio, se hace
desde Catálogo para conservar las órdenes y ventas históricas. No se debe borrar
el enum ni los registros históricos. Staging y producción requieren ejecución y
autorización separadas.

## Commit Sugerido

`feat(sigeco): make study catalog manageable`
