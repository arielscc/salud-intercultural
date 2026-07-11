# Prueba Del Flujo Completo Sigeco V3.7

Guia operativa para validar el flujo vigente desde recepcion hasta cierre o seguimiento.

## Objetivo

Confirmar que:

- El paciente se registra una sola vez.
- Cada llegada abre una visita independiente.
- Consulta recibe el contexto de recepcion sin volver a pedirlo.
- Las tareas llegan al area correcta.
- La salida o abandono queda trazado.
- Ventas, pagos y stock son consistentes.
- Los permisos impiden acceso a modulos no autorizados.

## Preparacion

```bash
docker compose up -d postgres
pnpm internal:seed
pnpm dev
```

Usar solo base local o staging aislado. Nunca ejecutar QA destructivo contra produccion.

Requisitos:

- Usuario `super_admin` local.
- Un producto activo con stock suficiente.
- Viewports 390x844 y 1440x900.
- Herramientas del navegador abiertas para revisar errores.

No registrar passwords en reportes o commits.

## Escenario Base

Usar datos facilmente identificables, por ejemplo:

| Campo | Valor sugerido |
| --- | --- |
| Nombre | `Paciente QA V37` |
| Telefono | Numero local no usado |
| Motivo | `Prueba completa V3.7` |
| Tipo | `Primera consulta` |
| Preferencia | `WhatsApp` |

## 1. Login Y Dashboard

1. Abrir `/sigeco/login`.
2. Ingresar con el usuario QA.
3. Confirmar dashboard, rol y navegacion.
4. Verificar KPIs: pacientes de hoy, activas, abandonos, seguimientos y stock.
5. Confirmar accesos `Buscar paciente` y `Registrar llegada` segun permisos.

## 2. Recepcion Y Funnel

1. Abrir `/sigeco/recepcion/nuevo`.
2. Buscar por telefono para comprobar que no exista duplicado.
3. Elegir `Es paciente nuevo`.
4. Completar nombre y telefono.
5. Completar motivo. El resto es opcional.
6. Registrar llegada.

Resultado esperado:

- Se crea una ficha y una visita.
- La visita queda `En recepcion` con ruta activa.
- Existe check-in, historial y tarea de recepcion.
- El dashboard incrementa pacientes del dia y visitas activas.

Repetir desde la ficha con `Registrar llegada` para confirmar que una nueva visita no duplica al paciente.

## 3. Edicion De Paciente

1. Abrir la ficha desde `Recepcion -> Pacientes`.
2. Elegir `Editar ficha`.
3. Corregir ciudad, antecedentes o preferencia.
4. Guardar.

Resultado esperado: mismo ID y codigo interno, sin nuevo paciente.

## 4. Consulta Prellenada

1. Derivar la visita a `Medico / En consulta`.
2. Abrirla desde `/sigeco/consultas`.
3. Confirmar motivo, duracion, tipo, atencion previa, estudios, edad, alergias, enfermedad de base y medicacion.
4. Confirmar que el motivo no se solicita de nuevo.
5. Registrar diagnostico principal y datos clinicos necesarios.
6. Abrir receta, evolucion u orden solo si se usan.

Resultado esperado: consulta guardada y contexto de recepcion intacto.

## 5. Caminos De Salida

Probar en visitas separadas:

### Consulta A Enfermeria

1. Crear orden para enfermeria.
2. Elegir `Enviar a enfermeria`.
3. Confirmar tarea en `/sigeco/enfermeria`.

### Consulta A Administracion

1. Crear orden administrativa.
2. Elegir `Enviar a administracion`.
3. Confirmar pendiente en `/sigeco/administracion`.

### Salida Directa

1. Elegir `Se va - cerrar visita`.
2. Confirmar estado final y ruta inactiva.

### Abandono

1. Desde una visita activa elegir `Se retiro sin completar`.
2. Confirmar que sale de la lista activa.
3. Abrir el detalle y revisar area, nota e historial.
4. Confirmar que no aparecen acciones de cierre o derivacion.
5. Intentar una transicion server-side en pruebas: debe devolver `VISIT_ALREADY_CLOSED`.

## 6. Enfermeria

1. Abrir la tarea indicada.
2. Confirmar que se abre el formulario correspondiente a la orden.
3. Registrar signos, aplicacion o estudio.
4. Agregar nota y completar tarea.

Resultado esperado: registros visibles en consulta y ficha del paciente.

## 7. Administracion E Inventario

1. Abrir el pendiente administrativo.
2. Crear venta con producto inventariable y pago parcial.
3. Completar el saldo desde el detalle de venta.
4. Confirmar movimientos de caja y descuento de stock.
5. Cerrar la visita.

Prueba negativa:

1. Solicitar una cantidad superior al stock.
2. Confirmar alerta con producto, disponible y solicitado.
3. Confirmar que no se creo venta, pago ni movimiento de caja.

## 8. Seguimiento

1. Crear tarea desde la ficha del paciente.
2. Confirmar que aparece en hoy, vencidos o proximos.
3. Registrar intento y resultado.
4. Revisar historial del paciente.
5. Si la preferencia es `no_contact`, confirmar advertencia antes de contactar.

## 9. Matriz De Roles

| Rol | Debe ver |
| --- | --- |
| Recepcion | Inicio, Recepcion, Seguimiento; puede registrar llegada. |
| Seguimiento | Inicio y Seguimiento; sin registro de llegada. |
| Medico | Inicio, Recepcion lectura, Consulta, Enfermeria lectura y Seguimiento. |
| Enfermeria | Inicio, Recepcion lectura y Enfermeria. |
| Administracion | Inicio, Recepcion lectura, Caja, Seguimiento e Inventario. |
| Direccion | Todos los modulos en lectura; sin registrar llegada. |

Para cada rol:

1. Revisar sidebar.
2. Abrir un modulo permitido.
3. Escribir directamente una URL no permitida.
4. Confirmar redirect a `/sigeco`.
5. Verificar que acciones de escritura no autorizadas no aparecen.

## 10. Responsive Y Regresiones

En 390x844 recorrer:

- Dashboard.
- Recepcion, pacientes, funnel, ficha, edicion y visita.
- Consulta lista y detalle.
- Enfermeria lista y detalle.
- Caja lista, tarea y venta.
- Seguimientos lista y detalle.
- Inventario lista y detalle.

Confirmar:

- Sin desplazamiento horizontal del documento.
- Tablas anchas desplazan dentro de su contenedor.
- Botones y textos no se superponen.
- Formularios conservan labels y estados de error.

Regresiones externas:

- Las diez rutas publicas cargan en movil y escritorio.
- `/admin` carga o redirige a `/admin/login`.
- Sitemap y robots responden.
- El formulario publico conserva `/api/leads`; este endpoint no es el modulo interno retirado.

## 11. Validacion Tecnica

Detener `next dev` y ejecutar:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm run build
```

## Criterio De Aprobacion

V3.7 puede promoverse a staging cuando:

- Todos los comandos pasan.
- No hay fallos criticos, altos o medios abiertos.
- La matriz de roles pasa.
- Los cuatro caminos de salida conservan historial.
- No hay overflow de pagina a 390px.
- Sitio publico y CMS no presentan regresiones.
- Los pendientes clinicos y operativos no resueltos estan documentados y aceptados.

## Evidencia

Registrar:

- Fecha y ambiente.
- Commit probado.
- Usuario y rol, sin password.
- Paciente y visita QA.
- Comandos y conteos.
- Hallazgos, correcciones y revalidacion.
- Capturas de dashboard, flujo cerrado y mobile.
