# Progress — Mejoras Integrales De SIGECO

Última actualización: 2026-07-28.

Plan de ejecución: [tasks.md](./tasks.md)

## Estado General

Las tareas fueron reorganizadas según el orden real de implementación. El plan ahora comienza con CI y termina con el piloto completo del personal.

Todavía no se implementó código funcional de estas nuevas tareas. La reorganización, numeración, dependencias y referencias documentales sí están terminadas.

## Resumen

| Estado | Cantidad |
| --- | ---: |
| Pendiente | 29 |
| En progreso | 0 |
| Bloqueada | 0 |
| Terminada | 0 |
| Descartada | 0 |

## Progreso Por Fase

| Fase | Tareas | Estado | Gate |
| --- | --- | --- | --- |
| 1. Base segura | 1-8 | Pendiente | Dirección aprueba seguridad e incidentes |
| 2. Datos y flujo | 9-17 | Pendiente | Recorrido clínico íntegro y auditable |
| 3. Caja e inventario | 18-21 | Pendiente | Caja, compra y stock reconcilian |
| 4. Medición y continuidad | 22-27 | Pendiente | Indicadores reconciliados y móvil validado |
| 5. Expansión y piloto | 28-29 | Pendiente | Piloto de El Alto aprobado |

## Estado Por Tarea

| # | Tarea | Prioridad | Estado | Dependencias |
| --- | --- | --- | --- | --- |
| 1 | CI y control de dependencias | P0 | Pendiente | Ninguna |
| 2 | Staging aislado | P0 | Pendiente | 1 |
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

La primera tarea es la **Tarea 1 — CI y control de dependencias**.

Documento aplicable: [tasks.md](./tasks.md), sección “Tarea 1 — CI y control de dependencias”.

Antes de comenzar:

- Confirmar la rama que se protegerá.
- Revisar el plan existente de GitHub Actions.
- Ejecutar localmente lint, tipos, unitarias, integración y build.
- Confirmar que las pruebas usan una base aislada.

Después se continúa de forma secuencial con la Tarea 2.

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
