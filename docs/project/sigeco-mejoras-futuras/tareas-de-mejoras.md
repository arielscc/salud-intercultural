# Tareas De Mejoras Y Nuevas Funcionalidades De Sigeco

Estado: backlog propuesto y priorizado el 2026-07-16. Ninguna tarea esta iniciada.

Docs relacionados:

- Investigacion: `docs/project/sigeco-mejoras-futuras/investigacion-y-priorizacion.md`
- Progreso: `docs/project/sigeco-mejoras-futuras/progreso-de-mejoras.md`
- Estado V3: `docs/project/v3-implementation-status.md`
- Implementacion tecnica: `docs/project/v3-technical-implementation.md`
- Baseline movil: `docs/project/sigeco-movil/progreso-de-movil.md`
- Baseline desktop: `docs/project/sigeco-desktop/progreso-de-desktop.md`

## Reglas Transversales

1. Web y movil comparten negocio, permisos y datos. Cada tarea incluye QA en 390, 768, 1024, 1280 y 1440 px cuando tenga UI.
2. Toda migracion es aditiva, reversible operacionalmente y probada desde base vacia y copia restaurada.
3. Escrituras clinicas, financieras, permisos e inventario deben dejar auditoria append-only.
4. Archivos, exportaciones y reportes requieren autorizacion server-side y evento de auditoria.
5. No exponer datos sensibles en logs, URLs, analytics, toasts, nombres de archivos o errores.
6. Las automatizaciones se ejecutan con idempotencia, limites, reintentos y estado observable.
7. Cada tarea incluye unitarias, integracion, casos negativos por rol, build y QA funcional.
8. Las decisiones clinicas, legales, contables o de retencion requieren aprobacion de la clinica antes de implementar.
9. Docs y mensajes de commit en ASCII.

## Orden Recomendado

1, 2, 3, 4 y 5 son prerequisitos para uso clinico amplio. Despues: 6, 7, 8, 9, 10, 11 y 12. Las tareas 13-16 requieren validacion operativa previa.

## Tarea 1 - CI, Dependencias Y Staging Aislado

**Prioridad:** P0. **Tipo:** plataforma. **Dependencias:** ninguna.

**Objetivo:** convertir los checks locales en gates reproducibles antes de seguir ampliando Sigeco.

**Alcance:** resolver vulnerabilidades altas; implementar `.github/workflows/ci.yml` con lint, tipos, unitarias, PostgreSQL efimero, integracion, migraciones y build; preparar staging con base, storage, seeds y secretos separados; proteger `staging` y `main`.

**Criterios:** PR roto no puede promoverse; CI no accede a datos remotos; checkout limpio pasa; preview/staging se valida con cuenta QA y datos sinteticos.

**Commit sugerido:** `ci: add isolated quality and integration gates`

## Tarea 2 - Auditoria Append-Only Y Procedencia

**Prioridad:** P0. **Tipo:** seguridad/clinico. **Dependencias:** Tarea 1.

**Objetivo:** saber quien accedio o cambio que dato, cuando, desde donde y con que resultado.

**Alcance:** modelo inmutable de evento; actor/rol, accion, entidad, paciente/visita, before/after seguro o diff permitido, resultado, request ID, IP reducida y user-agent; cubrir login/logout, permisos, lecturas sensibles, writes clinicos, ruta, pagos, caja, inventario, usuarios, archivos y exportaciones; visor solo para rol autorizado.

**Fuera de alcance:** almacenar passwords, tokens, contenido completo de notas o archivos en el log.

**Criterios:** eventos no tienen update/delete desde la app; cada accion critica genera exactamente un evento dentro o junto a la transaccion; filtros por actor/paciente/fecha/accion; pruebas de no omision y no filtrado de secretos.

**Commit sugerido:** `feat(sigeco): add append-only audit trail`

## Tarea 3 - Usuarios, Sesiones Y Revision De Accesos

