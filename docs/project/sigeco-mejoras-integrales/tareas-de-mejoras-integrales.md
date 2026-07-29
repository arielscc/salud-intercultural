# Tareas De Mejoras Integrales De SIGECO

Estado: plan de ejecución propuesto el 2026-07-28.

Este documento convierte en tareas ejecutables los 20 puntos de mejora definidos para SIGECO y amplía especialmente Caja, gastos, compras e inventario. Parte de lo que ya funciona; no propone reconstruir el sistema desde cero.

## Documentos De Referencia

- [Documento inicial de negocio de SIGECO](../../masters/Documento_de_Negocio_V3_0.md)
- [Implementación técnica V3.7](../v3-technical-implementation.md)
- [Estado actual de V3](../v3-implementation-status.md)
- [Simplificación del flujo](../sigeco-simplificacion/tareas-de-simplificacion.md)
- [Mejoras futuras investigadas](../sigeco-mejoras-futuras/tareas-de-mejoras.md)
- [Progreso de este plan](./progreso-de-mejoras-integrales.md)

Este es el plan consolidado para ejecutar estas mejoras. El documento de mejoras futuras queda como antecedente técnico; una tarea cerrada aquí no debe volver a implementarse desde el backlog anterior.

## Lo Que SIGECO Ya Tiene

SIGECO ya cuenta con pacientes, visitas, consulta, ruta entre áreas, ventas, pagos, movimientos básicos de caja, productos, stock, movimientos de inventario, alertas y seguimientos. Las mejoras de este plan deben ampliar esos módulos y conservar sus datos.

En particular:

- Un cobro ya genera un `Payment` y un movimiento de caja.
- Una venta de un producto inventariable ya descuenta stock.
- Las entradas y ajustes de inventario ya generan movimientos históricos.
- Los montos se guardan como enteros en centavos.
- No se permite vender más unidades que el stock disponible.

Todavía faltan egresos estructurados, beneficiarios, apertura y cierre de caja, compras, recepción por lotes, vencimientos, costos y el enlace completo entre gasto, compra e ingreso de stock.

## Responsables Operativos Que Debe Respetar El Sistema

- **Médico:** explica el tratamiento, responde dudas, registra el resultado de la propuesta y cierra la venta del tratamiento.
- **Administración:** registra cobros, dinero entregado al personal, compras urgentes, proveedores, productos, entradas de stock y cierre de caja.
- **Recepción (Marlen):** registra la llegada, completa datos y realiza el seguimiento de pacientes en tratamiento.
- **Comunicación y apoyo para la llegada (Yazmin):** responde mensajes y llamadas, contacta a personas que solicitaron información, recupera visitas que no llegaron y apoya con recojos coordinados. No realiza seguimiento clínico, ventas, caja ni inventario.
- **Enfermería:** registra aplicaciones, controles, estudios y observaciones de su área.
- **Dirección:** revisa indicadores, autoriza operaciones sensibles y supervisa diferencias.
- **Super administrador:** administra accesos y configuración técnica. No reemplaza a Dirección en autorizaciones operativas.

## Reglas Transversales

1. **No borrar historia.** Pagos, egresos, cierres, compras y movimientos de inventario se corrigen con anulaciones o movimientos compensatorios.
2. **Operaciones críticas en una transacción.** Si una compra pagada con caja también aumenta stock, las tres partes deben guardarse juntas o no guardarse: compra, egreso y entrada de inventario.
3. **Permisos en servidor.** Ocultar un botón no es suficiente. Cada lectura y escritura debe validar el rol.
4. **Auditoría.** Debe quedar quién hizo la acción, cuándo, sobre qué registro y con qué resultado.
5. **Datos clínicos protegidos.** No deben aparecer en logs, URLs, analítica pública ni integraciones de marketing.
6. **Web y móvil comparten datos y reglas.** No se construyen dos sistemas distintos.
7. **Diseño móvil primero.** Las acciones frecuentes deben funcionar desde 390 px, con botones grandes, pocos campos visibles y teclado apropiado para teléfono o dinero.
8. **Web aprovecha el espacio.** En escritorio deben existir tablas, filtros, comparación, paneles laterales e impresión cuando aporten rapidez.
9. **Conectividad lenta.** Todo formulario debe mostrar si está guardando, si guardó o si falló. Nunca debe indicar éxito antes de la confirmación del servidor.
10. **Migraciones aditivas.** No eliminar tablas o columnas con datos. Probar sobre base vacía y copia restaurada.
11. **Montos.** Guardar dinero en centavos y recalcular totales en servidor.
12. **Zona horaria.** Fechas operativas y cierres usan `America/La_Paz`.
13. **Accesibilidad.** No depender solo del color; los controles deben tener texto, foco visible y área táctil suficiente.
14. **Validación mínima por tarea.** Unitarias, integración cuando toque datos, casos negativos de permisos, lint, tipos, build y prueba funcional.
15. **Tamaños para QA.** Verificar UI en 390, 768, 1024, 1280 y 1440 px.

## Estados Del Trabajo

- `Pendiente`: todavía no comenzó.
- `En progreso`: tiene implementación activa.
- `Bloqueada`: existe una decisión o dependencia que impide continuar.
- `Terminada`: cumple todos sus criterios y tiene evidencia.
- `Descartada`: Dirección decidió no realizarla y se documentó el motivo.

