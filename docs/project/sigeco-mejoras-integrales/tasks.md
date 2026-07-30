# Tasks — Mejoras Integrales De SIGECO

Estado: plan principal de ejecución reorganizado el 2026-07-28.

Este es el único archivo de tareas activas para las nuevas mejoras de SIGECO. La numeración representa el orden recomendado de implementación: la Tarea 1 se realiza primero y la Tarea 29 cierra el plan.

El plan conserva los 20 puntos operativos originales, incorpora las mejoras de Caja, gastos, compras e inventario, y absorbe las tareas técnicas importantes del backlog anterior.

Control de avance: [progress.md](./progress.md)

## Fuentes Utilizadas

### Documentación funcional

- [Documento inicial de negocio de SIGECO](../../masters/Documento_de_Negocio_V3_0.md)
- [Simplificación del flujo vigente](../sigeco-simplificacion/tareas-de-simplificacion.md)
- [Estado de implementación V3](../v3-implementation-status.md)

### Documentación técnica

- [Implementación técnica V3.7](../v3-technical-implementation.md)
- [Plan de GitHub Actions](../github-actions-implementation-plan.md)
- [Ownership de datos](../../architecture/data-ownership.md)
- [Auditoría append-only](../../operations/audit-events.md)
- [Usuarios, roles y sesiones](../../operations/internal-users-sessions.md)
- [Permisos, privacidad, logs y secretos](../../operations/permissions-privacy-secrets.md)
- [Reporte de Administración, ventas y cobros](../task-reports/2026-05-30-v3-4-administracion-ventas-cobros.md)
- [Caja, egresos y cierre diario](../../operations/cash-sessions-expenses-close.md)
- [Reporte de la Tarea 18](../task-reports/2026-07-30-tarea-18-caja-dinero-personal-gastos-cierre.md)
- [Reporte de inventario](../task-reports/2026-05-30-v3-6-inventario.md)
- [Catálogo de productos y proveedores](../../operations/product-catalog-suppliers.md)
- [Reporte de la Tarea 19](../task-reports/2026-07-30-tarea-19-catalogo-productos-proveedores.md)
- [Compras, recepciones, lotes y stock](../../operations/purchases-receipts-batches-stock.md)
- [Reporte de la Tarea 20](../task-reports/2026-07-30-tarea-20-compras-recepciones-lotes-stock.md)
- [Recetas y comprobantes versionados](../../operations/versioned-prescriptions-receipts.md)
- [Reporte de la Tarea 21](../task-reports/2026-07-30-tarea-21-recetas-comprobantes-versionados.md)
- [Backlog técnico anterior](../sigeco-mejoras-futuras/tareas-de-mejoras.md)
- [Investigación y priorización anterior](../sigeco-mejoras-futuras/investigacion-y-priorizacion.md)

### Implementación actual

- [Modelo Prisma](../../../prisma/schema.prisma)
- [Queries de ventas y cobros](../../../src/modules/database/queries/sales.ts)
- [Queries de sesiones, egresos y cierre](../../../src/modules/database/queries/cash.ts)
- [Queries de inventario](../../../src/modules/database/queries/inventory.ts)
- [Actions de inventario](../../../src/features/inventory/actions.ts)
- [Queries de compras y lotes](../../../src/modules/database/queries/purchases.ts)
- [Actions de compras y recepciones](../../../src/features/purchases/actions.ts)
- [Servicio de documentos versionados](../../../src/modules/generated-documents/service.ts)
- [Generación PDF](../../../src/modules/generated-documents/pdf.ts)
- [Actions de recetas y comprobantes](../../../src/features/generated-documents/actions.ts)

## Qué Existe Actualmente

SIGECO ya registra pacientes, visitas, consultas, ruta entre áreas, ventas,
pagos, sesiones y movimientos de Caja, egresos, conciliaciones, productos,
proveedores, versiones del catálogo, asociaciones múltiples, compras, pagos a
proveedores, recepciones parciales, lotes, movimientos de inventario, alertas y
seguimientos.

- Un cobro exige una Caja abierta y genera `Payment` y `CashMovement`.
- Los egresos guardan personas, autorización, motivo y detalle estructurado.
- Una venta inventariable descuenta stock.
- Las entradas y ajustes generan `InventoryMovement`.
- Una compra no aumenta stock; una recepción confirmada crea el lote y su
  entrada una sola vez.
- Los cambios de productos y proveedores crean versiones y no reutilizan el
  código interno.
- Los montos se almacenan en centavos.
- Una venta no puede dejar stock negativo.

Se debe ampliar esta base. No se reconstruyen ventas o inventario desde cero.

## Responsabilidades Que El Sistema Debe Respetar

- **Médico:** explica el tratamiento, responde dudas, registra el resultado de la propuesta y cierra la venta del tratamiento.
- **Administración:** registra cobros, egresos, dinero entregado al personal, compras, productos, entradas y cierre de Caja.
- **Recepción — Marlen:** registra llegadas, completa datos y realiza seguimiento de pacientes en tratamiento.
- **Comunicación — Yazmin:** responde llamadas y WhatsApp, informa, recupera visitas que no llegaron y apoya con recojos coordinados. No realiza seguimiento clínico, ventas, Caja o inventario.
- **Enfermería:** registra controles, estudios, aplicaciones y observaciones.
- **Dirección:** autoriza operaciones sensibles y revisa indicadores, diferencias y reportes.
- **Super administrador:** administra la plataforma y los accesos técnicos; no reemplaza autorizaciones de Dirección.

