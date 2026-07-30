# Tarea 22 — Reporte Del Recorrido Completo

Fecha: 2026-07-30. Entorno modificado: desarrollo local.

## Resultado

- Se implementó un reporte de cohorte anclado a la llegada de cada visita.
- Una visita se cuenta una vez aunque cambie de área.
- Consulta, propuesta vigente, aceptación, compra, abandono, seguimiento y
  retorno se derivan de registros fuente.
- Cantidad de ventas, dinero vendido, cobrado y pendiente están separados.
- La tabla por fuente no duplica apoyos y conserva “Sin fuente registrada”.
- Se agregaron filtros por período, fuente, ciudad, médico y sucursal.
- Tendencias incluyen días sin actividad como cero.
- La tabla reconciliable enlaza cada cifra con sus visitas.
- Avisos de calidad detectan fuentes faltantes y ventas sin aceptación vigente.

## Web Y Móvil

- Dirección dispone de indicadores, embudo, tendencia y resultados por fuente.
- La vista móvil prioriza seis indicadores y filas tocables.
- La tabla de escritorio muestra procedencia, fuente, médico, recorrido y
  dinero.
- La paginación solo corta la tabla; los totales siempre usan todo el conjunto
  filtrado.

## Fórmula Y Ownership

- Unidad: `Visit`.
- Propietario: Dirección.
- Zona horaria: `America/La_Paz`.
- Período: fecha de llegada `checkedInAt`.
- Propuesta: únicamente el evento vigente.
- Ventas anuladas y ventas sin visita quedan fuera.
- La tabla por fuente mide generación de dinero, no rentabilidad neta sin costo
  de campaña distribuido.

## Datos Y Migración

- `Visit.branchCode` conserva la sucursal de llegada.
- Las visitas históricas usan `el-alto`.
- Nueva consulta `getPatientJourneyReport` con agregación pura y comprobable.
- Migración local `20260730205836_patient_journey_branch`.
- La gestión real de nuevas sucursales permanece en la Tarea 28.

## Validación Ejecutada

- Prisma generate y TypeScript: aprobados.
- Seguridad y agregación enfocada: 2 archivos, 14 pruebas aprobadas.
- Se agregó una prueba de integración reconciliable, reservada para el cierre
  acumulado.

## Pendientes Antes De Producción

- Ejecutar lint global, integración completa, build y QA gstack acumulado.
- Validar una muestra manual con Dirección.
- Probar filtros, tabla y gráficos en teléfonos reales.
- Confirmar sucursales y política para datos de prueba.
- Validar roles y cifras en staging.
- Avisar y pedir autorización expresa antes de tocar producción.

## Commit Sugerido

`feat(sigeco): report patient journey`