## Orden Por Fases

| Fase | Objetivo | Tareas |
| --- | --- | --- |
| 1 | Registrar mejor la realidad actual | 1-5 |
| 2 | Medir el recorrido y reducir pérdidas | 6-10 |
| 3 | Controlar dinero, gastos, compras e inventario | 11-12 |
| 4 | Mejorar continuidad, expansión y documentos | 13-18 |
| 5 | Asegurar y validar la operación completa | 19-20 |

---

## Tarea 1 — Registrar El Resultado De La Propuesta De Tratamiento

**Prioridad:** P1. **Responsable funcional:** Médico. **Dependencias:** auditoría de la Tarea 19 para producción amplia.

**Objetivo:** saber qué ocurrió después de que el médico explicó el tratamiento, sin obligar a Administración a adivinar ni convertir al personal de marketing en cerrador.

**Alcance funcional:**

- Agregar al plan de tratamiento un resultado: `aceptado`, `rechazado`, `necesita_tiempo`, `no_aplica` o `sin_decision`.
- Cuando se rechace o se necesite tiempo, registrar un motivo mediante opciones simples y una nota opcional.
- Si se acepta, permitir al médico enviar a Administración una orden clara con el tratamiento o servicio que debe cobrarse.
- Si necesita tiempo, crear una tarea de seguimiento para Marlen solo cuando el paciente permita contacto.
- Conservar fecha, médico y visita donde se tomó la decisión.

**Web:** mostrar la propuesta, su resultado y la orden administrativa en una misma vista. Permitir comparar propuesta, venta creada y pago sin duplicar montos.

**Móvil:** usar botones grandes para elegir el resultado y una confirmación breve antes de enviar a Caja. Evitar formularios largos durante la consulta.

**Criterios de aceptación:**

- El médico puede cerrar la propuesta en menos de un minuto.
- Administración solo recibe propuestas aceptadas o instrucciones explícitas.
- No se crea una venta automáticamente sin confirmación del médico.
- El historial permite medir propuestas, aceptaciones, rechazos y pendientes.

**Commit sugerido:** `feat(sigeco): record treatment proposal outcomes`

## Tarea 2 — Registrar Departamento Y Procedencia Geográfica

**Prioridad:** P1. **Responsable funcional:** Recepción. **Dependencias:** ninguna.

**Objetivo:** distinguir pacientes de El Alto, La Paz, Cochabamba y otros lugares para medir presencia local y validar expansión.

**Alcance funcional:**

- Separar ciudad, departamento y país cuando corresponda.
- Guardar la procedencia habitual del paciente y la procedencia de la visita si son diferentes.
- Incluir opciones rápidas para El Alto, La Paz y Cochabamba, sin impedir registrar otras ciudades.
- Normalizar nombres para evitar variantes como `Cbba`, `Cochabamba` y `Cochabmaba`.
- Permitir corregir procedencia sin borrar el valor anterior de una visita cerrada.

**Web:** filtros por ciudad y departamento en pacientes, visitas y reportes.

**Móvil:** opciones frecuentes primero, búsqueda simple y opción “Otro”. No exigir escribir direcciones completas.

**Criterios de aceptación:**

- Toda llegada nueva puede clasificarse por departamento.
- Los reportes no mezclan ciudad con departamento.
- Se puede medir cuántos pacientes llegan desde Cochabamba y cuántos regresan.

**Commit sugerido:** `feat(sigeco): capture patient geographic origin`

## Tarea 3 — Mejorar Las Fuentes De Captación

**Prioridad:** P1. **Responsables funcionales:** Recepción, Marketing y Dirección. **Dependencias:** Tarea 2.

**Objetivo:** saber qué publicación, cuenta o recomendación ayudó a que el paciente llegara, sin atribuir todo a una sola fuente.

**Alcance funcional:**

- Distinguir TikTok del Dr., TikTok de la Dra., Facebook, WhatsApp, anuncio pagado, recomendación, paciente anterior, volante, búsqueda web y otro.
- Permitir una fuente principal y fuentes de apoyo. Ejemplo: vio a la Dra. en TikTok, luego escribió por WhatsApp.
- Registrar quién recomendó cuando el paciente lo sabe, cuidando la privacidad.
- Mantener un catálogo administrable de fuentes activas; no agregar un enum nuevo por cada campaña.
- Evitar que una edición posterior cambie silenciosamente la fuente original de la llegada.

**Web:** reporte por fuente principal, fuente de apoyo, ciudad, periodo, llegadas, propuestas aceptadas, ventas e ingresos.

**Móvil:** chips con las cuentas más usadas y selección múltiple opcional. La captura no debe añadir más de 20 segundos al ingreso.

**Criterios de aceptación:**

- Las dos cuentas de TikTok y Facebook se miden por separado.
- WhatsApp puede ser canal de contacto sin borrar la fuente que originó el interés.
- Dirección puede comparar fuente, llegadas e ingresos.

**Commit sugerido:** `feat(sigeco): improve capture source attribution`

## Tarea 4 — Ordenar Los Tipos De Seguimiento

**Prioridad:** P1. **Responsable funcional:** Marlen. **Dependencias:** Tareas 1 y 5.

**Objetivo:** que cada seguimiento indique para qué se llama y qué acción debe realizarse.

**Alcance funcional:**