## Reglas Para Todas Las Tareas

1. No borrar historia clínica, financiera o de inventario. Las correcciones se registran con nuevas versiones o movimientos compensatorios.
2. Las migraciones son aditivas y se prueban desde una base vacía y una copia restaurada.
3. Los permisos se validan en servidor para páginas, queries, actions, archivos y exportaciones.
4. Las acciones críticas generan auditoría append-only.
5. No exponer información sensible en logs, URLs, analytics, errores, nombres de archivos o caché.
6. Web y móvil responsive comparten negocio, datos y permisos.
7. Validar UI en 390, 768, 1024, 1280 y 1440 px.
8. Móvil usa botones grandes, pocos campos visibles y teclados apropiados.
9. Escritorio aprovecha tablas, filtros, comparación, atajos e impresión.
10. Todo formulario muestra guardando, guardado o error. Nunca confirma antes de recibir respuesta del servidor.
11. Pagos, egresos, visitas, compras y movimientos de stock usan idempotencia cuando existe riesgo de reintento.
12. Dinero se calcula en servidor y se guarda en centavos.
13. Las fechas operativas usan `America/La_Paz`.
14. Cada tarea actualiza [progress.md](./progress.md).
15. Cada tarea incluye pruebas unitarias, integración cuando toca datos, casos negativos por rol, lint, tipos, build y QA funcional aplicables.

## Orden Por Fases

| Fase | Resultado | Tareas |
| --- | --- | --- |
| 1 | Base segura para desarrollar | 1-8 |
| 2 | Datos y flujo del paciente confiables | 9-17 |
| 3 | Caja, compras e inventario completos | 18-21 |
| 4 | Medición, continuidad y experiencia | 22-27 |
| 5 | Expansión y validación real | 28-29 |

---

## Fase 1 — Base Segura Para Desarrollar

## Tarea 1 — CI Y Control De Dependencias

**Prioridad:** P0. **Responsable:** equipo técnico. **Dependencias:** ninguna.

**Objetivo:** detectar automáticamente errores antes de continuar ampliando SIGECO.

**Alcance:**

- Revisar dependencias y resolver vulnerabilidades altas.
- Implementar CI con instalación reproducible, lint, tipos, unitarias, PostgreSQL efímero, migraciones, integración y build.
- Confirmar que CI no usa bases, archivos o secretos reales.
- Configurar checks obligatorios para promover cambios.
- Documentar cómo ejecutar localmente los mismos controles.

**Criterios de aceptación:**

- Un cambio roto no puede promoverse.
- Un checkout limpio reproduce los resultados.
- Los logs no contienen secretos ni datos clínicos.
- Se demuestra el bloqueo con un fallo intencional y su posterior corrección.

**Commit sugerido:** `ci(sigeco): add quality gates and dependency controls`

## Tarea 2 — Staging Completamente Aislado

**Prioridad:** P0. **Responsable:** equipo técnico. **Dependencias:** Tarea 1.

**Objetivo:** probar migraciones y flujos sin tocar producción.

**Alcance:**

- Separar base de datos, storage, secretos, URLs y servicios externos.
- Crear datos sintéticos y cuentas QA para cada rol.
- Bloquear mensajes o llamadas reales.
- Documentar seed, reinicio y limpieza.
- Identificar visualmente el entorno.

**Web y móvil:** mostrar una marca persistente de `STAGING`, incluso en pantallas pequeñas.

**Criterios de aceptación:**

- Staging no puede leer o escribir producción.
- Ninguna prueba contacta pacientes.
- El entorno puede reiniciarse siguiendo la documentación.
- Todos los roles tienen cuentas QA verificadas.

**Commit sugerido:** `chore(sigeco): isolate staging environment`

## Tarea 3 — Auditoría Append-Only

**Prioridad:** P0. **Responsables:** equipo técnico y Dirección. **Dependencias:** Tareas 1-2.

**Objetivo:** saber quién accedió o cambió información, cuándo y con qué resultado.

**Alcance:**

- Crear eventos inmutables con actor, rol, acción, entidad, resultado, fecha, request ID y contexto permitido.
- Cubrir sesiones, pacientes, visitas, consulta, Caja, compras, inventario, usuarios, adjuntos, reportes y exportaciones.
- No guardar contraseñas, tokens, notas clínicas completas o archivos.
- Crear un visor restringido.

**Web:** filtros por fecha, actor, acción y entidad.

**Móvil:** consulta simplificada; el análisis masivo permanece en escritorio.

**Criterios de aceptación:**

- No existe update o delete de auditoría desde la aplicación.
- Cada acción crítica genera exactamente un evento.
- También se registran fallos y accesos denegados importantes.
- Las pruebas confirman que no se filtran secretos.

**Commit sugerido:** `feat(sigeco): add append-only audit events`

## Tarea 4 — Usuarios, Roles Y Sesiones

**Prioridad:** P0. **Responsable:** Super administrador. **Dependencias:** Tarea 3.

**Objetivo:** administrar accesos sin scripts manuales o sesiones abandonadas.

**Alcance:**

