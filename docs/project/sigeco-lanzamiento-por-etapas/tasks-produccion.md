# Tasks — Salida A Producción De SIGECO

Estado: separado de [tasks.md](./tasks.md) el 2026-08-28. Son las tareas que
tocan producción, y **están congeladas a propósito**.

Dirección decidió resolver primero todo lo que falla en staging. Mientras el
plan activo no llegue a su cierre, ninguna de estas tareas se inicia: el orden
importa, porque desplegar un defecto conocido a producción cuesta más caro que
arreglarlo antes.

La numeración se conserva. Las Tareas 13 a 16 estaban en la Fase C y las 17 a
20 en la Fase D; ambas fases vivían en el archivo activo hasta esta separación.

Cuando el plan activo cierre, esta lista se revisa antes de retomarse: parte de
la Tarea 14 —la auditoría de privacidad con casos negativos y la verificación
del Blob clínico privado— se puede ejecutar contra staging y quizá convenga
adelantarla.

Control de avance: [progress.md](./progress.md)

---

## Fase C — Salida A Producción

## Tarea 13 — Backup Y Restauración Probados En Remoto

**Prioridad:** P0. **Responsable:** Plataforma y Dirección. **Dependencias:** Tarea 12.

**Objetivo:** poder recuperar dinero e inventario reales. Corresponde a la Tarea
7 del plan integral, hoy demostrada solo en local.

**Alcance:**

- Copia cifrada automática y programada de la base productiva y de los adjuntos.
- Restauración completa ejecutada en un entorno aislado, cronometrada, con
  verificación de que Caja, ventas, pagos y stock quedan consistentes.
- Retención, custodia de la clave y responsable definidos por Dirección.
- Documentar el resultado en `docs/operations/backup-restore.md`.

**Criterios de aceptación:**

- Existe una restauración remota comprobada, con fecha y tiempo medido.
- La copia corre sola y su fallo es visible.
- Dirección conoce y aprueba el procedimiento de recuperación.

**Commit sugerido:** `chore(sigeco): prove remote backup and restore`

## Tarea 14 — Cierre Del Gate De Seguridad

**Prioridad:** P0. **Responsable:** Plataforma y Dirección. **Dependencias:** Tarea 13.

**Objetivo:** levantar los bloqueos remotos que hoy impiden autorizar
producción. Corresponde a las Tareas 5, 6 y 8 del plan integral.

**Alcance:**

- Auditoría de privacidad y permisos con casos negativos ejecutada en remoto,
  incluyendo los nuevos rechazos por módulo apagado.
- Blob Store clínico privado verificado; en la Etapa 1 debe estar configurado
  aunque el módulo clínico esté apagado.
- Simulacro de incidentes sobre el entorno remoto y `pnpm security:gate:local`
  sin bloqueos pendientes.
- Autorización expresa y firmada de Dirección para producción.

**Criterios de aceptación:**

- No queda evidencia remota pendiente en el gate.
- Un acceso no autorizado queda registrado y bloqueado en remoto.
- La autorización de producción está documentada con fecha y responsable.

**Commit sugerido:** `chore(sigeco): close remote security gate`

## Tarea 15 — Despliegue Y Activación De La Etapa 1

**Prioridad:** P0. **Responsable:** Plataforma, Dirección y Administración. **Dependencias:** Tarea 14.

**Objetivo:** poner la Etapa 1 en producción y encenderla.

**Alcance:**

- Promoción `develop -> staging -> main` con las 181 diferencias acumuladas,
  revisadas y con CI verde.
- Proyecto de producción configurado: dominio, variables, Blob, `APP_ENV`,
  `DATABASE_ENVIRONMENT`; `pnpm db:deploy` sobre la base productiva.
- Con todos los módulos apagados salvo `core`, el super administrador activa
  `inventario`, `catalogo`, `compras` y `administracion`.
- Guía operativa diaria de Caja y Administración escrita **antes** de capacitar:
  abrir Caja, registrar un cliente, vender, cobrar, emitir el recibo, registrar
  un egreso y cerrar Caja. Sin ella se capacita de memoria.
- Capacitación de Administración y acompañamiento durante los primeros días,
  con un canal definido para reportar problemas.
- Plan de reversa escrito: qué se apaga, quién decide y cómo se sigue operando
  en papel mientras tanto.

**Criterios de aceptación:**

- El primer día real cierra Caja con la diferencia explicada.
- Ningún módulo no lanzado es alcanzable en producción.
- El plan de reversa está escrito y entendido antes de encender.

**Commit sugerido:** `chore(sigeco): release stage one to production`

## Tarea 16 — Documentación Al Día

**Prioridad:** P1. **Responsable:** Plataforma. **Dependencias:** Tarea 15.

**Objetivo:** que la documentación vuelva a reflejar el sistema real.

**Alcance:**