- Clasificar tareas como control de evolución, recordar retorno, recuperar tratamiento interrumpido, asunto administrativo o llamada médica.
- Mantener separados el tipo de tarea y su resultado.
- Permitir fecha límite, prioridad, responsable y relación con paciente, visita, tratamiento o venta.
- Escalar al médico cuando el resultado sea `requiere_llamada_medica`.
- Respetar que Yazmin no realiza seguimiento de pacientes que ya están en tratamiento.

**Web:** bandeja con filtros por tipo, fecha, estado, responsable y atraso; acciones en lote solo para reasignar o programar, nunca para inventar resultados.

**Móvil:** mostrar primero las tareas de hoy con botones llamar, WhatsApp y registrar resultado. El número debe verse sin exponer información clínica innecesaria.

**Criterios de aceptación:**

- Cada tarea tiene tipo, responsable, fecha y resultado.
- Marlen puede distinguir recuperación, control y retorno sin leer todas las notas.
- Las tareas médicas llegan al médico y no se cierran como si fueran llamadas administrativas.

**Commit sugerido:** `feat(sigeco): classify treatment follow-ups`

## Tarea 5 — Separar Consentimientos Y Preferencias De Contacto

**Prioridad:** P0. **Responsables funcionales:** Dirección y Recepción. **Dependencias:** definición aprobada por la clínica.

**Objetivo:** contactar y usar testimonios únicamente con el permiso correcto.

**Alcance funcional:**

- Separar autorización para seguimiento del tratamiento, recordatorios, educación, promociones y uso de imagen o voz.
- Registrar estado, fecha, medio de obtención, versión del texto aceptado, usuario que registró y retiro del permiso.
- No interpretar “puede recibir seguimiento” como permiso para promociones o testimonios.
- Bloquear automatizaciones cuando el permiso no existe o fue retirado.
- Definir con Dirección los textos y su conservación antes de activar la función.

**Web:** historial completo del consentimiento y filtros para auditoría.

**Móvil:** explicación corta, opciones claras y firma/confirmación solo si Dirección aprueba ese método. El retiro debe ser sencillo.

**Criterios de aceptación:**

- Cada uso tiene un permiso independiente.
- Un permiso retirado deja de habilitar nuevos contactos.
- Se puede demostrar qué texto aceptó el paciente y cuándo.

**Commit sugerido:** `feat(sigeco): separate patient communication consents`

## Tarea 6 — Reportar El Recorrido Completo Del Paciente

**Prioridad:** P1. **Responsable funcional:** Dirección. **Dependencias:** Tareas 1-5 y 19.

**Objetivo:** medir desde la llegada hasta la compra y el retorno, usando definiciones iguales para todos.

**Alcance funcional:**

- Mostrar llegadas, consultas, propuestas, aceptaciones, ventas, ingresos, abandonos, seguimientos y nuevas visitas.
- Definir cada indicador, su fórmula, zona horaria, responsable y datos excluidos.
- Permitir filtros por periodo, fuente, ciudad, departamento, médico y sucursal cuando exista.
- Separar cantidad de ventas, dinero cobrado y dinero pendiente.
- Permitir llegar desde una cifra agregada hasta los registros fuente solo con el permiso adecuado.

**Web:** panel con embudo, tendencias y tabla reconciliable. Exportación controlada en CSV o PDF cuando sea necesaria.

**Móvil:** resumen de pocos indicadores, filtros simples y acceso a detalle; no intentar copiar todas las tablas de escritorio.

**Criterios de aceptación:**

- Cada cifra coincide con una consulta documentada.
- No se cuenta una visita dos veces al cambiar de área.
- Dirección puede ver dónde se pierden pacientes y qué fuentes generan ingresos.

**Commit sugerido:** `feat(sigeco): report the complete patient journey`

## Tarea 7 — Medir Tiempo De Atención Por Área

**Prioridad:** P1. **Responsable funcional:** Dirección. **Dependencias:** Tarea 10.

**Objetivo:** detectar esperas y áreas saturadas sin usar el tiempo como castigo automático al personal.

**Alcance funcional:**

- Calcular inicio, fin y duración en Recepción, Consulta, Enfermería y Administración.
- Distinguir espera de atención activa cuando el flujo lo permita.
- Pausar o marcar casos bloqueados para no convertirlos en tiempos falsos.
- Mostrar mediana, percentiles y cantidad de casos, no solo promedio.
- Excluir visitas de prueba, canceladas o corregidas según reglas documentadas.

**Web:** tendencias por día, hora, área y sucursal; detalle de casos fuera del rango normal.

**Móvil:** indicador simple de cuánto lleva esperando cada paciente y alertas no invasivas.

**Criterios de aceptación:**

- Los tiempos se derivan de eventos de ruta, no de estimaciones manuales.
- Una visita abandonada conserva el tiempo hasta el punto de salida.
- Dirección puede identificar cuellos de botella por franja horaria.

**Commit sugerido:** `feat(sigeco): measure patient time by area`

## Tarea 8 — Registrar Abandono, Bloqueo Y Lo Que Quedó Pendiente

**Prioridad:** P1. **Responsables funcionales:** todas las áreas operativas. **Dependencias:** Tarea 4.

**Objetivo:** saber dónde se detuvo una visita, por qué y si corresponde recuperar al paciente.