- Crear, activar y desactivar usuarios.
- Asignar únicamente roles vigentes.
- Forzar cambio de contraseña, desbloquear y revocar sesiones.
- Mostrar último acceso y sesiones activas.
- Impedir desactivar al último super administrador.
- Auditar todo cambio.

**Web:** administración completa de usuarios y sesiones.

**Móvil:** cada usuario puede revisar y cerrar sus propias sesiones; la administración compleja se hace en escritorio.

**Criterios de aceptación:**

- Desactivar un usuario corta su acceso.
- Nadie puede elevar sus propios permisos.
- Los roles deprecados no se asignan.
- Cada ruta y action se prueba con roles permitidos y denegados.

**Commit sugerido:** `feat(sigeco): manage users roles and sessions`

## Tarea 5 — Permisos, Privacidad, Logs Y Secretos

**Prioridad:** P0. **Responsables:** equipo técnico y Dirección. **Dependencias:** Tareas 3-4.

**Objetivo:** comprobar que ninguna ruta alternativa revele datos prohibidos.

**Alcance:**

- Crear matriz de permisos por rol y módulo.
- Probar páginas, queries, actions, archivos y exportaciones.
- Revisar logs, URLs, errores, toasts, analytics y cachés.
- Documentar propietario y rotación de secretos.
- Confirmar que marketing y Payload no reciben historia clínica.

**Criterios de aceptación:**

- El límite visual coincide con el límite del servidor.
- No aparecen datos sensibles en logs o URLs.
- Existen pruebas negativas automatizadas por rol.
- Cada secreto tiene entorno, propietario y procedimiento de rotación.

**Commit sugerido:** `test(sigeco): enforce privacy and permission boundaries`

## Tarea 6 — Adjuntos Clínicos Seguros

**Prioridad:** P0. **Responsable:** equipo técnico. **Dependencias:** Tareas 2-5.

**Objetivo:** almacenar resultados y documentos sin URLs públicas.

**Alcance:**

- Storage privado y descargas temporales autorizadas.
- Validación de tipo, tamaño, nombre y checksum.
- Relación con paciente, visita, estudio y usuario.
- Rechazo de archivos no permitidos y preparación antimalware.
- Auditoría de subida, lectura y eliminación controlada.

**Web:** subida múltiple, progreso y vista previa autorizada.

**Móvil:** cámara o selector, compresión aprobada y reintento sin duplicar.

**Criterios de aceptación:**

- Acceso anónimo o con rol incorrecto falla.
- Los enlaces expiran.
- Archivos inválidos no quedan disponibles.
- Metadata y contenido forman parte del proceso de recuperación.

**Commit sugerido:** `feat(sigeco): secure clinical attachments`

## Tarea 7 — Backup Y Restauración Comprobada

**Prioridad:** P0. **Responsables:** equipo técnico y Dirección. **Dependencias:** Tareas 2 y 6.

**Objetivo:** demostrar que base y archivos pueden recuperarse.

**Alcance:**

- Definir pérdida máxima aceptable y tiempo objetivo de recuperación.
- Crear backups cifrados y política de retención.
- Restaurar una copia real en un entorno aislado.
- Verificar pacientes, visitas, Caja, inventario, permisos y adjuntos.
- Programar simulacros.

**Criterios de aceptación:**

- La restauración completa funciona fuera de producción.
- Las credenciales de backup están separadas.
- Se registran tiempos, resultados y responsable.
- Otra persona autorizada puede seguir el procedimiento.

**Commit sugerido:** `docs(ops): prove sigeco backup and restore`

## Tarea 8 — Respuesta A Incidentes Y Gate De Seguridad

**Prioridad:** P0. **Responsables:** equipo técnico y Dirección. **Dependencias:** Tareas 1-7.

**Objetivo:** cerrar la base de seguridad antes de ampliar la operación.

**Alcance:**

- Crear runbook para acceso indebido, pérdida de datos, malware e indisponibilidad.
- Documentar contención, revocación de sesiones, rotación y restauración.
- Ejecutar simulacro de incidente y restauración.
- Cerrar hallazgos críticos de las tareas anteriores.

**Criterios de aceptación:**

- El simulacro registra tiempos, responsables y mejoras.
- No quedan hallazgos críticos abiertos.
- Dirección aprueba el runbook y el funcionamiento del gate. Esta aprobación
  termina la tarea, pero no autoriza producción mientras existan bloqueos
  remotos.
- [progress.md](./progress.md) contiene la evidencia.

**Commit sugerido:** `docs(ops): complete sigeco security readiness`

---

## Fase 2 — Datos Y Flujo Del Paciente Confiables

## Tarea 9 — Consentimientos Y Preferencias De Contacto

**Prioridad:** P0. **Responsables:** Dirección y Recepción. **Dependencias:** Tareas 3-5 y aprobación de textos.

**Objetivo:** usar cada permiso solo para su finalidad.

**Alcance:**

- Separar seguimiento, recordatorios, educación, promociones e imagen/voz.
- Registrar estado, fecha, medio, versión del texto y retiro.
- Bloquear contactos no autorizados.
- No interpretar seguimiento como permiso de marketing o testimonio.

**Web:** historial y filtros de auditoría.

**Móvil:** explicación breve y retiro sencillo.

**Criterios de aceptación:**

