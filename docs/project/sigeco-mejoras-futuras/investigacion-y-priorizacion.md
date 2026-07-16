# Investigacion Y Priorizacion De Mejoras Futuras De Sigeco

Fecha: 2026-07-16.

Estado: evaluacion inicial posterior al cierre de Sigeco V3.7, movil primero y desktop complementario.

## Objetivo

Definir el siguiente backlog de Sigeco a partir del sistema que realmente existe, sin repetir tareas ya cerradas ni saltar prematuramente a portal del paciente, telemedicina, inteligencia artificial o multi-sucursal.

La evaluacion cubre sitio publico, CMS, Sigeco web/desktop, Sigeco movil, modelo Prisma, permisos, server actions, queries, pruebas, deploy y documentacion operativa.

## Baseline Revisado

Capacidades ya implementadas y fuera de este backlog:

- Autenticacion interna, sesiones, bloqueo por intentos y permisos por rol.
- Recepcion integrada: paciente, llegada, visita, ruta flexible y deteccion inicial de duplicados.
- Consulta, diagnosticos, tratamiento, receta estructurada, evoluciones y ordenes clinicas.
- Enfermeria, signos vitales, aplicaciones, notas y estudios.
- Caja: ventas, pagos, saldos, movimientos y rollback por stock insuficiente.
- Seguimientos, intentos, estados, consentimiento basico de contacto y bandeja por vencimiento.
- Inventario, movimientos, ajustes, stock minimo y alertas.
- Dashboard operativo, paginacion, loading, feedback y confirmaciones.
- UX movil cerrada y UX desktop complementaria cerrada, con QA responsive y por rol.
- Suite unitaria/integracion, migraciones seguras y build reproducible local.

## Hallazgos Del Proyecto

### Bloqueantes Reales

1. No existe un log append-only transversal. Hay historiales por dominio, pero no una auditoria comun de lectura, escritura, permisos, login, exportacion y acceso a adjuntos.
2. Existen modelos `StudyAttachment` y `ClinicalAttachment`, pero no storage seguro, autorizacion de descarga, retencion, antivirus ni UI operativa.
3. Los permisos estan codificados y probados, pero no hay administracion de usuarios, revocacion de sesiones, revision periodica ni reporte de accesos.
4. La documentacion define backup y deploy, pero falta un simulacro registrado de restauracion y respuesta a incidentes con RPO/RTO aprobados.
5. La edicion de paciente no reutiliza la deteccion de telefono duplicado del funnel ni existe fusion segura de fichas.

### Contratos Parciales Aprovechables

- `CashMovement` existe y se genera, pero no hay cierre de caja, conciliacion, devolucion o anulacion formal.
- `Supplier` ya se relaciona con inventario, pero no hay compras, recepciones, costo, lote ni vencimiento.
- `FollowUpTemplate` existe sin UI ni reglas automatizadas.
- `InventoryAlert` existe, pero falta ciclo operativo de resolucion y reposicion.
- Receta, venta y pago tienen datos suficientes para documentos imprimibles, pero no existe generacion versionada.
- Las bandejas se revalidan despues de acciones propias, pero no reciben cambios de otras estaciones en tiempo cercano a real.

### Brechas De Producto

- No hay agenda de citas, recordatorios ni gestion de inasistencia.
- No hay reportes operativos/clinicos/financieros exportables pese a existir `reports_read`.
- No existe modo degradado para conectividad inestable.
- No hay contrato de interoperabilidad; el modelo interno no esta mapeado a recursos clinicos estandar.

## Fundamento Externo

- La [guia 2025 de OMS sobre madurez de ciberseguridad y privacidad](https://www.who.int/europe/publications/i/item/WHO-EURO-2025-11827-51599-78854) recomienda evaluar riesgos y priorizar mitigaciones segun el contexto del sistema de informacion de salud. Esto fundamenta seguridad, privacidad y continuidad antes de ampliar funcionalidades.
- [HL7 FHIR R5 AuditEvent](https://www.hl7.org/fhir/R5/auditevent.html) modela actor, paciente, encuentro, accion, resultado, fuente y momento del evento. Sirve como referencia conceptual para la auditoria interna, sin obligar a exponer una API FHIR ahora.
- [HL7 FHIR Provenance](https://hl7.org/fhir/provenance.html) diferencia procedencia del registro de auditoria y vincula cambios con agentes y recursos. Esto fundamenta correcciones clinicas versionadas en vez de sobrescritura silenciosa.
- El [modulo de seguridad y privacidad de FHIR](https://www.hl7.org/fhir/secpriv-module.html) separa control de acceso, consentimiento, auditoria y procedencia; Sigeco debe tratarlos como contratos distintos.
- La [guia de contingencia NIST SP 800-34](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final) relaciona backup, recuperacion, respuesta a incidentes y continuidad operativa. Tener backups no equivale a demostrar restauracion.

Estas fuentes son referencias de diseno y control, no afirmaciones de cumplimiento legal. Antes de produccion clinica amplia se requiere revision legal local sobre privacidad, historia clinica, retencion, firma, receta y consentimiento en Bolivia.

## Principios De Priorizacion

1. Seguridad y recuperabilidad antes de nueva superficie funcional.
2. Integridad clinica antes de automatizacion.
3. Completar modelos parciales antes de crear dominios nuevos.
4. Una sola fuente de verdad para web y movil; los breakpoints solo cambian presentacion.
5. Toda escritura critica debe ser transaccional, autorizada, auditable e idempotente cuando corresponda.
6. Ninguna automatizacion contacta pacientes sin reglas, consentimiento y posibilidad de exclusion.
7. Reportes y exportaciones son acceso a datos: requieren permiso y auditoria, no solo un boton de descarga.
8. Interoperabilidad empieza con vocabulario y mapeo; no con publicar una API sin gobernanza.

## Orden De Inversion Recomendado

### Fase 0 - Preparar Operacion Segura

CI/staging, dependencias, auditoria, usuarios/sesiones, privacidad, backup/restauracion y adjuntos.

### Fase 1 - Integridad Del Registro

Duplicados/fusion, correcciones clinicas, firma o cierre y documentos imprimibles.

### Fase 2 - Operacion Coordinada

Actualizacion de bandejas, caja, proveedores/compras, inventario avanzado y seguimientos regidos por consentimiento.

### Fase 3 - Expansion De Servicio

Agenda, reportes, modo degradado e interoperabilidad.

## Funcionalidades No Priorizadas Ahora

- Portal del paciente: requiere primero consentimiento, adjuntos, auditoria y recuperacion de cuenta.
- Telemedicina: agrega identidad remota, consentimiento, video y documentacion clinica especifica.
- IA clinica o generativa: requiere calidad de datos, gobernanza, evaluacion de riesgo y supervision humana.
- Multi-sucursal: requiere ownership por sede, cierres de caja, stock, usuarios y reportes segmentados.
- Facturacion fiscal o aseguradoras: requiere reglas legales y contables aun no documentadas.

