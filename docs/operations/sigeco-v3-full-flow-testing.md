# Guia De Prueba Manual - Flujo Completo V3 Sigeco

Esta guia sirve para probar el flujo funcional completo implementado hasta **V3.6 Inventario** en Sigeco.

Objetivo: confirmar que la clinica puede seguir el ciclo operativo principal:

```txt
Lead -> Paciente -> Visita -> Consulta -> Enfermeria -> Administracion -> Cobro -> Inventario -> Seguimiento
```

Usar esta guia antes de dar por lista una entrega V3, antes de promover a staging y cada vez que se toquen modelos, permisos, formularios o rutas internas de Sigeco.

## Alcance

Incluye:

- Login interno.
- CRM de leads.
- Conversion a paciente.
- Recepcion y apertura de visita.
- Ruta activa del paciente.
- Consulta medica.
- Indicaciones clinicas.
- Enfermeria, signos vitales, aplicaciones, estudios y notas.
- Administracion, venta, cobro y comprobante interno.
- Inventario, stock, movimientos y alertas.
- Seguimiento posterior.
- Revision final en ficha del paciente y dashboard.

No incluye todavia:

- Carga real de adjuntos clinicos.
- Impresion formal de recetas o comprobantes.
- Realtime/polling entre areas.
- Auditoria append-only transversal para todos los cambios.
- QA por todos los roles de produccion.

## Precondiciones

1. Estar en la rama de trabajo correcta, normalmente `develop`.
2. Tener dependencias instaladas con `pnpm install`.
3. Tener la base PostgreSQL local disponible.
4. Tener `.env` local configurado segun [Variables de entorno](./environment-variables.md).
5. Haber aplicado migraciones.
6. Tener un usuario interno `super_admin` local.
7. Probar al menos una vez en viewport mobile de 390px de ancho.

Comandos base:

```bash
docker compose up -d postgres
pnpm db:migrate
INTERNAL_ADMIN_EMAIL="sigeco@saludintercultural.local" INTERNAL_ADMIN_PASSWORD="usar-una-clave-local-segura" pnpm internal:seed
pnpm dev
```

Abrir:

```txt
http://localhost:3000/sigeco/login
```

Notas:

- No versionar contrasenas reales.
- Si el login falla por intentos previos, volver a correr `pnpm internal:seed` con email y password locales.
- Si el navegador mantiene una sesion vieja, cerrar sesion o probar en ventana privada.

## Datos Sugeridos Para QA

Usar datos claramente identificables para limpiar o revisar despues.

Paciente:

```txt
Nombre: Paciente QA V3 Completo
Telefono: 70000003
Ciudad: La Paz
Sintomas generales: Dolor lumbar y cansancio
Intencion de visita: Evaluacion integral
```

Lead:

```txt
Fuente: WhatsApp
Estado esperado inicial: Nuevo
Resultado de contacto: Quiere visitar
```

Inventario:

```txt
Codigo interno: QA-SUERO-V3
SKU: QA-SUERO-001
Nombre: Suero QA V3
Unidad: unidad
Stock minimo: 1
Stock inicial: 2
```

Venta:

```txt
Tipo: Suero
Producto inventariable: Suero QA V3
Descripcion: Suero QA V3 aplicado en consulta
Cantidad: 1
Precio unitario: 100
Cobro inicial: 50
Forma de pago inicial: Efectivo
```

Seguimiento:

```txt
Titulo: Seguimiento QA V3
Resultado: Mejoro
Metodo: Llamada
```

## Criterios Generales De Aprobacion

Durante todo el recorrido verificar:

- No aparecen errores de servidor ni pantallas 500.
- Los formularios muestran errores claros cuando faltan campos requeridos.
- Las acciones exitosas redirigen o refrescan con datos nuevos visibles.
- No hay overflow horizontal en 390px.
- Los textos largos no se pisan ni salen de botones, tarjetas o tablas.
- La informacion queda asociada al paciente correcto.
- Las bandejas muestran las tareas nuevas en el area correspondiente.
- Los totales de venta, cobros y saldo son coherentes.
- El stock baja despues de una venta inventariable.
- La ficha del paciente muestra la historia completa al final.

## Flujo End-To-End

### 1. Login Interno

Ruta:

```txt
/sigeco/login
```

Pasos:

1. Iniciar sesion con el usuario interno local.
2. Confirmar redireccion a `/sigeco`.
3. Confirmar que el dashboard carga sin errores.