- Cada finalidad tiene permiso independiente.
- Retirar un permiso bloquea nuevas acciones.
- Se puede demostrar qué aceptó el paciente.

**Commit sugerido:** `feat(sigeco): separate patient consents`

## Tarea 10 — Departamento Y Procedencia Geográfica

**Prioridad:** P1. **Responsable:** Recepción. **Dependencias:** Tarea 8.

**Objetivo:** medir El Alto, La Paz, Cochabamba y otros lugares correctamente.

**Alcance:**

- Separar ciudad, departamento y país cuando aplique.
- Guardar procedencia habitual y procedencia de la visita si difieren.
- Normalizar nombres y ofrecer opciones frecuentes.
- Conservar el origen de visitas cerradas.

**Web:** filtros por ciudad y departamento.

**Móvil:** opciones frecuentes, búsqueda y “Otro”.

**Criterios de aceptación:**

- Toda llegada puede clasificarse.
- Ciudad y departamento no se mezclan.
- Se pueden medir llegadas y retornos desde Cochabamba.

**Commit sugerido:** `feat(sigeco): capture geographic origin`

## Tarea 11 — Fuentes De Captación Y Atribución

**Prioridad:** P1. **Responsables:** Recepción, Marketing y Dirección. **Dependencias:** Tareas 9-10.

**Objetivo:** saber qué canal ayudó a generar la llegada y la venta.

**Alcance:**

- Preguntar al paciente con opciones simples: Facebook, TikTok, WhatsApp, referido, paciente anterior, volante, web y otro.
- No pedir al paciente que diferencie publicidad pagada de contenido orgánico.
- Distinguir internamente TikTok del Dr., TikTok de la Dra. y campañas pagadas solo cuando el enlace, formulario o campaña entregue ese dato automáticamente.
- Guardar fuente principal y fuentes de apoyo.
- Usar catálogo administrable de fuentes.
- Mantener la atribución original de la llegada.

**Web:** comparación por fuente, ciudad, llegadas, propuestas, ventas e ingresos.

**Móvil:** chips frecuentes y selección de apoyo opcional.

**Criterios de aceptación:**

- Las cuentas sociales se miden por separado.
- La recepción puede registrar “Facebook” sin adivinar si fue anuncio o contenido orgánico.
- La atribución pagada u orgánica se guarda como detalle interno o “No identificado”.
- WhatsApp puede ser canal sin borrar la fuente original.
- Dirección puede comparar llegada e ingreso por fuente.

**Commit sugerido:** `feat(sigeco): improve source attribution`

## Tarea 12 — Duplicados Y Fusión De Pacientes

**Prioridad:** P1. **Responsables:** Recepción y Super administrador. **Dependencias:** Tareas 3-5.

**Objetivo:** evitar historias separadas de una misma persona.

**Alcance:**

- Alertar por teléfono normalizado, nombre y fecha de nacimiento.
- Detectar también al editar.
- Crear cola de posibles duplicados.
- Comparar antes de fusionar.
- Fusionar relaciones en transacción y conservar alias.

**Web:** comparación y simulación del impacto.

**Móvil:** prevención y alerta; la fusión compleja se realiza en escritorio.

**Criterios de aceptación:**

- No quedan relaciones huérfanas.
- El enlace anterior dirige al expediente vigente.
- La fusión requiere permiso, confirmación y auditoría.

**Commit sugerido:** `feat(sigeco): safely merge duplicate patients`

## Tarea 13 — Actualización De Bandejas Entre Áreas

**Prioridad:** P1. **Responsable:** equipo técnico. **Dependencias:** Tareas 1-5.

**Objetivo:** evitar colas desactualizadas entre Recepción, Consulta, Enfermería y Administración.

**Alcance:**

- Iniciar con polling controlado, última actualización y botón manual.
- Pausar en segundo plano o sin conexión.
- Conservar filtros, selección y formularios sucios.
- Medir antes de adoptar SSE o WebSocket.

**Web:** actualizar estaciones sin recargar toda la página.

**Móvil:** reducir consumo y avisar si la lista está desactualizada.

**Criterios de aceptación:**

- Los cambios aparecen dentro del tiempo acordado.
- No se duplican solicitudes al volver del segundo plano.
- No se pierde un formulario en edición.

**Commit sugerido:** `feat(sigeco): refresh operational queues`

## Tarea 14 — Resultado De La Propuesta De Tratamiento

**Prioridad:** P1. **Responsable:** Médico. **Dependencias:** Tareas 3, 4 y 9.

**Objetivo:** registrar qué ocurrió después de explicar el tratamiento.

**Alcance:**

- Estados: aceptado, rechazado, necesita tiempo, no aplica o sin decisión.
- Motivo mediante opciones y nota opcional.
- Si acepta, enviar instrucción clara a Administración.
- Si necesita tiempo, crear seguimiento para Marlen solo con consentimiento.
- Conservar médico, visita y fecha.

**Web:** relacionar propuesta, orden, venta y pago.

**Móvil:** selección rápida y confirmación antes de enviar a Caja.

**Criterios de aceptación:**

- El médico registra el resultado en menos de un minuto.
- Administración recibe solo instrucciones explícitas.
- No se crea una venta sin confirmación.
- Se puede medir aceptación y rechazo.

**Commit sugerido:** `feat(sigeco): record treatment proposal outcomes`