**Prioridad:** P0. **Tipo:** seguridad/administracion. **Dependencias:** Tarea 2.

**Objetivo:** administrar el ciclo de vida de acceso sin scripts manuales ni sesiones huerfanas.

**Alcance:** UI super_admin para crear/desactivar usuarios, asignar roles vigentes, forzar cambio de password, desbloquear, revocar sesiones y ver ultimo acceso; retirar `captacion` de ambientes; matriz negativa de permisos; politica de expiracion, rotacion de secretos y respuesta a acceso no autorizado.

**Criterios:** desactivar o revocar invalida acceso inmediatamente; no se puede eliminar el ultimo super_admin; cambios quedan auditados; ningun rol accede por URL a modulos no autorizados.

**Commit sugerido:** `feat(sigeco): manage users roles and sessions`

## Tarea 4 - Backup, Restauracion Y Respuesta A Incidentes

**Prioridad:** P0. **Tipo:** operaciones. **Dependencias:** Tarea 1.

**Objetivo:** demostrar que PostgreSQL y archivos clinicos pueden recuperarse dentro de tiempos aprobados.

**Alcance:** definir RPO/RTO; backups cifrados y retencion; restauracion en entorno aislado; verificacion de conteos, hashes y archivos; runbook de incidente, responsables, comunicacion, rotacion de secretos y postmortem; simulacro periodico registrado.

**Criterios:** restauracion completa desde backup real; evidencia de tiempos y checks; credenciales de restore separadas; runbook ejecutable por otra persona del equipo.

**Commit sugerido:** `docs(ops): prove backup restore and incident response`

## Tarea 5 - Adjuntos Clinicos Seguros

**Prioridad:** P0. **Tipo:** clinico/storage. **Dependencias:** Tareas 2-4.

**Objetivo:** habilitar resultados y documentos sin convertir URLs publicas en historia clinica.

**Alcance:** storage privado; upload autorizado; allowlist de MIME/tamano, nombre seguro, checksum y escaneo; descarga firmada corta; metadata, uploader, paciente/visita/estudio, retencion y eliminacion controlada; UI responsive para subir, listar, previsualizar y descargar; completar relaciones de `ClinicalAttachment`.

**Criterios:** acceso anonimo o rol incorrecto falla; URLs expiran; subida/lectura/eliminacion quedan auditadas; archivo malicioso/tipo no permitido se rechaza; backup/restore incluye metadata y blobs.

**Commit sugerido:** `feat(sigeco): add secure clinical attachments`

## Tarea 6 - Duplicados Y Fusion Segura De Pacientes

**Prioridad:** P1. **Tipo:** calidad de datos. **Dependencias:** Tarea 2.

**Objetivo:** prevenir duplicados al editar y consolidar fichas sin perder historia.

**Alcance:** normalizacion/busqueda por telefono, nombre y fecha; alertas al editar; cola de posibles duplicados; comparador campo a campo; fusion transaccional de visitas, contactos, notas, ventas, seguimientos, estudios y adjuntos; alias/redireccion de ficha fusionada.

**Criterios:** dry-run muestra impacto; fusion requiere permiso y confirmacion; no deja FKs huerfanas; es auditable y recuperable mediante evento de compensacion, no borrado silencioso.

**Commit sugerido:** `feat(sigeco): detect and merge duplicate patients`

## Tarea 7 - Correcciones Clinicas, Cierre Y Firma

**Prioridad:** P1. **Tipo:** integridad clinica. **Dependencias:** Tarea 2.

**Objetivo:** corregir errores sin sobrescribir la historia ni reabrir registros cerrados informalmente.

**Alcance:** estados borrador/final cuando la clinica los apruebe; autor y timestamp; correccion como nueva version con motivo; visualizacion de procedencia; bloqueo por rol; politica para consulta, receta, indicacion, estudio, signos y aplicacion.