Resultado esperado:

- El usuario entra al dashboard interno.
- Se ven accesos o metricas de Sigeco.

Evidencia sugerida:

- Screenshot del dashboard.
- Nota del usuario usado, sin registrar password.

### 2. Crear Producto De Inventario

Ruta:

```txt
/sigeco/inventario
```

Pasos:

1. Crear `Suero QA V3` con los datos sugeridos.
2. Abrir el detalle del producto.
3. Confirmar stock actual, minimo y movimientos.

Resultado esperado:

- El producto queda creado.
- El stock inicial queda visible.
- No debe existir alerta abierta todavia si el stock inicial es 2 y el minimo es 1.
- Se puede abrir `/sigeco/inventario/{itemId}`.

Evidencia sugerida:

- Screenshot de la lista de inventario.
- Screenshot del detalle del producto.

### 3. Crear Lead

Ruta:

```txt
/sigeco/leads/nuevo
```

Pasos:

1. Crear un lead con el nombre `Paciente QA V3 Completo`.
2. Completar telefono, ciudad, fuente, sintomas e intencion de visita.
3. Guardar.

Resultado esperado:

- El lead queda creado.
- El sistema abre el detalle del lead o lo deja visible en el pipeline.

Validar tambien:

- Si se intenta guardar sin nombre o telefono, el sistema debe bloquear y mostrar error.

### 4. Gestionar Lead

Ruta:

```txt
/sigeco/leads/{leadId}
```

Pasos:

1. Registrar un contacto con metodo `Llamada`.
2. Usar resultado `Quiere visitar`.
3. Cambiar estado a `Quiere visitar` o `Confirmo asistencia`.
4. Crear un recordatorio futuro.

Resultado esperado:

- El historial comercial muestra el contacto.
- El estado del lead cambia.
- El recordatorio queda asociado al lead.

### 5. Convertir Lead A Paciente

Ruta:

```txt
/sigeco/leads/{leadId}
```

Pasos:

1. Presionar `Convertir a paciente`.
2. Confirmar que el formulario de paciente recibe datos del lead.
3. Completar datos faltantes si corresponde.
4. Crear paciente.

Resultado esperado:

- Se crea la ficha permanente del paciente.
- El lead queda marcado como `Convertido`.
- El paciente queda disponible en `/sigeco/pacientes`.

### 6. Abrir Visita Desde Recepcion

Ruta:

```txt
/sigeco/pacientes/{patientId}
```

Pasos:

1. En la ficha del paciente, registrar llegada.
2. Completar `Motivo de visita`.
3. Completar una nota de recepcion.
4. Presionar `Abrir visita`.

Resultado esperado:

- Se crea una visita activa.
- La visita queda en estado `En recepcion`.
- La ficha del paciente muestra la visita.

Ruta de validacion:

```txt
/sigeco/visitas
```

Confirmar que la visita aparece en la bandeja de visitas activas.

### 7. Derivar A Consulta Medica

Ruta:

```txt
/sigeco/visitas/{visitId}
```

Pasos:

1. En `Derivar paciente`, cambiar estado a `En consulta`.
2. Cambiar area destino a `Medico`.
3. Agregar una nota breve.
4. Guardar ruta.

Resultado esperado:

- La ruta activa muestra el paso hacia medico.
- La visita queda disponible en `/sigeco/consultas`.

### 8. Registrar Consulta Medica

Ruta:

```txt
/sigeco/consultas/{visitId}
```

Pasos:

1. Completar `Motivo`.
2. Completar `Diagnostico principal`.
3. Agregar hallazgos, observaciones, plan de tratamiento e indicaciones.
4. Completar la receta rapida si aplica.
5. Guardar consulta.

Resultado esperado:

- La consulta queda guardada.
- El detalle mantiene los datos despues de refrescar.
- No se pierden diagnosticos ni receta.

Validar tambien:

- Si faltan `Motivo` o `Diagnostico principal`, el sistema debe bloquear el guardado.

### 9. Crear Indicacion Para Enfermeria

Ruta:

```txt
/sigeco/consultas/{visitId}
```

Pasos:

1. En `Indicacion para otra area`, elegir tipo `Suero` o `Aplicacion clinica`.
2. Elegir area destino `Enfermeria`.
3. Escribir indicacion: `Aplicar Suero QA V3 y registrar signos vitales`.
4. Guardar indicacion.