## Tarea 15 — Tipos Y Resultados De Seguimiento

**Prioridad:** P1. **Responsable:** Marlen. **Dependencias:** Tareas 9 y 14.

**Objetivo:** distinguir para qué se contacta y qué resultado tuvo.

**Alcance:**

- Tipos: evolución, retorno, recuperación de tratamiento, administrativo o llamada médica.
- Separar tipo de tarea y resultado.
- Registrar responsable, prioridad, vencimiento y relación clínica/administrativa.
- Escalar llamadas médicas al médico.
- No asignar seguimiento de tratamiento a Yazmin.

**Web:** filtros por tipo, responsable, estado y atraso.

**Móvil:** lista de hoy con llamar, WhatsApp y resultado.

**Criterios de aceptación:**

- Cada tarea tiene propósito, responsable, fecha y resultado.
- Marlen distingue tareas sin leer todas las notas.
- Una llamada médica no se cierra como tarea administrativa.

**Commit sugerido:** `feat(sigeco): classify treatment follow-ups`

## Tarea 16 — Abandono, Bloqueo Y Pendientes

**Prioridad:** P1. **Responsables:** áreas operativas. **Dependencias:** Tareas 13 y 15.

**Objetivo:** conocer dónde se detuvo una visita y qué debe recuperarse.

**Alcance:**

- Registrar punto, motivo, área, usuario y fecha.
- Motivos simples: espera, costo, rechazo, emergencia, falta de insumo, derivación u otro.
- Guardar pendientes: consulta, estudio, aplicación, cobro, entrega o seguimiento.
- Crear seguimiento cuando corresponda y exista consentimiento.

**Web:** ruta completa con bloqueos y reporte por motivo.

**Móvil:** acción visible “No continuará”, motivo obligatorio y nota opcional.

**Criterios de aceptación:**

- La visita puede terminar desde cualquier área.
- Los pendientes no desaparecen.
- Abandono, cancelación y atención completa se diferencian.

**Commit sugerido:** `feat(sigeco): record abandonment and blocked work`

## Tarea 17 — Correcciones, Cierre Y Firma Clínica

**Prioridad:** P1. **Responsables:** Médico y Dirección. **Dependencias:** Tareas 3-5.

**Objetivo:** corregir errores sin reemplazar la historia original.

**Alcance:**

- Definir borrador y finalizado para registros aprobados.
- Guardar autor, fecha y hora.
- Corregir con nueva versión o fe de erratas y motivo obligatorio.
- Mantener visible el original y señalar la versión vigente.
- Restringir correcciones por tipo y rol.
- Evitar que una corrección cambie silenciosamente una venta o aplicación ya realizada.

**Web:** historial, comparación, autor y motivo.

**Móvil:** estados claros y corrección autorizada sin ocultar el original.

**Criterios de aceptación:**

- Finalizar conserva autor y fecha.
- Corregir no sobrescribe ni elimina.
- Solo el rol autorizado corrige.
- Se prueban modificaciones concurrentes.

**Commit sugerido:** `feat(sigeco): version clinical records`

---

## Fase 3 — Caja, Compras E Inventario

## Tarea 18 — Caja, Dinero Al Personal, Gastos Y Cierre

**Prioridad:** P0. **Responsables:** Administración y Dirección. **Dependencias:** Tareas 3-5 y gate de la Tarea 8.

**Objetivo:** registrar todo el dinero que entra y sale y comprobar el efectivo diario.

### Sesión De Caja

- Sucursal, caja, fecha, turno, responsable y efectivo inicial.
- Impedir sesiones incompatibles abiertas.
- Permisos separados para abrir, mover, anular y cerrar.

### Dinero Para Almuerzo, Transporte U Otro Apoyo

- Fecha y hora.
- Categoría.
- Empleado beneficiario y monto individual.
- Persona que entrega, usuario que registra y autorizador.
- Caja, sucursal, motivo y nota.
- Una entrega grupal guarda líneas individuales que suman el total.

### Compra Urgente Desde Caja

- Categoría: inyectables, material clínico, limpieza, oficina u otro.
- Artículo, cantidad, precio unitario y total.
- Solicitante y persona que recibe el dinero.
- Proveedor opcional, motivo de urgencia y comprobante.
- Indicar si posteriormente debe ingresar a inventario.

### Correcciones Y Devoluciones

- No borrar pagos o egresos.
- Crear movimiento compensatorio enlazado al original.
- Exigir motivo y autorización.
- Evitar doble anulación o devolución superior al monto.

### Cierre

```text
Efectivo esperado =
  efectivo inicial
  + ingresos en efectivo
  - dinero entregado al personal
  - compras urgentes en efectivo
  - otros egresos
  - devoluciones en efectivo
```

Registrar efectivo contado, diferencia, observación y aprobación cuando supere el límite definido. QR, tarjeta y transferencia se concilian por separado.

**Datos sugeridos:** ampliar `CashMovement` y crear sesión de Caja, egreso y líneas de beneficiarios. No guardar información estructurada únicamente dentro de `description`.

**Permisos:**

- Administración abre, cobra, registra egresos y solicita cierre.
- Dirección revisa, aprueba diferencias y autoriza anulaciones.
- Médico, Enfermería, Recepción y Yazmin no modifican Caja.

**Web:** “Caja de hoy”, movimientos, filtros, conciliación y cierre imprimible.

