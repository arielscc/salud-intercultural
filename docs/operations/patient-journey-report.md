# Reporte Del Recorrido Completo Del Paciente

Guía operativa de la Tarea 22. El reporte vive en
`/sigeco/reportes/recorrido` y solo está disponible para Dirección y el super
administrador mediante `reports_read`.

## Propietario, Tiempo Y Unidad

- **Propietario funcional:** Dirección.
- **Zona horaria:** `America/La_Paz`.
- **Unidad principal:** una visita (`Visit`).
- **Fecha del período:** `Visit.checkedInAt`, es decir, la llegada a la clínica.

Una visita conserva el mismo identificador aunque pase por Recepción, Consulta,
Enfermería o Administración. Por eso esos cambios no aumentan las llegadas.

El reporte es una cohorte de llegadas: una venta o un seguimiento se atribuyen
a la visita seleccionada aunque se hayan registrado después. Esto permite
comparar qué ocurrió con las personas que llegaron durante un período.

## Fórmulas

| Indicador | Fórmula |
| --- | --- |
| Llegadas | Cantidad de visitas cuya llegada está dentro del período y filtros. |
| Pacientes diferentes | Identificadores de paciente distintos dentro de esas visitas. |
| Consultas | Visitas que tienen `ClinicalConsultation`, en borrador o finalizada. |
| Consultas finalizadas | Consultas cuyo estado vigente es `finalized`. |
| Propuestas | Visitas con una decisión vigente distinta de `not_applicable`. |
| Aceptadas | Visitas cuya decisión vigente es `accepted`. |
| Visitas con compra | Visitas con una o más ventas no anuladas. |
| Cantidad de ventas | Filas `Sale` no anuladas enlazadas a las visitas. |
| Dinero vendido | Suma de `Sale.totalCents` no anuladas. |
| Dinero cobrado | Suma de `Sale.paidCents`, neta de devoluciones registradas. |
| Dinero pendiente | Suma de `Sale.balanceCents`. |
| Abandonos | Visitas con `VisitDiscontinuation`. |
| Seguimientos | Tareas `FollowUpTask` enlazadas a la visita. |
| Primera visita | `Visit.intakeType = first_visit`. |
| Retorno | Control de tratamiento, problema nuevo o revisión de resultados. |

El embudo cuenta visitas distintas. La cantidad de ventas se muestra aparte
porque una visita puede tener más de una.

## Propuesta Vigente

Las decisiones de tratamiento son append-only. El reporte usa solamente el
evento que no fue reemplazado (`supersededBy = null`). Una decisión anterior no
se suma otra vez.

## Fuente Y Dinero

La fuente corresponde únicamente al toque principal de
`VisitAttributionTouch`. Los apoyos no duplican la llegada. Si una visita no
tiene fuente principal, aparece como **Sin fuente registrada** y no desaparece
del total.

La tabla por fuente ordena por dinero cobrado. Esto ayuda a identificar fuentes
que generan llegadas y ventas, pero no afirma rentabilidad neta porque SIGECO
todavía no distribuye el costo de campaña por visita.

## Filtros

- Período de 7, 30 o 90 días, rango personalizado o historial completo.
- Fuente principal.
- Ciudad de procedencia de la visita.
- Médico responsable de la consulta.
- Sucursal donde se registró la llegada.

La Tarea 22 agrega `Visit.branchCode`. Las visitas históricas y las nuevas usan
`el-alto`. La selección y administración de nuevas sucursales se implementará
en la Tarea 28.

## Exclusiones

- Ventas anuladas no se suman.
- Ventas sin `visitId` no forman parte del recorrido porque no pueden
  atribuirse con seguridad a una llegada.
- Una venta no se atribuye por fecha propia: pertenece a la cohorte de llegada
  de su visita.
- No se inventa una fuente, médico o ciudad cuando falta el dato.
- No existe un indicador automático de “datos de prueba”; antes de producción
  Dirección debe confirmar cómo identificarlos o retirarlos del ambiente.

## Reconciliación Y Calidad

La tabla final muestra todas las visitas que forman las cifras. Cada fila enlaza
al registro fuente y presenta:

- paciente y llegada;
- procedencia, fuente, médico y sucursal;
- consulta y decisión vigentes;
- cantidad de ventas;
- dinero vendido y cobrado;
- seguimiento y abandono.

Los avisos de calidad resaltan visitas sin fuente y ventas que no tienen una
aceptación vigente. No se corrigen automáticamente: Dirección revisa la fila y
el área responsable corrige el registro fuente mediante el flujo permitido.

## Web Y Móvil

- Escritorio muestra indicadores, embudo, tendencia, fuentes y tabla completa.
- Móvil prioriza seis indicadores, un embudo vertical y tarjetas tocables por
  visita.
- La tendencia incluye días sin actividad como cero.
- La tabla usa paginación sin alterar los totales del reporte.

## Antes De Producción

- Ejecutar integración completa, lint global, build y QA gstack acumulado.
- Comparar una muestra manual contra visitas, propuestas, ventas y pagos.
- Validar filtros y permisos en staging.
- Confirmar nombres reales de sucursales y el tratamiento de datos de prueba.
- No aplicar la migración ni publicar el reporte sin aviso y autorización
  expresa.