**Alcance funcional:**

- Registrar punto de salida, motivo, área, usuario, fecha y nota opcional.
- Usar motivos simples: tiempo de espera, costo, no aceptó tratamiento, emergencia personal, no respondió, falta de insumo, derivación, otro.
- Indicar qué quedó pendiente: consulta, estudio, aplicación, cobro, entrega o seguimiento.
- Crear seguimiento para Marlen cuando corresponda y exista consentimiento.
- Permitir corrección mediante un nuevo evento, sin reescribir el abandono original.

**Web:** historial de ruta con bloqueos y pendientes; reporte por punto y motivo.

**Móvil:** acción “No continuará” disponible sin esconderla en menús, con motivo obligatorio y nota opcional.

**Criterios de aceptación:**

- Una visita puede salir desde cualquier área.
- Los pendientes no desaparecen al cerrar la ruta.
- Los reportes distinguen abandono, cancelación y atención completada.

**Commit sugerido:** `feat(sigeco): record abandonment and blocked work`

## Tarea 9 — Detectar Y Fusionar Pacientes Duplicados

**Prioridad:** P1. **Responsables funcionales:** Recepción y Super administrador. **Dependencias:** Tarea 19.

**Objetivo:** evitar expedientes separados para una misma persona y unirlos sin perder historia.

**Alcance funcional:**

- Alertar por teléfono normalizado, nombre y fecha de nacimiento al crear o editar.
- Crear una cola de posibles duplicados.
- Comparar datos antes de fusionar y mostrar cuántas visitas, ventas, pagos, seguimientos y registros clínicos se moverán.
- Ejecutar la fusión en una transacción, conservar el identificador anterior como alias y registrar auditoría.
- No permitir fusión masiva ni eliminación del expediente original sin mecanismo de recuperación.

**Web:** comparación lado a lado y simulación previa.

**Móvil:** prevención y aviso al registrar; la fusión compleja se realiza en escritorio.

**Criterios de aceptación:**

- Editar el teléfono también verifica duplicados.
- La fusión no deja relaciones huérfanas.
- Abrir un enlace antiguo dirige al expediente vigente.

**Commit sugerido:** `feat(sigeco): safely merge duplicate patients`

## Tarea 10 — Actualizar Las Bandejas Entre Áreas

**Prioridad:** P1. **Responsable funcional:** Operación. **Dependencias:** base de calidad y auditoría de Tarea 19.

**Objetivo:** que cada área vea con rapidez las nuevas llegadas, indicaciones, pagos y cambios de estado.

**Alcance funcional:**

- Implementar primero actualización periódica controlada, indicador de última actualización y botón manual.
- Pausar consultas cuando la pestaña está oculta o el dispositivo está sin conexión.
- Conservar filtros, selección y formularios sin guardar.
- Medir si se necesita SSE o WebSocket antes de añadir complejidad.
- Actualizar eventos de visita, tareas, órdenes, pagos y stock.

**Web:** bandejas visibles en varias estaciones con actualización no disruptiva.

**Móvil:** reducir consumo de datos y batería; avisar cuando la lista puede estar desactualizada.

**Criterios de aceptación:**

- Un cambio aparece dentro del tiempo acordado sin recargar la página completa.
- No se duplican solicitudes al volver de segundo plano.
- Una actualización externa no borra un formulario que el usuario está llenando.

**Commit sugerido:** `feat(sigeco): refresh operational queues safely`

## Tarea 11 — Caja, Dinero Al Personal, Gastos Y Cierre Diario

**Prioridad:** P0. **Responsables funcionales:** Administración y Dirección. **Dependencias:** Tarea 19 para auditoría. La recepción de compras que afectan stock se completa en la Tarea 12.

**Objetivo:** registrar todo el dinero que entra y sale de Caja, saber a quién se entregó, por qué y si el efectivo físico coincide con SIGECO.

### 11.1 Apertura Y Sesión De Caja

- Crear una sesión por sucursal, caja, fecha, turno y usuario responsable.
- Registrar efectivo inicial, hora de apertura y observación.
- Impedir dos sesiones abiertas incompatibles para la misma caja.
- Definir permisos separados para abrir, registrar movimientos, anular y cerrar.
- Los pagos por QR, transferencia o tarjeta se muestran en la conciliación, pero no aumentan el efectivo esperado.

### 11.2 Dinero Diario Para Almuerzo U Otros Apoyos

Registrar:

- Fecha y hora.
- Categoría: almuerzo, transporte u otro.
- Empleado beneficiario.
- Monto individual.
- Persona que entrega y usuario que registra.
- Caja y sucursal de origen.
- Motivo y nota opcional.
- Autorizador cuando la política lo requiera.

Una sola entrega puede incluir varias personas, pero debe guardar una línea por beneficiario y monto. La suma de las líneas debe ser igual al egreso total. Ejemplo: Bs 20 para Marlen y Bs 20 para María se registra como un egreso de Bs 40 con dos beneficiarias identificables.

### 11.3 Compra Urgente Desde Caja

Registrar:

- Categoría: inyectables, material clínico, limpieza, oficina u otro.
- Artículo o concepto.
- Cantidad, precio unitario y total.
- Proveedor opcional cuando todavía no está registrado.
- Persona que solicitó la compra.
- Persona que recibió el dinero.
- Caja y sucursal de origen.
- Motivo de urgencia.
- Comprobante o fotografía opcional al crear, con estado `pendiente` hasta adjuntarlo si Dirección lo exige.
- Indicación de si la compra debe aumentar inventario.