**Móvil:** cobrar, entregar dinero, registrar compra y ver resumen; teclado numérico y cámara para comprobante.

**Criterios de aceptación:**

- Cada salida identifica destino, motivo y responsable.
- Las líneas de beneficiarios cuadran con el total.
- El esperado se deriva de movimientos confirmados.
- No se opera sobre una Caja cerrada.
- Reintentar no duplica el egreso.
- No se borra historia.

**Commit sugerido:** `feat(sigeco): add expenses and daily cash close`

## Tarea 19 — Catálogo De Productos Y Proveedores

**Prioridad:** P0. **Responsable:** Administración. **Dependencias:** Tareas 3-5 y 18.

**Objetivo:** administrar productos y proveedores desde SIGECO.

**Alcance:**

- Crear y actualizar nombre, categoría, unidad, precio, costo referencial y stock mínimo.
- Clasificar como venta, uso interno o ambos.
- Activar/desactivar sin borrar historia.
- Mantener código interno único.
- Crear y actualizar proveedores, contacto y notas.
- Asociar varios proveedores y uno preferido.

**Permisos:** Administración modifica; Dirección revisa costos; otros roles solo consultan disponibilidad cuando esté permitido. Yazmin no accede.

**Web:** catálogo con búsqueda, filtros, edición e historial.

**Móvil:** alta rápida con campos esenciales y edición guiada.

**Criterios de aceptación:**

- No se requieren scripts para administrar productos.
- Desactivar conserva ventas y movimientos.
- Los cambios de costo no alteran compras históricas.
- Un código no se reutiliza.

**Commit sugerido:** `feat(sigeco): manage products and suppliers`

## Tarea 20 — Compras, Recepciones, Lotes Y Stock

**Prioridad:** P0. **Responsable:** Administración. **Dependencias:** Tareas 18-19.

**Objetivo:** enlazar lo comprado, lo pagado y lo realmente recibido.

### Compra

- Proveedor, sucursal, fecha, documento, moneda y total.
- Líneas con producto, cantidad y costo.
- Estados: borrador, confirmada, recibida parcial, recibida o anulada.
- Pago por Caja, transferencia, crédito u otro.
- Una compra desde Caja crea su egreso una sola vez.
- Una compra a crédito no reduce efectivo hasta pagar.

### Recepción

- Cantidad recibida, costo, lote y vencimiento cuando aplique.
- Documento, fecha, receptor, usuario, sucursal y ubicación.
- Permitir recepción parcial.
- Aumentar stock exactamente una vez por recepción.

### Lotes Y Movimientos

- Alertas de vencimiento y stock mínimo.
- Recomendación FEFO.
- Mermas, daños o vencimiento como ajuste autorizado.
- Devoluciones indican si vuelven al stock y al lote.
- Cada movimiento enlaza producto, compra, recepción, lote, usuario y sucursal.

```text
Compra registrada
        ↓
Pago o egreso cuando realmente sale el dinero
        ↓
Recepción cuando llegan los productos
        ↓
Entrada de stock por producto y lote
```

Registrar una compra no aumenta stock. El stock cambia al confirmar la recepción.

**Web:** compra con líneas, comparación pedido/recibido, kardex y vencimientos.

**Móvil:** búsqueda rápida, cantidad, costo, lote, fecha y cámara para documento.

**Criterios de aceptación:**

- Compra, egreso, recepción y stock pueden rastrearse entre sí.
- Una recepción no puede aplicarse dos veces.
- La recepción parcial conserva lo pendiente.
- Los lotes y costos históricos no cambian al editar el catálogo.
- No se elimina historial de stock.

**Commit sugerido:** `feat(sigeco): add purchases batches and stock receipts`

## Tarea 21 — Recetas Y Comprobantes Versionados

**Prioridad:** P1. **Responsables:** Médico, Administración y Dirección. **Dependencias:** Tareas 17-20.

**Objetivo:** generar documentos que coincidan con los registros vigentes.

**Alcance:**

- Confirmar requisitos clínicos, fiscales y de identidad.
- Crear receta desde datos médicos y comprobante desde venta/pagos.
- Incluir versión, fecha, paciente y responsable.
- Auditar generación, descarga y reimpresión.
- No permitir texto libre que contradiga la fuente.

**Web:** vista previa y PDF/impresión controlada.

**Móvil:** vista legible, compartir solo por mecanismo aprobado.

**Criterios de aceptación:**

- Totales y productos coinciden.
- Una corrección genera versión nueva.
- Reimprimir no modifica el original.

**Commit sugerido:** `feat(sigeco): generate versioned documents`

---

## Fase 4 — Medición, Continuidad Y Experiencia

## Tarea 22 — Reporte Del Recorrido Completo

**Prioridad:** P1. **Responsable:** Dirección. **Dependencias:** Tareas 9-21.

**Objetivo:** medir llegada, consulta, propuesta, compra, seguimiento y retorno.

**Alcance:**

- Llegadas, consultas, propuestas, aceptaciones, ventas, cobrado, pendiente, abandono, seguimientos y nuevas visitas.
- Definir fórmula, zona horaria, propietario y exclusiones.
- Filtros por periodo, fuente, ciudad, médico y sucursal.
- Separar cantidad de ventas, dinero vendido y dinero cobrado.

