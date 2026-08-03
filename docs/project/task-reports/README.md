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
| 2026-07-29 | [Tarea 9: consentimientos y preferencias de contacto](./2026-07-29-tarea-9-consentimientos-preferencias-contacto.md) | Separa finalidades, conserva la prueba exacta y bloquea contactos sin autorización vigente; T25 agregó la sexta. |
| 2026-07-29 | [Tarea 10: departamento y procedencia geográfica](./2026-07-29-tarea-10-departamento-procedencia-geografica.md) | Separa residencia y origen de visita, normaliza lugares y permite medir Cochabamba. |
| 2026-07-29 | [Tarea 11: fuentes de captación y atribución](./2026-07-29-tarea-11-fuentes-captacion-atribucion.md) | Conserva fuentes por llegada y compara cuentas verificadas, ventas e ingresos. |
| 2026-07-29 | [Tarea 12: duplicados y fusión de pacientes](./2026-07-29-tarea-12-duplicados-fusion-pacientes.md) | Detecta coincidencias y reúne expedientes sin borrar la ficha anterior. |
| 2026-07-29 | [Tarea 13: actualización de bandejas entre áreas](./2026-07-29-tarea-13-actualizacion-bandejas.md) | Actualiza las cuatro colas sin perder filtros, selección ni formularios en edición. |
| 2026-07-29 | [Tarea 14: resultado de la propuesta de tratamiento](./2026-07-29-tarea-14-resultado-propuesta-tratamiento.md) | Conserva la decisión médica y conecta aceptación, instrucción administrativa, venta y pago. |
| 2026-07-29 | [Tarea 15: tipos y resultados de seguimiento](./2026-07-29-tarea-15-tipos-resultados-seguimiento.md) | Separa propósito, responsable, prioridad, estado y resultado, con escalamiento real al médico. |
| 2026-07-30 | [Tarea 16: abandono, bloqueo y pendientes](./2026-07-30-tarea-16-abandono-bloqueo-pendientes.md) | Registra dónde se detuvo la visita y conserva el trabajo que todavía debe recuperarse. |
| 2026-07-30 | [Tarea 17: correcciones, cierre y firma clínica](./2026-07-30-tarea-17-correcciones-cierre-firma-clinica.md) | Finaliza consultas con autor y conserva cada corrección como una nueva versión comparable. |
| 2026-07-30 | [Tarea 18: Caja, dinero al personal, gastos y cierre](./2026-07-30-tarea-18-caja-dinero-personal-gastos-cierre.md) | Abre y concilia Caja, registra egresos estructurados y corrige mediante movimientos compensatorios. |
| 2026-07-30 | [Tarea 19: catálogo de productos y proveedores](./2026-07-30-tarea-19-catalogo-productos-proveedores.md) | Versiona productos y proveedores, protege códigos y separa costos, disponibilidad y permisos. |
| 2026-07-30 | [Tarea 20: compras, recepciones, lotes y stock](./2026-07-30-tarea-20-compras-recepciones-lotes-stock.md) | Enlaza orden, pago, recepción, lote y movimiento sin duplicar dinero ni stock. |
| 2026-07-30 | [Tarea 21: recetas y comprobantes versionados](./2026-07-30-tarea-21-recetas-comprobantes-versionados.md) | Emite documentos inmutables desde la receta, venta y pagos vigentes. |
| 2026-07-30 | [Tarea 22: reporte del recorrido completo](./2026-07-30-tarea-22-reporte-recorrido-completo.md) | Reconcilia llegada, consulta, propuesta, venta, cobro, seguimiento y retorno por visita. |
| 2026-07-30 | [Tarea 23: tiempo de atención por área](./2026-07-30-tarea-23-tiempo-atencion-area.md) | Separa espera, atención y bloqueo mediante eventos inmutables y percentiles. |
| 2026-08-01 | [Tarea 24: recordatorios automatizados y supervisados](./2026-08-01-tarea-24-recordatorios-supervisados.md) | Prepara contactos idempotentes con reglas versionadas, consentimiento y aprobación humana. |
| 2026-08-01 | [Tarea 25: encuestas y reclamos](./2026-08-01-tarea-25-encuestas-reclamos.md) | Recibe opiniones mediante enlaces privados y separa reclamos críticos con responsable y plazo. |
| 2026-08-01 | [Tarea 26: móvil y conectividad lenta](./2026-08-01-tarea-26-movil-conectividad-lenta.md) | Evita duplicados al reintentar, protege formularios sin conexión y define contingencia segura. |
| 2026-08-01 | [Tarea 27: integración segura Payload-SIGECO](./2026-08-01-tarea-27-integracion-payload-sigeco.md) | Deja campañas en Payload, atribución operativa en SIGECO y comparte únicamente métricas agregadas. |
| 2026-08-01 | [Tarea 28: multi-sucursal El Alto y Cochabamba](./2026-08-01-tarea-28-multi-sucursal-el-alto-cochabamba.md) | Separa sede activa, Caja, compras y stock sin duplicar el expediente del paciente. |
| 2026-08-02 | [Tarea 29: piloto completo con el personal](./2026-08-02-tarea-29-piloto-completo-personal.md) | Aprueba el ensayo técnico local y deja 30 casos reproducibles, datos, rutas, documentos, evidencia y firma para el piloto humano en El Alto. |
| 2026-08-02 | [Ajuste: edición de nombre y política de contraseñas](./2026-08-02-ajuste-usuarios-nombre-y-politica-contrasenas.md) | Permite corregir el nombre de una cuenta sin cerrar sesiones y baja la contraseña a mínimo 6 con mayúsculas, minúsculas, números y rechazo de claves inseguras vía @zxcvbn-ts. |
| 2026-08-02 | [Ajuste: sección "Consulta médica" colapsable](./2026-08-02-consulta-medica-colapsable.md) | Convierte la tarjeta de consulta en una sección colapsable que conserva visible el estado; plegada por defecto para que el médico la abra manualmente. |
| 2026-08-02 | [Ajuste: retiro del rol Seguimiento](./2026-08-02-retiro-rol-seguimiento.md) | Depreca el rol `seguimiento`, reasigna sus cuentas a Recepción por migración y deja el seguimiento de pacientes en Recepción sin permisos nuevos. |
| 2026-08-03 | [Tarea 1: catálogo de servicios y tratamientos](./2026-08-03-catalogo-servicios-tratamientos.md) | Catálogo administrable separado de Productos, con umbral de descuento por producto editable solo por Dirección/Super admin y versionado append-only. |
| 2026-08-03 | [Tarea 2: el médico arma el pedido](./2026-08-03-medico-arma-pedido.md) | El médico arma un pedido con líneas del catálogo/inventario o texto libre, con precio y descuento acotado por el tope duro, y lo envía a Administración sin cobrar. |
| 2026-08-03 | [Tarea 3: Administración confirma, valida descuento y cobra](./2026-08-03-administracion-confirma-cobra.md) | Convierte el pedido en venta multi-línea, aprueba o rechaza el descuento con auditoría, y cobra en Caja de forma idempotente. |
| 2026-08-03 | [Tarea 4: suero y servicio con pago previo antes de Enfermería](./2026-08-03-suero-pago-previo-enfermeria.md) | Marca las ofertas ejecutadas en Enfermería, exige pago antes de derivar y envía la orden e indicaciones a Enfermería de forma idempotente. |
| 2026-08-03 | [Tarea 5: sesiones de servicio](./2026-08-03-sesiones-de-servicio.md) | Paquetes de sesiones (suero/ozono) con modo paquete o por sesión, consumo por visita en Enfermería y conteo de pagadas/usadas/restantes con precios en fotografía. |
| 2026-08-03 | [Tarea 6: historial del paciente en la consulta](./2026-08-03-historial-paciente-consulta.md) | Muestra el resumen de cada visita anterior (diagnóstico, vendido, costo y sesiones) y precarga la receta rápida desde la consulta previa, solo lectura. |
| 2026-08-03 | [Tarea 7: seguimiento estricto por compra](./2026-08-03-seguimiento-estricto-por-compra.md) | El médico agenda seguimiento a Recepción (fecha, hora, motivo) solo si hay venta registrada en la visita; avisa y bloquea contacto sin consentimiento. |

## Relacion Con Estado V3

Para una vista consolidada, leer [Estado de implementacion V3](../v3-implementation-status.md). Los reportes de este directorio son la evidencia detallada de cada entrega.