Resultado esperado:

- La orden clinica aparece con estado `Pendiente`.
- La bandeja de enfermeria recibe una tarea.

Ruta de validacion:

```txt
/sigeco/enfermeria
```

### 10. Ejecutar Tarea De Enfermeria

Ruta:

```txt
/sigeco/enfermeria/{workItemId}
```

Pasos:

1. Cambiar estado de tarea a `En proceso`.
2. Guardar nota de avance.
3. Registrar signos vitales.
4. Registrar aplicacion clinica de `Suero QA V3`.
5. Registrar un estudio con nombre `Estudio QA V3`.
6. Registrar una nota de enfermeria.
7. Cambiar estado de tarea a `Completada`.

Resultado esperado:

- Los signos vitales quedan asociados a la visita.
- La aplicacion queda asociada a paciente, visita y orden clinica.
- El estudio queda visible.
- La nota de enfermeria queda en la historia.
- La tarea queda completada.

Validacion cruzada:

```txt
/sigeco/pacientes/{patientId}
```

La ficha del paciente debe mostrar timeline de enfermeria y estudios.

### 11. Crear Indicacion Para Administracion

Ruta:

```txt
/sigeco/consultas/{visitId}
```

Pasos:

1. Crear otra indicacion.
2. Elegir tipo `Administracion` o `Suero`.
3. Elegir area destino `Administracion`.
4. Escribir indicacion: `Cobrar Suero QA V3 aplicado`.
5. Guardar.

Resultado esperado:

- La orden queda asociada a administracion.
- La bandeja administrativa muestra un pendiente.

Ruta de validacion:

```txt
/sigeco/administracion
```

### 12. Registrar Venta Administrativa

Ruta:

```txt
/sigeco/administracion/{workItemId}
```

Pasos:

1. Crear venta con tipo `Suero`.
2. Seleccionar producto inventariable `Suero QA V3`.
3. Completar descripcion, cantidad `1`, precio unitario `100` y cobro inicial `50`.
4. Usar forma de pago `Efectivo`.
5. Guardar venta.

Resultado esperado:

- La venta queda creada.
- El estado queda `Parcial`.
- El total es Bs 100.
- El cobro inicial es Bs 50.
- El saldo pendiente es Bs 50.
- La venta aparece en la tarea y enlaza al comprobante interno.

Validar tambien:

- Si se intenta vender una cantidad mayor al stock disponible, el sistema debe bloquear la operacion. Actualmente se debe revisar que el error visible sea claro; si no lo es, registrar bug.

### 13. Completar Cobro

Ruta:

```txt
/sigeco/administracion/ventas/{saleId}
```

Pasos:

1. Revisar el comprobante interno.
2. Confirmar items, total, cobrado y saldo.
3. Registrar pago restante de Bs 50.
4. Guardar.

Resultado esperado:

- La venta queda `Pagado`.
- El saldo pendiente queda en Bs 0.
- El historial de pagos muestra ambos pagos.
- La caja registra el movimiento.

### 14. Validar Descuento De Inventario

Ruta:

```txt
/sigeco/inventario/{itemId}
```

Pasos:

1. Volver al producto `Suero QA V3`.
2. Revisar stock actual.
3. Revisar movimientos.
4. Revisar alertas abiertas.

Resultado esperado:

- El stock baja de 2 a 1.
- Existe movimiento `Salida por venta`.
- Como el stock queda igual al minimo, debe existir alerta abierta de stock bajo.

### 15. Crear Seguimiento Desde Ficha De Paciente

Ruta:

```txt
/sigeco/pacientes/{patientId}
```

Pasos:

1. Crear seguimiento con titulo `Seguimiento QA V3`.
2. Definir fecha y hora futura o de hoy.
3. Agregar nota.
4. Guardar.

Resultado esperado:

- El seguimiento queda asociado al paciente.
- Aparece en la bandeja de seguimientos.

Ruta de validacion:

```txt
/sigeco/seguimientos
```

### 16. Registrar Resultado De Seguimiento

Ruta:

```txt
/sigeco/seguimientos/{taskId}
```

Pasos:

1. Verificar accesos rapidos de llamada o WhatsApp.
2. Registrar contacto con metodo `Llamada`.
3. Elegir resultado `Mejoro`.
4. Guardar nota de cierre.