Si afecta inventario, no crear una entrada de stock suelta: debe continuar en la recepción de compra de la Tarea 12.

### 11.4 Otros Egresos

- Permitir categorías administrables sin convertir Caja en una contabilidad completa.
- Exigir descripción, monto, receptor y motivo.
- No usar egresos negativos ni editar el monto histórico para corregir.

### 11.5 Anulación, Devolución Y Corrección

- Un pago o egreso confirmado no se elimina.
- Anular crea un movimiento compensatorio enlazado al original, con motivo y autorizador.
- Evitar doble anulación o devolución mayor al monto disponible.
- Si una venta con producto se revierte, coordinar el efecto en inventario: devolución física confirmada, producto dañado o sin retorno.

### 11.6 Cierre Diario

Calcular en servidor:

```text
Efectivo esperado =
  efectivo inicial
  + cobros en efectivo
  + otros ingresos en efectivo
  - dinero para almuerzo o personal
  - compras urgentes pagadas en efectivo
  - otros egresos en efectivo
  - devoluciones en efectivo
```

Registrar efectivo contado, diferencia, observación, usuario que cierra y aprobación de Dirección cuando la diferencia exceda el límite definido. Mostrar por separado QR, tarjeta y transferencia.

### 11.7 Reportes De Caja Y Gastos

- Dinero entregado por empleado, día, semana y mes.
- Egresos por categoría, persona que recibió, usuario que registró y sucursal.
- Compras con comprobante pendiente.
- Ingresos por forma de pago.
- Diferencias de caja y su explicación.
- Anulaciones y devoluciones.
- Detalle para reconstruir cada cierre desde sus movimientos.

**Propuesta de datos:** ampliar `CashMovement` con sesión, categoría, estado, sucursal, operación original y operación compensatoria. Crear entidades separadas para sesión de caja, egreso y líneas de beneficiarios; no guardar todos los datos en `description`.

**Permisos sugeridos:**

- Administración puede abrir su Caja, cobrar, registrar egresos y solicitar cierre.
- Dirección puede revisar cierres, aprobar diferencias y autorizar anulaciones o devoluciones.
- Solo usuarios expresamente autorizados pueden anular, reabrir o registrar ajustes.
- Recepción, Enfermería, Médico y Yazmin no pueden registrar ni modificar movimientos de Caja.

**Web:**

- Pantalla “Caja de hoy” con apertura, resumen, movimientos, filtros y cierre.
- Formulario rápido para dinero al personal y formulario detallado para compras.
- Tabla conciliable y vista imprimible del cierre.
- Dirección puede revisar cierres y diferencias sin modificar movimientos.

**Móvil:**

- Botones principales: cobrar, entregar dinero, registrar compra y ver resumen.
- Importes con teclado numérico, total siempre visible y confirmación final.
- Permitir tomar foto del comprobante, comprimirla y subirla de forma segura.
- Si la conexión falla, conservar el borrador de forma segura, pero no mostrar el egreso como confirmado ni descontar Caja hasta que el servidor responda.

**Criterios de aceptación:**

- Cada salida de dinero identifica destino, motivo y responsable.
- Una entrega múltiple reconcilia el total con sus beneficiarios.
- Caja esperada se deriva de movimientos confirmados.
- Cerrar dos veces o registrar sobre una caja cerrada se bloquea.
- Ningún pago, egreso o cierre se corrige borrando historia.
- Los cierres cuadran con sus movimientos en pruebas concurrentes.

**Commit sugerido:** `feat(sigeco): add cash expenses allowances and daily close`

## Tarea 12 — Productos, Compras, Proveedores, Lotes Y Stock

**Prioridad:** P0. **Responsable funcional:** Administración. **Dependencias:** Tareas 11 y 19.

**Objetivo:** controlar qué se compra, cuánto costó, qué ingresó realmente, qué lote vence y cómo afectó Caja e inventario.

### 12.1 Catálogo De Productos

Administración podrá:

- Crear productos nuevos.
- Modificar nombre, descripción, categoría, unidad, precio de venta, costo referencial y stock mínimo.
- Clasificar el producto como `venta`, `uso_interno` o `ambos`.
- Activar o desactivar sin borrar historia.
- Asociar uno o varios proveedores; el proveedor preferido es opcional.
- Corregir datos actuales mediante historial de cambios. El código interno no debe reutilizarse para otro producto.

### 12.2 Proveedores

- Crear, editar, activar y desactivar proveedores.
- Registrar nombre, teléfono, contacto, notas y datos comerciales necesarios.
- Consultar compras, gasto total, productos suministrados y entregas pendientes.
- No eliminar un proveedor que ya tiene compras; solo desactivarlo.

### 12.3 Compra

- Registrar proveedor, sucursal, fecha, documento, moneda, subtotal, descuento y total.
- Agregar líneas con producto, cantidad pedida, costo unitario y total calculado.
- Estados sugeridos: borrador, confirmada, recibida_parcial, recibida, anulada.
- Distinguir forma de pago: Caja, transferencia, crédito u otro.
- Una compra desde Caja debe crear su egreso enlazado una sola vez.
- Una compra a crédito no debe disminuir el efectivo hasta registrar el pago.