**Web:** embudo, tendencias y tabla reconciliable.

**Móvil:** pocos indicadores y filtros simples.

**Criterios de aceptación:**

- Cada cifra coincide con registros fuente.
- Una visita no se duplica al cambiar de área.
- Dirección identifica puntos de pérdida y fuentes rentables.

**Commit sugerido:** `feat(sigeco): report patient journey`

## Tarea 23 — Tiempo De Atención Por Área

**Prioridad:** P1. **Responsable:** Dirección. **Dependencias:** Tareas 13, 16 y 22.

**Objetivo:** detectar esperas y cuellos de botella.

**Alcance:**

- Inicio, fin y duración en Recepción, Consulta, Enfermería y Administración.
- Diferenciar espera, atención y bloqueo.
- Mostrar mediana y percentiles además de promedio.
- Excluir pruebas y cancelaciones según reglas.

**Web:** tendencias por día, hora, área y sucursal.

**Móvil:** tiempo de espera visible y alerta no invasiva.

**Criterios de aceptación:**

- El tiempo se deriva de eventos.
- Un abandono conserva tiempo hasta la salida.
- Dirección identifica franjas problemáticas.

**Commit sugerido:** `feat(sigeco): measure time by area`

## Tarea 24 — Recordatorios Automatizados Y Supervisados

**Prioridad:** P1. **Responsable:** Marlen. **Dependencias:** Tareas 9 y 15.

**Objetivo:** reducir trabajo repetitivo sin contactar a quien no corresponde.

**Alcance:**

- Plantillas versionadas para control, retorno y recuperación.
- Reglas por evento, fecha y tipo.
- Creación idempotente.
- Comenzar con revisión humana.
- Respetar canal, horario y consentimiento.
- Registrar intento, resultado, error y reintento.

**Web:** reglas, vista previa, activación y fallos.

**Móvil:** mensajes pendientes, llamada/WhatsApp y resultado.

**Criterios de aceptación:**

- `no_contact` bloquea.
- Una regla no duplica tareas.
- Toda regla tiene versión, estado y responsable.
- Los fallos permanecen visibles.

**Commit sugerido:** `feat(sigeco): automate supervised reminders`

## Tarea 25 — Encuestas Y Reclamos

**Prioridad:** P2. **Responsable:** Dirección. **Dependencias:** Tareas 9 y 24, más piloto manual.

**Objetivo:** escuchar al paciente con un proceso de respuesta definido.

**Alcance:**

- Probar manualmente preguntas, responsables y escalamiento.
- Registrar encuesta, calificación, comentario o reclamo.
- Separar opinión general de incidente clínico.
- Definir plazo y responsable.
- No publicar testimonios sin permiso.

**Web:** bandeja de reclamos y tendencias.

**Móvil:** formulario corto mediante enlace seguro.

**Criterios de aceptación:**

- La automatización inicia después del piloto.
- Un reclamo crítico se diferencia de una encuesta.
- El paciente no ve información interna.

**Commit sugerido:** `feat(sigeco): add feedback and complaints`

## Tarea 26 — Móvil Y Conectividad Lenta

**Prioridad:** P1. **Responsable:** equipo técnico. **Dependencias:** Tareas 2, 5, 13, 18 y 20.

**Objetivo:** evitar duplicados y pérdida de trabajo durante conexiones inestables.

**Alcance:**

- Estado online, sin conexión, guardando, guardado y error.
- Idempotencia en visitas, pagos, egresos, compras y stock.
- Borradores locales solo cuando el riesgo lo permita.
- Limpieza local al cerrar sesión.
- Ficha de contingencia para cortes largos.
- No cachear historia clínica o adjuntos por defecto.

**Web:** productividad con teclado, tablas y tamaños medianos.

**Móvil:** objetivos táctiles de 44 px, teclado correcto y cámara útil.

**Criterios de aceptación:**

- Reintentar no duplica operaciones.
- Se distingue borrador de confirmación.
- Logout limpia datos permitidos.
- Se prueba red lenta y corte temporal.

**Commit sugerido:** `feat(sigeco): improve mobile resilience`

## Tarea 27 — Integración Segura Payload-SIGECO

**Prioridad:** P2. **Responsable:** Marketing y TI. **Dependencias:** Tareas 3, 5, 9, 11 y 22.

**Objetivo:** relacionar campañas y llegadas sin enviar datos clínicos a marketing.

**Alcance:**

- Payload conserva contenido y campañas; SIGECO pacientes y operación.
- Llevar identificadores de campaña hacia SIGECO.
- Devolver únicamente métricas agregadas aprobadas.
- Definir contrato, autenticación, límites, reintentos y auditoría.
- Mantener captura manual como respaldo.

**Web y móvil:** conservar parámetros autorizados sin mostrarlos en pantallas clínicas innecesarias.

**Criterios de aceptación:**

- Existe mapa aprobado de datos.
- Ningún dato clínico regresa a Payload.
- Un fallo no impide registrar la llegada.

**Commit sugerido:** `feat(sigeco): integrate campaign attribution safely`

---

## Fase 5 — Expansión Y Validación

## Tarea 28 — Multi-Sucursal El Alto Y Cochabamba

**Prioridad:** P1 antes de abrir Cochabamba. **Responsable:** Dirección. **Dependencias:** Tareas 10, 18-20, 22 y 26.