**Criterios:** original permanece legible para auditoria; UI distingue vigente/corregido; solo rol autorizado corrige; documentos impresos indican version; casos concurrentes probados.

**Commit sugerido:** `feat(sigeco): version and sign clinical records`

## Tarea 8 - Actualizacion De Bandejas Entre Areas

**Prioridad:** P1. **Tipo:** operacion. **Dependencias:** Tareas 1-2.

**Objetivo:** evitar que recepcion, consulta, enfermeria y caja trabajen con colas obsoletas.

**Alcance:** empezar con polling visible y pausado en background; indicador de ultima actualizacion y refresh manual; preservar filtros/seleccion; evaluar SSE despues de medir; eventos de ruta, tarea, visita, pago y stock.

**Criterios:** un cambio de otra estacion aparece dentro del SLA acordado; no duplica requests ocultos en movil; no pierde formularios sucios; degradacion de red se comunica sin bloquear lectura.

**Commit sugerido:** `feat(sigeco): keep operational queues fresh`

## Tarea 9 - Receta Y Comprobante Imprimibles

**Prioridad:** P1. **Tipo:** documentos. **Dependencias:** Tareas 2 y 7.

**Objetivo:** generar documentos consistentes, versionados y auditables desde los datos existentes.

**Alcance:** decidir requisitos legales/clinicos; templates de receta y comprobante; identidad de clinica, paciente, profesional, fecha, items/totales y version; HTML print/PDF server-side; permisos y evento de generacion/descarga; responsive print preview.

**Criterios:** no se permite editar texto libre fuera del registro fuente; reimpresion identifica version; montos y receta coinciden con base; no se incluyen campos no aprobados.

**Commit sugerido:** `feat(sigeco): generate versioned clinical and payment documents`

## Tarea 10 - Cierre De Caja, Anulaciones Y Devoluciones

**Prioridad:** P1. **Tipo:** financiero. **Dependencias:** Tarea 2.

**Objetivo:** cerrar el ciclo financiero sin editar pagos o ventas historicos.

**Alcance:** apertura/cierre por usuario y turno; efectivo esperado/contado y diferencia; egresos aprobados; anulacion/devolucion como movimientos compensatorios; referencia y motivo; reporte de caja; permisos separados para cobrar, anular y cerrar.

**Criterios:** balance se deriva de movimientos; pagos no se borran; doble devolucion imposible; cierre concurrente bloqueado; toda diferencia/anulacion auditada.

**Commit sugerido:** `feat(sigeco): add cash reconciliation and reversals`

## Tarea 11 - Proveedores, Compras, Lotes Y Vencimientos

**Prioridad:** P1. **Tipo:** inventario. **Dependencias:** Tareas 2 y 10.

**Objetivo:** controlar entrada y riesgo de stock, no solo cantidad actual.

**Alcance:** UI de proveedores; orden/recepcion de compra; costo; lote y vencimiento cuando aplique; movimiento transaccional; alertas de reposicion/vencimiento; resolucion de `InventoryAlert`; devolucion a proveedor; politica FEFO como recomendacion, no automatismo inicial.

**Criterios:** recepcion actualiza stock una vez; lote/vencimiento trazable hasta salida; alertas pueden reconocerse/resolverse; no se vende stock vencido si la politica lo prohibe.

**Commit sugerido:** `feat(sigeco): add procurement batches and expiry control`

## Tarea 12 - Plantillas Y Automatizacion De Seguimiento

**Prioridad:** P1. **Tipo:** seguimiento. **Dependencias:** Tareas 2-3.

**Objetivo:** reducir trabajo repetitivo sin contactar a quien no dio consentimiento.

**Alcance:** UI de `FollowUpTemplate`; reglas aprobadas por evento/diagnostico/orden; creacion idempotente de tareas; asignacion, vencimiento y escalamiento; exclusion `no_contact`; preview antes de activar; registro de comunicacion y resultado.