### 12.4 Recepción E Ingreso De Stock

Por cada producto recibido:

- Cantidad recibida.
- Costo unitario y total.
- Lote cuando corresponda.
- Fecha de vencimiento cuando corresponda.
- Fecha y documento de recepción.
- Persona que recibió y usuario que registró.
- Sucursal y ubicación de destino.

Una compra puede recibirse parcialmente. Cada recepción aumenta stock una sola vez y genera movimientos append-only vinculados a compra, línea, lote, usuario y sucursal.

### 12.5 Lotes, Vencimientos Y Salidas

- Alertar productos próximos a vencer y vencidos.
- Mostrar primero el lote que vence antes como recomendación FEFO.
- Bloquear la venta de un lote vencido si Dirección aprueba esa política.
- Registrar pérdidas por vencimiento, daño o merma como ajuste autorizado con motivo.
- En una devolución de venta, definir si el producto vuelve a stock y a qué lote.

### 12.6 Relación Entre Compra, Caja E Inventario

```text
Compra pagada desde Caja
        ↓
Egreso de Caja confirmado
        ↓
Recepción real de productos
        ↓
Entrada de stock por producto y lote
```

El pago y la recepción pueden suceder en momentos diferentes. Deben estar vinculados, pero no se debe aumentar stock solo por registrar que se entregó dinero. El stock aumenta cuando Administración confirma que recibió los productos.

### 12.7 Reportes

- Compras por proveedor, categoría, sucursal y periodo.
- Productos y lotes ingresados.
- Costos históricos por producto.
- Recepciones parciales pendientes.
- Productos por vencer y vencidos.
- Stock actual y stock mínimo por sucursal.
- Movimientos por producto, lote, usuario y motivo.
- Compras pagadas desde Caja y su egreso asociado.

**Propuesta de datos:** conservar `InventoryItem` e `InventoryMovement`; ampliar el catálogo y crear entidades para compra, líneas, recepciones y lotes. Cada movimiento debe poder enlazarse a sucursal, compra, recepción y lote. `currentStock` sigue siendo un saldo transaccional respaldado por movimientos.

**Permisos sugeridos:**

- Administración puede administrar catálogo, proveedores, compras y recepciones.
- Dirección puede revisar costos, compras, vencimientos, traslados y reportes.
- Los ajustes de stock, mermas y devoluciones requieren un permiso más sensible que una entrada normal.
- Médico y Enfermería pueden consultar disponibilidad cuando sea útil, pero no cambiar costos ni existencias.
- Yazmin no accede a compras, costos ni inventario.

**Web:**

- Catálogo con búsqueda, filtros, edición y activación.
- Flujo de compra con tabla de líneas y cálculo automático.
- Recepción parcial en una pantalla que compare pedido contra recibido.
- Kardex por producto y lote, y panel de vencimientos.

**Móvil:**

- Crear producto y registrar entrada con pocos campos iniciales; mostrar campos de lote solo cuando apliquen.
- Escanear código o buscar por nombre/código interno cuando se defina soporte.
- Cámara para comprobante y lector de fecha amigable.
- Resumen fijo con cantidad y total antes de confirmar.

**Criterios de aceptación:**

- Administración puede crear y actualizar productos sin scripts.
- Una recepción aumenta stock exactamente una vez.
- Compra, egreso y entrada pueden rastrearse entre sí.
- Una compra parcial conserva lo pendiente.
- Los costos y lotes históricos no cambian al editar el producto actual.
- No se elimina historial de stock.

**Commit sugerido:** `feat(sigeco): add procurement batches and product management`

## Tarea 13 — Encuestas Y Reclamos Después De Validar El Proceso Manual

**Prioridad:** P2. **Responsable funcional:** Dirección. **Dependencias:** Tarea 5 y un piloto manual aprobado.

**Objetivo:** escuchar al paciente sin automatizar un proceso que la clínica todavía no haya probado.

**Alcance funcional:**

- Primero probar preguntas, responsable, tiempo de respuesta y escalamiento de manera manual.
- Cuando el proceso funcione, registrar encuesta, calificación, comentario, reclamo, estado y responsable.
- Separar una opinión general de un posible incidente clínico.
- Definir plazo de atención y escalamiento a Dirección.
- No publicar testimonios desde esta información sin autorización de imagen/voz.

**Web:** bandeja de reclamos, responsables, vencimientos y tendencias sin exponer nombres en reportes generales.

**Móvil:** formulario corto y accesible desde un enlace seguro; bandeja interna con acciones rápidas.

**Criterios de aceptación:**

- La automatización solo se activa después de documentar el piloto manual.
- Un reclamo crítico se diferencia de una encuesta.
- El paciente puede responder sin ver información interna.

**Commit sugerido:** `feat(sigeco): add governed feedback and complaints`

## Tarea 14 — Recordatorios Automatizados Con Consentimiento Y Supervisión

**Prioridad:** P1. **Responsable funcional:** Marlen. **Dependencias:** Tareas 4, 5 y 19.

**Objetivo:** reducir tareas repetitivas sin enviar mensajes equivocados o no autorizados.

**Alcance funcional:**