**Objetivo:** separar operación por sucursal sin duplicar la historia del paciente.

**Alcance:**

- Sucursal en visitas, usuarios, Cajas, ventas, pagos, compras, inventario y reportes.
- Expediente único aunque el paciente visite dos sedes.
- Usuario asignado a una o varias sucursales.
- Stock separado y traslados con salida/entrada enlazadas.
- Cierres de Caja separados.
- Reporte consolidado solo para roles autorizados.
- Preparar Cochabamba sin activarla.

**Web:** selector, comparación y traslados.

**Móvil:** sucursal activa siempre visible y confirmación al cambiar.

**Criterios de aceptación:**

- Ninguna operación financiera o de stock queda sin sucursal.
- Cambiar de sede no mezcla colas o Caja.
- Dirección ve consolidado y detalle.
- Cochabamba se prueba con datos sintéticos.

**Commit sugerido:** `feat(sigeco): support multi-branch operations`

## Tarea 29 — Piloto Completo Con El Personal

**Prioridad:** P0 para cerrar el plan. **Responsable:** Dirección. **Dependencias:** tareas implementadas que ingresen al despliegue.

**Objetivo:** demostrar que SIGECO funciona en la operación real.

**Alcance:**

- Capacitación por rol.
- Recorrido: llegada, consulta, propuesta, venta, pago, entrega, seguimiento y retorno.
- Recorrido financiero: apertura, cobros, almuerzo, compra urgente, recepción y cierre.
- Abandono y corrección sin borrado.
- Teléfono, tableta y computadora con red real.
- Registrar errores, tiempos, dudas y responsable.
- Piloto en El Alto antes de activar Cochabamba.
- Definir soporte y contingencia manual.

**Criterios de aceptación:**

- Cada rol completa sus tareas sin acceso prohibido.
- Caja e inventario cuadran.
- No quedan defectos críticos sin resolver.
- Dirección aprueba cada módulo y sucursal.

**Commit sugerido:** `test(sigeco): validate clinic operation`

---

## Gate De Cierre Por Tarea

Una tarea solo pasa a `Terminada` cuando:

1. Cumple sus criterios de aceptación.
2. Tiene migración y recuperación operacional documentadas cuando aplica.
3. Pasa lint, tipos, unitarias, integración y build aplicables.
4. Prueba permisos permitidos y denegados.
5. Se valida en web y móvil.
6. Actualiza documentación técnica afectada y [progress.md](./progress.md).
7. Registra evidencia de comandos, capturas o piloto.

## Cambios De Numeración

La reorganización elimina el problema de comenzar por “19.1”. Seguridad ahora ocupa las tareas 1-8 y el resto sigue el orden real de implementación.

### Plan Integral Anterior

| Número anterior | Nuevo destino |
| --- | --- |
| 1 Propuesta de tratamiento | 14 |
| 2 Procedencia | 10 |
| 3 Fuentes de captación | 11 |
| 4 Seguimiento | 15 |
| 5 Consentimientos | 9 |
| 6 Recorrido | 22 |
| 7 Tiempo por área | 23 |
| 8 Abandono | 16 |
| 9 Duplicados | 12 |
| 10 Bandejas | 13 |
| 11 Caja y gastos | 18 |
| 12 Productos, compras y stock | 19-20 |
| 13 Encuestas | 25 |
| 14 Recordatorios | 24 |
| 15 Multi-sucursal | 28 |
| 16 Móvil | 26 |
| 17 Documentos | 21 |
| 18 Payload-SIGECO | 27 |
| 19 Seguridad | 1-8 |
| 20 Piloto | 29 |
| 21 Correcciones clínicas | 17 |

### Backlog Técnico `sigeco-mejoras-futuras`

| Número anterior | Nuevo destino |
| --- | --- |
| 1 CI y staging | 1-2 |
| 2 Auditoría | 3 |
| 3 Usuarios y sesiones | 4-5 |
| 4 Backup e incidentes | 7-8 |
| 5 Adjuntos | 6 |
| 6 Duplicados | 12 |
| 7 Correcciones clínicas | 17 |
| 8 Bandejas | 13 |
| 9 Documentos | 21 |
| 10 Cierre de Caja | 18 |
| 11 Compras y lotes | 19-20 |
| 12 Automatización | 24 |
| 13 Agenda y citas | Aplazada |
| 14 Reportes | 18, 20, 22-23 |
| 15 Modo degradado | 26 |
| 16 FHIR | Fuera del plan actual |

## Funciones Aplazadas

### Agenda Y Citas

Antes de implementarla se hará un piloto manual de dos a cuatro semanas para medir solicitudes de hora, confirmaciones, ausencias, reprogramaciones, capacidad y responsable de agenda. Solo se convierte en tarea activa si demuestra valor. Una cita siempre será diferente de una llegada y una visita.

### FHIR

Permanece fuera del plan hasta existir una integración clínica concreta y estar terminadas seguridad, consentimiento, adjuntos, correcciones e identificadores estables.

## Fuera De Alcance

- Aplicación móvil nativa; primero se mejora la web responsive.
- Facturación tributaria avanzada sin requisitos confirmados.
- Telemedicina, portal de pacientes e inteligencia artificial clínica.
- Contabilidad completa o reemplazo de un sistema contable.