**Criterios:** misma regla/evento no duplica tarea; no_contact bloquea automatizacion; cada regla tiene owner, version y estado; fallos/reintentos son visibles.

**Commit sugerido:** `feat(sigeco): automate consent-aware follow-ups`

## Tarea 13 - Agenda, Citas Y Recordatorios

**Prioridad:** P2. **Tipo:** nueva funcionalidad. **Dependencias:** Tareas 2, 3, 6 y 12.

**Objetivo:** planificar atencion futura sin confundir cita con llegada o visita clinica.

**Alcance:** cita separada de Visit; profesional/servicio/duracion/estado; calendario desktop y agenda movil; confirmar, reprogramar, cancelar, no-show y convertir a llegada; recordatorios con consentimiento; conflicto de horario server-side.

**Criterios:** doble reserva se rechaza transaccionalmente; reprogramacion conserva historia; llegada referencia cita; zona horaria America/La_Paz probada.

**Commit sugerido:** `feat(sigeco): add appointment scheduling and reminders`

## Tarea 14 - Reportes Y Exportaciones Gobernadas

**Prioridad:** P2. **Tipo:** analitica. **Dependencias:** Tareas 2, 3 y 10.

**Objetivo:** convertir `reports_read` en indicadores utiles sin exponer datos indiscriminadamente.

**Alcance:** definir metricas con owner y formula; volumen/tiempos/abandono, seguimientos, ingresos/saldos, stock/movimientos; filtros por periodo; CSV/PDF segun necesidad; minimizacion/anonimizacion; limites y procesamiento asincrono si crece.

**Criterios:** cada cifra reconcilia con query fuente; exportar requiere permiso y auditoria; archivos expiran; ningun reporte mezcla zona horaria o estados ambiguos.

**Commit sugerido:** `feat(sigeco): add governed reports and exports`

## Tarea 15 - Modo Degradado Para Conectividad Inestable

**Prioridad:** P2. **Tipo:** resiliencia/UX. **Dependencias:** Tareas 2, 4 y 8.

**Objetivo:** mantener lectura y captura controlada durante cortes breves sin crear conflictos silenciosos.

**Alcance:** medir conectividad real; banner online/offline; cache solo de shell/datos no sensibles aprobados; borradores locales cifrados o memoria segun riesgo; cola limitada de comandos idempotentes; reconciliacion explicita; nunca cachear adjuntos o historia completa por defecto.

**Criterios:** modo degradado visible; no promete guardado confirmado; reintento no duplica visita/pago/aplicacion; logout limpia datos locales; conflictos requieren decision del usuario.

**Commit sugerido:** `feat(sigeco): add safe degraded connectivity mode`

## Tarea 16 - Preparacion De Interoperabilidad FHIR

**Prioridad:** P3. **Tipo:** arquitectura. **Dependencias:** Tareas 2, 5-7 y 14.

**Objetivo:** preparar intercambio futuro sin acoplar el modelo interno prematuramente a una API publica.

**Alcance:** inventario de vocabularios; mapa Patient, Encounter, Observation, ServiceRequest, DiagnosticReport, MedicationRequest, AuditEvent, Provenance y DocumentReference; identificadores estables; CapabilityStatement objetivo; estrategia de consentimiento y seguridad; prototipo read-only con datos sinteticos.

**Criterios:** mapa documenta perdida/transformacion; ninguna API publica antes de threat model y autorizacion; round-trip de fixtures aprobado; version FHIR fijada y perfil jurisdiccional definido si existe.

**Commit sugerido:** `docs(architecture): define fhir interoperability readiness`

## Gate De Cierre Por Fase

Cada fase termina con lint, tipos, unitarias, integracion, migraciones desde cero, build, auditoria de permisos, QA web/movil, prueba de backup/restore cuando corresponda y actualizacion documental. No acumular todos los checks para el final de las 16 tareas.