- Crear plantillas versionadas para retorno, control y recuperación.
- Definir reglas por evento, fecha y tipo de seguimiento.
- Generar tareas de forma idempotente: la misma regla no crea duplicados.
- Empezar con mensajes preparados para revisión humana; automatizar el envío solo después de medir errores.
- Respetar canal preferido, horarios permitidos y retiro de consentimiento.
- Registrar intento, resultado, error, reintento y usuario supervisor.

**Web:** constructor sencillo de reglas, vista previa, activación y tablero de fallos.

**Móvil:** lista de mensajes pendientes de revisar, abrir WhatsApp/llamada y registrar resultado.

**Criterios de aceptación:**

- `no_contact` bloquea la tarea automática.
- Toda regla tiene responsable, versión, estado y fecha de activación.
- Los fallos no desaparecen y los reintentos no duplican mensajes.

**Commit sugerido:** `feat(sigeco): automate supervised patient reminders`

## Tarea 15 — Preparar SIGECO Para El Alto Y Cochabamba

**Prioridad:** P1 antes de abrir la sucursal. **Responsable funcional:** Dirección. **Dependencias:** Tareas 2, 6, 11, 12 y 19.

**Objetivo:** operar más de una sucursal sin mezclar pacientes, dinero, stock o responsabilidades.

**Alcance funcional:**

- Crear sucursales administrables y asignarlas a visitas, usuarios, cajas, ventas, pagos, compras, inventario y reportes.
- Mantener un expediente único del paciente, aunque visite dos sucursales.
- Definir si un usuario trabaja en una o varias sucursales y cuál es su sucursal activa.
- Separar stock por producto y sucursal; los traslados generan salida y entrada enlazadas.
- Separar sesiones y cierres de Caja.
- Permitir reportes consolidados a Dirección y vistas limitadas por sucursal para otros roles.
- Preparar El Alto como primera sucursal y Cochabamba sin activarla hasta tener personal, inventario inicial y permisos.

**Web:** selector de sucursal visible, comparación entre sedes y administración de traslados.

**Móvil:** recordar la sucursal activa, mostrarla en el encabezado y pedir confirmación al cambiar antes de registrar.

**Criterios de aceptación:**

- Ninguna operación financiera o de stock queda sin sucursal.
- Cambiar de sucursal no mezcla colas ni Caja.
- Dirección puede ver consolidado y detalle.
- La apertura de Cochabamba se prueba con datos sintéticos antes de activarse.

**Commit sugerido:** `feat(sigeco): support controlled multi-branch operations`

## Tarea 16 — Mejorar Uso Móvil Y Conectividad Lenta

**Prioridad:** P1. **Responsable funcional:** equipo técnico con personal real. **Dependencias:** Tareas 10 y 19.

**Objetivo:** que SIGECO siga siendo usable en teléfonos y conexiones inestables sin duplicar registros.

**Alcance funcional:**

- Medir los flujos más usados y reducir pasos, escritura y desplazamiento.
- Mostrar estado online, sin conexión, guardando, guardado y error.
- Usar claves idempotentes en pagos, egresos, visitas y movimientos de stock.
- Guardar borradores locales solo cuando el riesgo lo permita; limpiar datos al cerrar sesión.
- No almacenar historia clínica completa ni adjuntos sensibles en caché por defecto.
- Definir una ficha manual de contingencia para cortes largos y cómo se carga después.

**Web:** mantener productividad con teclado, tablas y varias columnas sin romper tamaños medianos.

**Móvil:** navegación inferior o acciones principales accesibles, objetivos táctiles de al menos 44 px, teclado correcto y cámara cuando aporte valor.

**Criterios de aceptación:**

- Reintentar no duplica cobros, egresos, visitas ni entradas.
- El usuario distingue un borrador de un registro confirmado.
- Logout limpia la información local aprobada.
- Los flujos críticos se prueban con red lenta y corte temporal.

**Commit sugerido:** `feat(sigeco): improve mobile and degraded connectivity`

## Tarea 17 — Recetas Y Comprobantes Imprimibles

**Prioridad:** P2. **Responsables funcionales:** Médico, Administración y Dirección. **Dependencias:** Tareas 1, 11 y 19.

**Objetivo:** entregar documentos claros que coincidan con la información registrada.

**Alcance funcional:**

- Confirmar requisitos clínicos, fiscales y de identidad antes de diseñar.
- Generar receta desde el registro médico y comprobante desde venta/pagos.
- Incluir versión, fecha, paciente, responsable y datos aprobados de la clínica.
- Registrar generación, descarga y reimpresión.
- Evitar texto libre que contradiga la fuente.

**Web:** vista previa de impresión y PDF controlado.

**Móvil:** vista legible, compartir solo por mecanismo aprobado e impresión cuando exista dispositivo compatible.

**Criterios de aceptación:**

- Totales, productos y pagos coinciden con la venta.
- Una corrección genera una nueva versión.
- La reimpresión no modifica el registro original.

**Commit sugerido:** `feat(sigeco): generate prescriptions and payment receipts`

## Tarea 18 — Preparar La Integración Entre Payload Y SIGECO

**Prioridad:** P2. **Responsables funcionales:** Marketing y TI. **Dependencias:** Tareas 3, 5 y 19.

**Objetivo:** relacionar campañas y llegadas sin enviar historia clínica al sistema de contenido o marketing.

**Alcance funcional:**