- Reportes de los cambios de agosto que quedaron sin documentar: editor de
  recetas, catálogo de diagnósticos y plantillas, catálogo de hallazgos,
  anulación de documentos, seguimientos en espera de pago, sesiones
  excepcionales de Caja, métodos de pago reducidos a efectivo y QR, desglose de
  Caja, historial de ventas del paciente, cola de consultas con médico a cargo y
  mejoras de login.
- Actualizar `v3-implementation-status.md` con las etapas de lanzamiento y el
  estado real de cada módulo.
- Guía operativa del lanzamiento por etapas en `docs/operations/`. La guía de
  operación diaria del personal se adelantó a la Tarea 15, porque hace falta
  para capacitar antes de encender.
- Actualizar los `progress.md` de los planes integral y del médico.

**Criterios de aceptación:**

- Ningún cambio implementado queda sin reporte.
- El estado publicado coincide con lo que hay en producción.
- Existe una guía de operación para el personal de la Etapa 1.

**Commit sugerido:** `docs(sigeco): update status and pending task reports`

---

## Fase D — Etapas Siguientes

Estas tareas no construyen funcionalidad: **verifican y encienden** módulos que
ya están implementados. Cada una se ejecuta cuando la etapa anterior está
estable y Dirección lo decide.

## Tarea 17 — Lanzamiento De Recepción

**Prioridad:** P1. **Responsable:** Dirección y Recepción. **Dependencias:** Tarea 15.

**Objetivo:** encender Recepción sobre una Etapa 1 en marcha.

**Alcance:**

- QA en staging del módulo con datos provenientes de la Etapa 1: fichas creadas
  por Administración que ahora reciben visitas.
- Verificar consentimientos, duplicados, abandono y que las ventas de mostrador
  anteriores sigan intactas y consultables.
- Capacitar a Recepción; activar `recepcion`; acompañar los primeros días.
- Confirmar que la venta directa sigue disponible y que ahora convive con la
  venta asociada a una visita.

**Criterios de aceptación:**

- Un cliente de la Etapa 1 recibe su primera visita sin crear una ficha nueva.
- Las ventas anteriores conservan su historia.
- Administración no pierde ninguna capacidad al encender Recepción.

**Commit sugerido:** `chore(sigeco): release reception module`

## Tarea 18 — Lanzamiento De Consulta

**Prioridad:** P1. **Responsable:** Dirección y Médico. **Dependencias:** Tarea 17.

**Objetivo:** encender la consulta médica y el pedido del médico.

**Alcance:**

- QA en staging de consulta, catálogos clínicos, pedido del médico, propuesta y
  recetas, incluyendo la cola con médico a cargo y prioridades.
- Verificar que el pedido del médico llega a la bandeja de Administración y se
  confirma y cobra con el flujo ya implementado.
- Capacitar al médico; activar `consulta`; acompañar.

**Criterios de aceptación:**

- Un pedido armado por el médico se cobra en Administración sin intervención
  técnica.
- La consulta se cierra con firma y las correcciones quedan versionadas.
- El descuento respeta el tope y su validación.

**Commit sugerido:** `chore(sigeco): release consultation module`

## Tarea 19 — Lanzamiento De Enfermería

**Prioridad:** P1. **Responsable:** Dirección y Enfermería. **Dependencias:** Tarea 18.

**Objetivo:** encender la ejecución clínica en Enfermería.

**Alcance:**

- QA en staging de tareas, signos, aplicaciones, estudios y sesiones de servicio,
  con la regla de pago previo antes de derivar.
- Verificar el consumo de sesiones a lo largo de varias visitas y el abandono
  por inactividad.
- Capacitar a Enfermería; activar `enfermeria`; acompañar.

**Criterios de aceptación:**

- Un suero pagado llega a Enfermería con sus indicaciones y se ejecuta.
- Las sesiones usadas y restantes coinciden con lo cobrado.
- Ninguna ejecución ocurre sin pago cuando la regla lo exige.

**Commit sugerido:** `chore(sigeco): release nursing module`

## Tarea 20 — Lanzamiento De Seguimiento, Opiniones Y Reportes

**Prioridad:** P2. **Responsable:** Dirección y Recepción. **Dependencias:** Tarea 19.

**Objetivo:** cerrar el ciclo con contacto posterior y medición.

**Alcance:**

- QA en staging de seguimientos, recordatorios supervisados, encuestas, reclamos
  y los reportes de recorrido, tiempos y captación.
- Confirmar que el contacto respeta el consentimiento vigente y que no existe
  envío automático sin aprobación humana.
- Aprobar en producción las reglas reales de recordatorios y los textos de
  consentimiento pendientes.
- Activar `seguimientos`, `opiniones` y `reportes`.

**Criterios de aceptación:**

- Ningún contacto sale sin consentimiento y sin aprobación de una persona.
- Los reportes reconcilian con Caja y con las visitas registradas.
- Dirección revisa indicadores reales, no de demostración.

**Commit sugerido:** `chore(sigeco): release follow-up, feedback and reports`