Resultado esperado:

- El seguimiento cambia de estado.
- El intento queda registrado.
- La ficha del paciente muestra el historial de seguimiento.

### 17. Revision Final En Ficha Del Paciente

Ruta:

```txt
/sigeco/pacientes/{patientId}
```

Verificar que la ficha concentre:

- Datos permanentes del paciente.
- Visita abierta durante QA.
- Consulta medica.
- Ruta o tareas de visita.
- Timeline de enfermeria.
- Estudios.
- Cronologia administrativa.
- Venta y pagos.
- Seguimiento.

Resultado esperado:

- La historia se entiende sin tener que buscar manualmente en cada modulo.
- No aparecen datos de otro paciente.
- Las fechas y estados son coherentes.

### 18. Revision Final Del Dashboard

Ruta:

```txt
/sigeco
```

Verificar:

- Indicadores comerciales.
- Indicadores de visitas o tareas.
- Indicadores administrativos.
- Indicador de stock bajo si aplica.
- Accesos a bandejas principales.

Resultado esperado:

- Las metricas reflejan la actividad generada durante QA.
- No hay errores visuales en mobile.

## Matriz De Evidencias

Guardar evidencia minima por corrida:

| Paso | Evidencia |
| --- | --- |
| Login | Screenshot dashboard `/sigeco`. |
| Inventario | Producto creado y detalle con stock inicial. |
| Lead | Detalle con contacto, estado y recordatorio. |
| Paciente | Ficha creada desde lead. |
| Visita | Visita activa y ruta hacia medico. |
| Consulta | Consulta guardada con diagnostico e indicaciones. |
| Enfermeria | Tarea completada con signos, aplicacion, estudio y nota. |
| Administracion | Venta parcial y luego pagada. |
| Inventario post venta | Movimiento `Salida por venta` y alerta abierta. |
| Seguimiento | Intento registrado y estado actualizado. |
| Ficha final | Historia consolidada del paciente. |
| Mobile | Capturas en 390px de pantallas con formularios largos. |

## Pruebas Negativas Minimas

Ejecutar al menos una vez por release candidata:

1. Login con password incorrecto.
2. Crear lead sin telefono.
3. Crear paciente sin telefono.
4. Abrir visita sin motivo.
5. Guardar consulta sin diagnostico principal.
6. Crear indicacion sin texto.
7. Registrar venta sin descripcion.
8. Registrar venta inventariable con cantidad mayor al stock.
9. Registrar pago mayor al saldo.
10. Crear producto de inventario sin codigo interno.

Cada caso debe bloquear la accion y mostrar un error entendible.

## Validacion Tecnica Despues Del QA

Despues de corregir bugs encontrados, correr:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm run build
pnpm test:integration
```

Si el cambio toca migraciones, queries, ventas, pagos, inventario o permisos, `pnpm test:integration` es obligatorio.

## Bugs Que Se Deben Registrar Con Prioridad Alta

Registrar como bloqueo antes de staging si ocurre:

- Un usuario sin permiso puede ver o editar datos clinicos.
- Una venta calcula mal total, cobro o saldo.
- Un pago se duplica al refrescar.
- El stock queda negativo.
- Una venta inventariable no genera movimiento de inventario.
- Una orden clinica queda sin tarea en el area destino.
- La ficha del paciente mezcla datos de otro paciente.
- Una pantalla clave falla en mobile 390px.

## Limitaciones Esperadas De La V3 Actual

Estas limitaciones no bloquean la prueba funcional, pero deben quedar visibles en el reporte:

- Las bandejas pueden requerir refrescar porque realtime/polling formal no esta implementado.
- La carga real de archivos clinicos todavia no esta habilitada.
- El formato imprimible de receta y comprobante puede requerir definicion de la clinica.
- La auditoria transversal completa sigue pendiente.
- La prueba con roles distintos a `super_admin` requiere usuarios internos adicionales.

## Cierre De Corrida

Al terminar, documentar:

- Fecha y ambiente.
- Rama y commit probado.
- Usuario/rol usado, sin password.
- Resultado general: aprobado, aprobado con observaciones o bloqueado.
- Bugs encontrados con ruta, pasos y evidencia.
- Pantallas revisadas en mobile.
- Comandos de validacion tecnica ejecutados.

Registrar el resultado como reporte de tarea o evidencia de QA si la corrida acompana una entrega.
