# Task Reports

Registro de cambios por tarea.

Cada entrega de implementacion debe agregar aqui un documento `.md` con la lista de cambios implementados, archivos tocados, decisiones tecnicas, validacion y pendientes.

Ver la guia operativa en [Reportes de cambios por tarea](../../operations/task-change-reports.md).

## Reportes Actuales

| Fecha | Reporte | Resultado |
| --- | --- | --- |
| 2026-05-30 | [Regla de reportes de cambios](./2026-05-30-task-change-reports-rule.md) | Define el procedimiento obligatorio para documentar entregas. |
| 2026-05-30 | [Usuario de prueba local para Sigeco](./2026-05-30-sigeco-usuario-prueba-local.md) | Crea el primer `super_admin` local para probar `/sigeco`. |
| 2026-05-30 | [V3.1A CRM y leads internos](./2026-05-30-v3-1a-crm-leads-internos.md) | Login interno, roles, permisos, dashboard y pipeline de leads. |
| 2026-05-30 | [V3.1B pacientes, recepcion y visitas](./2026-05-30-v3-1b-pacientes-recepcion-visitas.md) | Ficha de paciente, visitas, check-in, ruta activa y tareas por area. |
| 2026-05-30 | [V3.2 atencion medica](./2026-05-30-v3-2-atencion-medica.md) | Consulta, diagnosticos, tratamiento, receta, evolucion e indicaciones. |
| 2026-05-30 | [V3.3 estudios y enfermeria](./2026-05-30-v3-3-estudios-enfermeria.md) | Estudios, signos vitales, aplicaciones, notas y ejecucion de tareas. |
| 2026-05-30 | [V3.4 administracion, ventas y cobros](./2026-05-30-v3-4-administracion-ventas-cobros.md) | Ventas, items, pagos, caja, comprobante y cronologia administrativa. |
| 2026-05-30 | [V3.5 seguimiento](./2026-05-30-v3-5-seguimiento.md) | Tareas de seguimiento, llamadas, resultados, vencimientos e historial. |
| 2026-05-30 | [V3.6 inventario](./2026-05-30-v3-6-inventario.md) | Productos, stock, movimientos, alertas y descuento automatico desde ventas. |
| 2026-07-03 | [Workflow de skills gstack](./2026-07-03-gstack-skills-workflow.md) | Instala y documenta skills para desarrollo, QA, seguridad y release. |
| 2026-07-03 | [Organizacion de documentacion y estado V3](./2026-07-03-documentacion-estado-v3.md) | Crea el tablero central de estado V3 y mejora la navegacion documental. |
| 2026-07-03 | [Guia de prueba flujo V3](./2026-07-03-guia-prueba-flujo-v3.md) | Documenta el QA manual end-to-end de Sigeco V3.1A a V3.6. |
| 2026-07-29 | [Tarea 3: auditoría append-only](./2026-07-29-tarea-3-auditoria-append-only.md) | Registra acciones críticas sin permitir edición o borrado. |
| 2026-07-29 | [Tarea 4: usuarios, roles y sesiones](./2026-07-29-tarea-4-usuarios-roles-sesiones.md) | Administra cuentas, accesos y sesiones internas. |
| 2026-07-29 | [Tarea 5: permisos, privacidad, logs y secretos](./2026-07-29-tarea-5-permisos-privacidad-logs-secretos.md) | Prueba límites por rol y evita fugas en URLs, logs, caché y configuración. |
| 2026-07-29 | [Tarea 6: adjuntos clínicos seguros](./2026-07-29-tarea-6-adjuntos-clinicos-seguros.md) | Guarda documentos privados con validación, permisos temporales y auditoría. |
| 2026-07-29 | [Tarea 7: backup y restauración comprobada](./2026-07-29-tarea-7-backup-restauracion-comprobada.md) | Cifra y restaura conjuntamente PostgreSQL y adjuntos en un entorno local aislado. |
| 2026-07-29 | [Tarea 8: respuesta a incidentes y gate de seguridad](./2026-07-29-tarea-8-respuesta-incidentes-gate-seguridad.md) | Prueba contención, auditoría y recuperación sin confundir el pase local con la aprobación productiva. |

## Relacion Con Estado V3

Para una vista consolidada, leer [Estado de implementacion V3](../v3-implementation-status.md). Los reportes de este directorio son la evidencia detallada de cada entrega.