- Documentar propiedad de datos: Payload gestiona contenido y campañas; SIGECO gestiona pacientes y operación clínica.
- Usar identificadores o parámetros de campaña para llevar fuente hacia SIGECO.
- Permitir reportes agregados de conversión sin devolver diagnósticos, tratamientos, notas o identidad del paciente a Marketing.
- Definir contrato, autenticación, límites, reintentos y auditoría antes de habilitar integración.
- Mantener captura manual como respaldo.

**Web:** configuración de fuentes y reporte agregado.

**Móvil:** preservar parámetros de origen al abrir formularios autorizados; no exponerlos en pantallas clínicas innecesarias.

**Criterios de aceptación:**

- Existe un mapa aprobado de datos que pueden cruzar.
- Ningún dato clínico regresa a Payload.
- Un fallo de integración no impide registrar la llegada.

**Commit sugerido:** `docs(architecture): define payload sigeco integration`

## Tarea 19 — Completar Seguridad, Auditoría Y Recuperación

**Prioridad:** P0. **Responsables funcionales:** equipo técnico y Dirección. **Dependencias:** CI y staging aislado.

**Objetivo:** proteger la información clínica y financiera antes de ampliar usuarios, automatizaciones o sucursales.

**Subtareas obligatorias:**

1. CI reproducible con lint, tipos, pruebas, PostgreSQL, migraciones y build.
2. Staging aislado con datos sintéticos.
3. Auditoría append-only de accesos y acciones clínicas, financieras, inventario, archivos, permisos y exportaciones.
4. Administración de usuarios, desactivación, desbloqueo, revisión de roles y revocación de sesiones.
5. Adjuntos privados con autorización, límites, checksum, descarga temporal y backup.
6. Backups cifrados, política de retención y prueba real de restauración.
7. Runbook de incidentes, responsables, rotación de secretos y simulacro.
8. Revisión negativa de permisos: intentar acceder por URL y action con cada rol no autorizado.

Esta tarea agrupa el gate de seguridad, pero puede ejecutarse en varios commits controlados. Las tareas P0 del [backlog técnico anterior](../sigeco-mejoras-futuras/tareas-de-mejoras.md) contienen el detalle base y deben cerrarse dentro de este gate.

**Web:** visor de auditoría y usuarios solo para roles autorizados; mensajes de error seguros.

**Móvil:** sesiones con expiración clara, cierre remoto y ausencia de datos sensibles en notificaciones o caché.

**Criterios de aceptación:**

- Se restaura base y archivos desde un backup real.
- Desactivar un usuario invalida su acceso.
- Las acciones críticas generan auditoría sin guardar secretos.
- Un rol no obtiene datos entrando directamente a una URL o action.
- Dirección aprueba el resultado del simulacro.

**Commit sugerido:** `feat(sigeco): complete clinical security readiness`

## Tarea 20 — Probar SIGECO Con El Personal En Una Operación Real

**Prioridad:** P0 antes de declarar el plan terminado. **Responsable funcional:** Dirección. **Dependencias:** Tareas 1-19 según el módulo a pilotear.

**Objetivo:** confirmar que el sistema ayuda a trabajar y no solo que pasa pruebas técnicas.

**Alcance funcional:**

- Crear datos de prueba y capacitar por rol, no con una explicación general para todos.
- Ejecutar un recorrido completo: llegada, consulta, propuesta, venta, pago, entrega, stock, seguimiento y retorno.
- Ejecutar un recorrido financiero: apertura, cobros, dinero para almuerzo, compra urgente, recepción de producto y cierre.
- Probar abandono en varias áreas y corrección sin borrado.
- Probar teléfono, tableta y computadora con conectividad real de la clínica.
- Registrar dudas, errores, tiempo por tarea y cambios solicitados.
- Hacer piloto controlado en El Alto antes de preparar Cochabamba.
- Definir soporte, responsable de incidentes y forma de volver temporalmente al proceso manual.

**Web:** probar estaciones de Recepción, Consulta, Administración y Dirección.

**Móvil:** probar tareas frecuentes con cada persona que realmente las hará, no solo con el equipo técnico.

**Criterios de aceptación:**

- Cada rol completa sus tareas sin acceder a información prohibida.
- Caja e inventario cuadran al final del piloto.
- No quedan defectos críticos ni dudas operativas sin responsable.
- Dirección firma la aprobación del despliegue por módulo y sucursal.

**Commit sugerido:** `test(sigeco): validate complete clinic operation`

## Gate De Cierre De Cada Tarea

Una tarea solo pasa a `Terminada` cuando:

1. Cumple todos sus criterios de aceptación.
2. Tiene migración y rollback operacional documentados cuando corresponde.
3. Pasa unitarias, integración, lint, tipos y build aplicables.
4. Se prueban permisos permitidos y denegados.
5. Se valida en web y móvil en los tamaños definidos.
6. Se actualizan este plan, el archivo de progreso y la documentación técnica afectada.
7. Se registra evidencia: comandos, capturas o resultados del piloto.

## Fuera De Este Plan

- Facturación tributaria avanzada sin requisitos confirmados.
- Aplicación móvil nativa; se mejora primero la web responsive.
- Telemedicina, portal de pacientes e inteligencia artificial clínica.
- Interoperabilidad FHIR pública.
- Contabilidad completa, plan de cuentas o reemplazo de un sistema contable.
