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

## Pantallas Y Formularios Cubiertos

Esta guia cubre las pantallas V3 actuales de Sigeco:

| Ruta | Que se prueba |
| --- | --- |
| `/sigeco/login` | Login interno. |
| `/sigeco` | Dashboard operativo. |
| `/sigeco/inventario` | Alta de producto y metricas de inventario. |
| `/sigeco/inventario/{itemId}` | Detalle de producto, entrada de stock, ajuste autorizado y movimientos. |
| `/sigeco/leads` | Busqueda y filtros de leads. |
| `/sigeco/leads/nuevo` | Alta de lead. |
| `/sigeco/leads/{leadId}` | Estado, contacto, recordatorio y conversion a paciente. |
| `/sigeco/pacientes` | Busqueda de pacientes. |
| `/sigeco/pacientes/nuevo` | Alta manual o desde lead. |
| `/sigeco/pacientes/{patientId}` | Ficha, llegada, visitas, historia clinica, administracion y seguimiento. |
| `/sigeco/visitas` | Filtro de visitas activas o por estado. |
| `/sigeco/visitas/{visitId}` | Derivacion y ruta del paciente. |
| `/sigeco/consultas` | Bandeja de pacientes derivados a medico. |
| `/sigeco/consultas/{visitId}` | Consulta medica e indicaciones para otras areas. |
| `/sigeco/enfermeria` | Bandeja de tareas de enfermeria. |
| `/sigeco/enfermeria/{workItemId}` | Estado de tarea, signos, aplicacion, estudio y nota. |
| `/sigeco/administracion` | Bandeja de pendientes administrativos y metricas de ventas. |
| `/sigeco/administracion/{workItemId}` | Registro de venta. |
| `/sigeco/administracion/ventas/{saleId}` | Comprobante interno y cobro final. |
| `/sigeco/seguimientos` | Bandeja de seguimientos vencidos, de hoy y proximos. |
| `/sigeco/seguimientos/{taskId}` | Registro de intento de seguimiento. |

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

Datos que debes ingresar:

| Campo | Valor QA | Para que sirve |
| --- | --- | --- |
| Email | `sigeco@saludintercultural.local` o el email sembrado con `INTERNAL_ADMIN_EMAIL` | Identifica al usuario interno que entra a Sigeco. |
| Password | La clave local usada en `INTERNAL_ADMIN_PASSWORD` | Valida que el usuario tiene acceso al sistema interno. No guardar passwords reales en docs ni commits. |

### 2. Crear Producto De Inventario

Ruta:

```txt
/sigeco/inventario
```

Pasos:

1. Crear `Suero QA V3` con los datos sugeridos.
2. Confirmar que el sistema redirige automaticamente al detalle del producto.
3. Confirmar stock actual, minimo y movimientos.

Resultado esperado:

- El producto queda creado.
- El stock inicial queda visible.
- No debe existir alerta abierta todavia si el stock inicial es 2 y el minimo es 1.
- Se puede abrir `/sigeco/inventario/{itemId}`.

Evidencia sugerida:

- Screenshot de la lista de inventario.
- Screenshot del detalle del producto.

Datos que debes ingresar:

| Campo | Valor QA | Para que sirve |
| --- | --- | --- |
| Codigo interno | `QA-SUERO-V3` | Identificador operativo interno del producto. Sirve para que administracion e inventario reconozcan el item sin depender del nombre comercial. |
| SKU | `QA-SUERO-001` | Codigo alternativo o de proveedor. Sirve para conciliacion futura con compras, etiquetas o sistemas externos. |
| Nombre | `Suero QA V3` | Nombre visible del producto en inventario y en el selector de ventas. |
| Unidad | `unidad` | Define como se mide el stock. En este caso cada suero descuenta una unidad. |
| Stock minimo | `1` | Umbral que dispara alerta de stock bajo cuando el stock actual queda igual o por debajo. |
| Stock inicial | `2` | Cantidad disponible inicial. Permite probar una venta inventariable y que luego aparezca alerta al quedar en `1`. |
| Descripcion | `Producto de prueba para validar descuento automatico desde ventas V3.` | Contexto interno para saber por que existe el producto y evitar confundirlo con stock real. |

Pantalla siguiente automatica:

```txt
/sigeco/inventario/{itemId}
```

Cuando se crea el producto, Sigeco abre su detalle. Esta pantalla tiene datos del producto y dos formularios adicionales.

Datos que debes revisar en el detalle:

| Dato | Valor esperado | Para que sirve |
| --- | --- | --- |
| Codigo interno | `QA-SUERO-V3` | Confirma que estas en el producto QA correcto. |
| Nombre | `Suero QA V3` | Confirma que el producto creado es el que luego seleccionaras en venta. |
| Stock actual | `2 unidad` | Confirma que el stock inicial creo una entrada de inventario. |
| Stock minimo | `1 unidad` | Confirma el umbral que luego dispara alerta de stock bajo. |
| Estado | `Activo` | Indica que el producto puede usarse en ventas. |
| Movimientos | Debe existir una `Entrada` por `Stock inicial` | Prueba que inventario trabaja con movimientos y no solo con un numero editable. |

Formulario `Entrada de stock`:

Este formulario sirve para registrar compras, reposiciones o ingresos fisicos de producto. **No lo llenes durante el flujo principal**, porque subiria el stock y cambiaria la validacion posterior de alerta. Usalo solo si quieres probar especificamente entradas de inventario, idealmente con otro producto QA.

| Campo | Valor QA opcional | Para que sirve |
| --- | --- | --- |
| Cantidad | `3` | Suma stock disponible con un movimiento de entrada. Debe ser un entero positivo. |
| Motivo | `Ingreso QA para validar movimientos de inventario` | Explica por que entro stock. Queda visible en el historial de movimientos. |

Resultado esperado si pruebas este formulario:

- El stock actual aumenta en la cantidad indicada.
- Aparece un movimiento `Entrada`.
- Si habia alerta abierta y el stock supera el minimo, la alerta deberia resolverse.

Formulario `Ajuste autorizado`:

Este formulario sirve para corregir diferencias de conteo fisico, mermas o correcciones autorizadas. **No lo llenes durante el flujo principal** si quieres conservar stock `2` antes de la venta. Usalo despues de terminar el flujo o con otro producto QA.

| Campo | Valor QA opcional | Para que sirve |
| --- | --- | --- |
| Diferencia | `-1` | Aplica una diferencia sobre el stock actual. Negativo descuenta, positivo suma. No puede ser `0`. |
| Motivo | `Ajuste QA por conteo fisico simulado` | Justifica la correccion y deja trazabilidad administrativa. |

Resultado esperado si pruebas este formulario:

- El stock cambia por la diferencia indicada.
- Aparece un movimiento `Ajuste autorizado`.
- El sistema debe bloquear ajustes que dejen stock negativo.

### 3. Crear Lead

Ruta inicial:

```txt
/sigeco/leads
```

Esta pantalla es la bandeja de leads. Ahi se prueban busqueda y filtros; desde el boton `Nuevo` se navega al formulario de creacion.

Ruta de alta:

```txt
/sigeco/leads/nuevo
```

Esta pantalla solo contiene el formulario `Nuevo lead`.

Pasos:

1. Entrar primero a `/sigeco/leads`.
2. Probar los filtros de la bandeja.
3. Ir a `Nuevo`.
4. Crear un lead con el nombre `Paciente QA V3 Completo`.
5. Completar telefono, ciudad, fuente, sintomas e intencion de visita.
6. Guardar.

Resultado esperado:

- El lead queda creado.
- El sistema abre el detalle del lead en `/sigeco/leads/{leadId}`.

Validar tambien:

- Si se intenta guardar sin telefono o con telefono invalido, el sistema debe bloquear y mostrar error.
- El nombre se ingresa en esta corrida QA, pero actualmente no es obligatorio en la interfaz ni en el schema; si el negocio decide exigirlo, registrar ese cambio como bug o historia de producto.

Datos que debes ingresar:

En `/sigeco/leads`, formulario de filtros:

| Campo | Valor QA | Para que sirve |
| --- | --- | --- |
| Buscar | `Paciente QA V3` o dejar vacio antes de crear el lead | Busca por nombre, telefono, email o ciudad. Sirve para ubicar leads existentes. |
| Estado | `Todos los estados` antes de crear, luego `Quiere visitar` para validar filtro | Filtra el pipeline por estado comercial. |
| Fuente | `Todas las fuentes` antes de crear, luego `WhatsApp` | Filtra por canal de captacion. |

En `/sigeco/leads/nuevo`, formulario `Nuevo lead`:

| Campo | Valor QA | Para que sirve |
| --- | --- | --- |
| Nombre | `Paciente QA V3 Completo` | Identifica al interesado antes de convertirse en paciente. |
| Telefono | `70000003` | Canal principal de contacto comercial. Es requerido para seguimiento por llamada o WhatsApp. |
| Email | `paciente.qa.v3@example.com` | Canal opcional para contacto o referencia futura. |
| Ciudad | `La Paz` | Ayuda a segmentar procedencia del interesado y coordinar visita. |
| Fuente | `WhatsApp` | Registra de donde llego el lead. Sirve para medir captacion y origen de pacientes. |
| Sintomas generales | `Dolor lumbar y cansancio` | Resume el motivo de interes inicial antes de la evaluacion clinica formal. |
| Intencion de visita | `Evaluacion integral` | Indica que espera hacer el interesado en la clinica. Ayuda a priorizar y preparar recepcion. |
| Fecha estimada de visita | Fecha de hoy o manana | Permite organizar recordatorios y confirmar asistencia. |
| Observaciones comerciales | `Lead creado para QA end-to-end V3.` | Nota comercial para que el equipo entienda el contexto de la conversacion. |

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

Datos que debes ingresar en `Actualizar estado`:

| Campo | Valor QA | Para que sirve |
| --- | --- | --- |
| Estado | `Quiere visitar` | Mueve el lead dentro del pipeline comercial. |
| Nota | `Paciente confirma interes y solicita evaluacion integral.` | Explica por que se cambio el estado. Sirve para historial comercial. |

Datos que debes ingresar en `Registrar contacto`:

| Campo | Valor QA | Para que sirve |
| --- | --- | --- |
| Metodo | `Llamada` | Indica por que canal se contacto al interesado. |
| Resultado | `Quiere visitar` | Registra el resultado del contacto para priorizar siguientes acciones. |
| Notas | `Se informa disponibilidad y el paciente indica que asistira.` | Deja evidencia de la conversacion comercial. |

Datos que debes ingresar en `Crear recordatorio`:

| Campo | Valor QA | Para que sirve |
| --- | --- | --- |
| Fecha y hora | Manana a las `09:00` | Programa una accion futura para no perder el seguimiento comercial. |
| Nota | `Confirmar asistencia antes de la visita QA.` | Explica que debe hacer el equipo cuando llegue el recordatorio. |

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

Pantalla relacionada:

```txt
/sigeco/pacientes
```

Antes o despues de convertir, usa esta bandeja para confirmar que el paciente existe.

Datos que debes ingresar en `Buscar pacientes`:

| Campo | Valor QA | Para que sirve |
| --- | --- | --- |
| Buscar | `Paciente QA V3 Completo` o `70000003` | Busca por nombre, telefono, codigo interno o ciudad. Sirve para abrir la ficha correcta. |

Datos que debes ingresar o confirmar:

Cuando el paciente viene desde `Convertir a paciente`, varios campos llegan precargados desde el lead. Revisarlos y completar lo faltante.

| Campo | Valor QA | Para que sirve |
| --- | --- | --- |
| Nombre completo | `Paciente QA V3 Completo` | Nombre legal u operativo de la ficha permanente del paciente. |
| Telefono | `70000003` | Contacto principal para recepcion, seguimiento y WhatsApp. |
| Telefono alternativo | `70000004` | Segundo canal de contacto si el telefono principal no responde. |
| Fecha nacimiento | `1985-07-03` | Dato clinico y administrativo para edad, identificacion y contexto de atencion. |
| Genero | `No especificado` | Dato demografico. Usar esta opcion si no se confirma durante QA. |
| Ciudad | `La Paz` | Procedencia del paciente. |
| Departamento | `La Paz` | Ubicacion regional para reportes o coordinacion. |
| Direccion | `Calle QA 123` | Referencia de domicilio si la clinica la necesita para contacto o gestion administrativa. |
| Fuente captacion | `WhatsApp` | Mantiene trazabilidad entre captacion comercial y ficha del paciente. |
| Alergias | `Niega alergias conocidas para prueba QA.` | Informacion clinica permanente que debe estar visible para el equipo. |
| Antecedentes relevantes | `Antecedente QA: dolor lumbar recurrente.` | Contexto clinico de largo plazo para futuras visitas. |
| Observaciones generales | `Ficha creada durante prueba end-to-end V3.` | Nota general no clinica estricta para reconocer la ficha de prueba. |

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

Datos que debes revisar en la ficha antes de abrir visita:

| Seccion | Valor esperado | Para que sirve |
| --- | --- | --- |
| Encabezado del paciente | `Paciente QA V3 Completo`, telefono `70000003`, fuente `WhatsApp` | Confirma que estas abriendo visita al paciente correcto. |
| Ficha permanente | Alergias, antecedentes y observaciones cargadas al crear paciente | Da contexto clinico al equipo antes de atender. |
| Visitas | Puede estar vacia antes de la primera llegada | Muestra el historial de atenciones del paciente. |

Datos que debes ingresar:

| Campo | Valor QA | Para que sirve |
| --- | --- | --- |
| Motivo de visita | `Evaluacion integral por dolor lumbar y cansancio` | Motivo operativo de la visita actual. Es la razon por la que recepcion abre el circuito de atencion. |
| Nota de recepcion | `Paciente llega para prueba QA V3, derivar a consulta medica.` | Contexto inicial para el equipo que recibira al paciente. |

### 7. Derivar A Consulta Medica

Ruta:

```txt
/sigeco/visitas/{visitId}
```

Pasos:

1. Entrar primero a `/sigeco/visitas`.
2. Probar el filtro de visitas.
3. Abrir la visita del paciente QA.
4. En `Derivar paciente`, cambiar estado a `En consulta`.
5. Cambiar area destino a `Medico`.
6. Agregar una nota breve.
7. Guardar ruta.

Resultado esperado:

- La ruta activa muestra el paso hacia medico.
- La visita queda disponible en `/sigeco/consultas`.

Datos que debes ingresar en `/sigeco/visitas`, filtro de visitas:

| Campo | Valor QA | Para que sirve |
| --- | --- | --- |
| Estado | `Solo activas` | Muestra las visitas no cerradas. Despues puedes probar `En consulta` para verificar la derivacion. |

Datos que debes ingresar:

| Campo | Valor QA | Para que sirve |
| --- | --- | --- |
| Estado | `En consulta` | Actualiza la etapa de la visita. Sirve para que el paciente aparezca en la bandeja correcta. |
| Area destino | `Medico` | Define el area responsable del siguiente paso en la ruta. |
| Nota | `Recepcion deriva a medico para evaluacion QA.` | Explica la derivacion y queda en la ruta del paciente. |

### 8. Registrar Consulta Medica

Ruta:

```txt
/sigeco/consultas/{visitId}
```

Pasos:

1. Entrar primero a `/sigeco/consultas`.
2. Confirmar que el paciente QA aparece en la bandeja medica.
3. Abrir `/sigeco/consultas/{visitId}`.
4. Completar `Motivo`.
5. Completar `Diagnostico principal`.
6. Agregar hallazgos, observaciones, plan de tratamiento e indicaciones.
7. Completar la receta rapida si aplica.
8. Guardar consulta.

Resultado esperado:

- La consulta queda guardada.
- El detalle mantiene los datos despues de refrescar.
- No se pierden diagnosticos ni receta.

Validar tambien:

- Si faltan `Motivo` o `Diagnostico principal`, el sistema debe bloquear el guardado.

Datos que debes revisar en `/sigeco/consultas`:

| Dato | Valor esperado | Para que sirve |
| --- | --- | --- |
| Paciente | `Paciente QA V3 Completo` | Confirma que recepcion derivo la visita al area medica. |
| Estado | `En consulta` | Confirma que la ruta esta en el estado correcto para atencion medica. |
| Mensaje `Consulta registrada` | No debe aparecer antes de guardar; debe aparecer si vuelves despues de guardar | Sirve para distinguir pacientes pendientes de pacientes ya atendidos. |

Datos que debes ingresar:

| Campo | Valor QA | Para que sirve |
| --- | --- | --- |
| Motivo | `Dolor lumbar y cansancio de varios dias de evolucion.` | Describe por que se realiza la consulta medica. Es requerido. |
| Diagnostico principal | `Lumbalgia mecanica en evaluacion` | Diagnostico central de la atencion. Es requerido para cerrar una consulta util. |
| Diagnostico secundario | `Fatiga inespecifica` | Diagnostico complementario si existe. Ayuda a ordenar problemas clinicos asociados. |
| Hallazgos | `Dolor lumbar a la movilizacion, sin signos de alarma durante QA.` | Registra hallazgos del examen o entrevista clinica. |
| Observaciones | `Caso de prueba para validar persistencia de consulta V3.` | Nota clinica adicional. |
| Plan de tratamiento | `Indicar suero, control de signos vitales y seguimiento telefonico.` | Plan que orienta acciones posteriores de enfermeria, administracion y seguimiento. |
| Indicaciones | `Registrar signos vitales, aplicar suero QA y coordinar cobro administrativo.` | Instrucciones medicas para otras areas o para el paciente. |
| Medicamento | `Suero QA V3` | Item de receta rapida. Sirve para dejar una indicacion terapeutica simple. |
| Dosis | `1 unidad` | Cantidad indicada del medicamento o insumo. |
| Frecuencia | `Unica vez` | Periodicidad de la indicacion. |
| Duracion | `Durante la visita` | Tiempo de uso o aplicacion. |
| Observaciones receta | `Receta rapida generada para prueba QA.` | Nota adicional asociada a la receta. |
| Evolucion | `Paciente estable durante la evaluacion QA.` | Registro de evolucion clinica dentro de la visita. |

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

Datos que debes ingresar:

| Campo | Valor QA | Para que sirve |
| --- | --- | --- |
| Tipo | `Suero` | Clasifica la orden clinica. Ayuda a enfermeria a entender el tipo de accion. |
| Area destino | `Enfermeria` | Crea una tarea para la bandeja de enfermeria. |
| Indicacion | `Aplicar Suero QA V3 y registrar signos vitales.` | Instruccion principal que debe ejecutar enfermeria. Es requerida. |
| Detalle | `Usar producto QA y documentar aplicacion, estudio y nota de enfermeria.` | Amplia la indicacion para reducir ambiguedad operativa. |

### 10. Ejecutar Tarea De Enfermeria

Ruta:

```txt
/sigeco/enfermeria/{workItemId}
```

Pasos:

1. Entrar primero a `/sigeco/enfermeria`.
2. Confirmar que aparece la tarea derivada desde consulta.
3. Abrir `/sigeco/enfermeria/{workItemId}`.
4. Cambiar estado de tarea a `En proceso`.
5. Guardar nota de avance.
6. Registrar signos vitales.
7. Registrar aplicacion clinica de `Suero QA V3`.
8. Registrar un estudio con nombre `Estudio QA V3`.
9. Registrar una nota de enfermeria.
10. Cambiar estado de tarea a `Completada`.

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

Datos que debes revisar en `/sigeco/enfermeria`:

| Dato | Valor esperado | Para que sirve |
| --- | --- | --- |
| Paciente | `Paciente QA V3 Completo` | Confirma que la orden clinica creo tarea en la bandeja correcta. |
| Titulo | `Aplicar Suero QA V3 y registrar signos vitales.` o texto equivalente de la indicacion | Permite identificar que tarea debe ejecutar enfermeria. |
| Estado | `Pendiente` o `Recibida` antes de trabajarla | Indica el avance de la tarea. |
| Tipo de orden | `Suero` o `Aplicacion clinica` | Ayuda a enfermeria a distinguir el tipo de accion. |

Datos que debes ingresar en `Estado tarea`:

| Campo | Valor QA | Para que sirve |
| --- | --- | --- |
| Estado | `En proceso` al iniciar, luego `Completada` | Refleja el avance real de la tarea recibida desde consulta. |
| Nota | `Enfermeria toma tarea QA y ejecuta indicacion.` | Deja trazabilidad del cambio de estado. |

Estados disponibles:

| Estado | Para que sirve |
| --- | --- |
| `Recibida` | Indica que enfermeria ya vio o recibio la tarea. |
| `En proceso` | Indica que la tarea se esta ejecutando. |
| `Completada` | Cierra la tarea despues de registrar la atencion. |
| `Bloqueada` | Marca que no se puede ejecutar por falta de insumo, duda medica u otro impedimento. |

Datos que debes ingresar en `Signos vitales`:

| Campo | Valor QA | Para que sirve |
| --- | --- | --- |
| Temperatura C | `36.7` | Registra temperatura corporal. |
| Saturacion O2 | `97` | Registra oxigenacion. |
| Presion sistolica | `118` | Valor superior de presion arterial. |
| Presion diastolica | `76` | Valor inferior de presion arterial. |
| Pulso | `74` | Frecuencia cardiaca. |
| Respiracion | `16` | Frecuencia respiratoria. |
| Peso kg | `70.5` | Peso del paciente para contexto clinico. |
| Talla cm | `170` | Talla del paciente para contexto clinico. |
| Observaciones | `Signos vitales dentro de parametros esperados durante QA.` | Nota interpretativa de enfermeria. |

Datos que debes ingresar en `Aplicacion clinica`:

| Campo | Valor QA | Para que sirve |
| --- | --- | --- |
| Medicamento/insumo | `Suero QA V3` | Indica que se aplico al paciente. |
| Cantidad | `1 unidad` | Cantidad administrada o usada. |
| Via | `Intravenosa` | Via de administracion. |
| Hora | Hora actual | Momento en que se ejecuto la aplicacion. |
| Observaciones | `Aplicacion registrada para validar timeline de enfermeria.` | Evidencia narrativa de la ejecucion. |

Datos que debes ingresar en `Estudio`:

| Campo | Valor QA | Para que sirve |
| --- | --- | --- |
| Tipo | `Otro` o `Laboratorio` | Clasifica el registro clinico creado desde enfermeria. Usa `Laboratorio` si la orden era de estudio. |
| Estado | `Realizado` | Indica que el estudio fue ejecutado. |
| Nombre estudio | `Estudio QA V3` | Nombre visible del estudio en consulta y ficha del paciente. |
| Resumen | `Estudio de prueba creado desde enfermeria.` | Resumen corto del resultado o procedimiento. |
| Hallazgos | `Sin hallazgos relevantes en prueba QA.` | Resultado clinico o descripcion de hallazgos. |

Datos que debes ingresar en `Nota enfermeria`:

| Campo | Valor QA | Para que sirve |
| --- | --- | --- |
| Nota | `Paciente tolera procedimiento QA sin incidentes.` | Agrega observacion de enfermeria al historial del paciente. |

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

Datos que debes ingresar:

| Campo | Valor QA | Para que sirve |
| --- | --- | --- |
| Tipo | `Administracion` | Clasifica la orden como una accion administrativa o de cobro. |
| Area destino | `Administracion` | Crea un pendiente en la bandeja administrativa. |
| Indicacion | `Cobrar Suero QA V3 aplicado.` | Instruye a administracion que debe registrar venta/cobro asociado a la atencion. |
| Detalle | `Validar venta parcial, pago final y descuento automatico de inventario.` | Explica que debe verificarse durante QA. |

### 12. Registrar Venta Administrativa

Ruta:

```txt
/sigeco/administracion/{workItemId}
```

Pasos:

1. Entrar primero a `/sigeco/administracion`.
2. Confirmar que aparece el pendiente derivado desde consulta.
3. Abrir `/sigeco/administracion/{workItemId}`.
4. Crear venta con tipo `Suero`.
5. Seleccionar producto inventariable `Suero QA V3`.
6. Completar descripcion, cantidad `1`, precio unitario `100` y cobro inicial `50`.
7. Usar forma de pago `Efectivo`.
8. Guardar venta.

Resultado esperado:

- La venta queda creada.
- El estado queda `Parcial`.
- El total es Bs 100.
- El cobro inicial es Bs 50.
- El saldo pendiente es Bs 50.
- La venta aparece en la tarea y enlaza al comprobante interno.

Validar tambien:

- Si se intenta vender una cantidad mayor al stock disponible, el sistema debe bloquear la operacion. Actualmente se debe revisar que el error visible sea claro; si no lo es, registrar bug.

Datos que debes revisar en `/sigeco/administracion`:

| Dato | Valor esperado | Para que sirve |
| --- | --- | --- |
| Cobrado hoy | Puede estar en `Bs 0` antes de vender; sube despues de cobrar | Resume caja diaria. |
| Ventas del mes | Debe subir despues de crear la venta | Resume produccion administrativa del mes. |
| Saldo pendiente | Debe reflejar el saldo parcial despues del cobro inicial | Ayuda a controlar cuentas por cobrar. |
| Pendiente derivado | Paciente `Paciente QA V3 Completo` con indicacion administrativa | Confirma que consulta creo tarea para administracion. |

Datos que debes ingresar:

| Campo | Valor QA | Para que sirve |
| --- | --- | --- |
| Tipo | `Suero` | Clasifica el item vendido. Sirve para reportes administrativos. |
| Producto inventariable | `Suero QA V3` | Vincula la venta con inventario para descontar stock automaticamente. |
| Descripcion | `Suero QA V3 aplicado en consulta` | Texto visible en el comprobante interno y la cronologia administrativa. |
| Cantidad | `1` | Cantidad vendida. Tambien define cuanto stock se descuenta si hay producto inventariable. |
| Precio unitario Bs | `100` | Precio por unidad. El servidor calcula el total. |
| Descuento Bs | `0` | Rebaja aplicada. Usar cero para validar el calculo base. |
| Cobro inicial Bs | `50` | Primer pago al crear la venta. Permite validar estado `Parcial`. |
| Forma pago | `Efectivo` | Metodo del cobro inicial. Sirve para caja y reportes. |
| Referencia | `QA-PAGO-001` | Identificador opcional del pago, util para QR, transferencia o control interno. |
| Notas | `Venta QA para validar cobro parcial e inventario.` | Contexto administrativo de la operacion. |

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

Datos que debes ingresar:

| Campo | Valor QA | Para que sirve |
| --- | --- | --- |
| Monto Bs | `50` | Monto restante para dejar la venta completamente pagada. |
| Forma de pago | `QR` | Metodo del segundo cobro. Permite validar mas de un metodo por venta. |
| Referencia | `QA-PAGO-002` | Referencia del pago final. |
| Notas | `Pago final QA para cerrar saldo pendiente.` | Explica el cierre de cobro. |

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

Datos que debes revisar:

| Dato | Valor esperado | Para que sirve |
| --- | --- | --- |
| Producto | `Suero QA V3` | Confirma que estas revisando el producto que fue vendido. |
| Stock actual | `1` | Prueba que la venta inventariable desconto una unidad del stock inicial `2`. |
| Movimiento | `Salida por venta` | Evidencia que el descuento de inventario se genero desde ventas, no por ajuste manual. |
| Alerta | `Abierta` | Confirma que el sistema detecta stock bajo cuando el stock queda igual al minimo. |

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

Datos que debes revisar en `/sigeco/seguimientos`:

| Dato | Valor esperado | Para que sirve |
| --- | --- | --- |
| Vencidos | Numero de seguimientos pendientes con fecha pasada | Ayuda a priorizar llamadas urgentes. |
| Hoy | Numero de seguimientos para el dia actual | Bandeja diaria de trabajo. |
| Proximos | Numero de seguimientos futuros | Permite planificar contactos. |
| Filtros `Vencidos`, `Hoy`, `Proximos` | Al cambiar filtro, cambia la lista | Permiten revisar tareas por urgencia. |
| Tarea QA | `Seguimiento QA V3` debe aparecer en el filtro que corresponda a su fecha | Confirma que la tarea creada desde paciente entra en la bandeja. |

Datos que debes ingresar:

| Campo | Valor QA | Para que sirve |
| --- | --- | --- |
| Titulo | `Seguimiento QA V3` | Nombre de la tarea que vera el equipo de seguimiento. |
| Fecha/hora | Manana a las `10:00` | Define cuando debe realizarse el seguimiento. |
| Notas | `Confirmar evolucion despues de la atencion QA.` | Indica que debe preguntar o revisar el equipo. |

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

Datos que debes ingresar:

| Campo | Valor QA | Para que sirve |
| --- | --- | --- |
| Metodo | `Llamada` | Canal usado para contactar al paciente. |
| Resultado | `Mejoro` | Estado final o resultado clinico-operativo del seguimiento. |
| Notas | `Paciente refiere mejoria posterior a la atencion QA.` | Evidencia de la conversacion y motivo del resultado. |

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

Datos que debes revisar:

| Dato | Valor esperado | Para que sirve |
| --- | --- | --- |
| Paciente | `Paciente QA V3 Completo` | Confirma que toda la historia pertenece a la ficha correcta. |
| Visita | Una visita creada durante esta corrida QA | Prueba que recepcion abrio el circuito de atencion. |
| Consulta | Diagnostico `Lumbalgia mecanica en evaluacion` | Prueba que la atencion medica quedo persistida. |
| Enfermeria | Signos, aplicacion, estudio y nota visibles | Prueba que las tareas clinicas ejecutadas alimentan la ficha del paciente. |
| Administracion | Venta `Suero QA V3 aplicado en consulta` y pagos visibles | Prueba trazabilidad financiera asociada al paciente. |
| Seguimiento | `Seguimiento QA V3` con resultado `Mejoro` | Prueba continuidad posterior a la atencion. |

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

Datos que debes revisar:

| Dato | Valor esperado | Para que sirve |
| --- | --- | --- |
| Leads o actividad comercial | Debe reflejar el lead QA creado o convertido | Confirma que CRM alimenta metricas internas. |
| Visitas o tareas | Debe reflejar la visita y las tareas creadas durante QA | Confirma que el circuito operativo mueve trabajo entre areas. |
| Administracion | Debe reflejar cobros o ventas de la corrida QA | Confirma que ventas y caja actualizan resumen administrativo. |
| Inventario | Debe mostrar stock bajo si aplica | Confirma que inventario impacta dashboard despues de la venta. |
| Mobile 390px | Sin overflow horizontal ni textos pisados | Confirma que el dashboard sirve en Android. |

## Matriz De Evidencias

Guardar evidencia minima por corrida:

| Paso | Evidencia |
| --- | --- |
| Login | Screenshot dashboard `/sigeco`. |
| Inventario | Producto creado, detalle con stock inicial y movimiento `Entrada`. |
| Inventario opcional | Si se prueban entrada o ajuste, screenshot del movimiento generado. |
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
11. Registrar entrada de inventario sin cantidad o con cantidad `0`.
12. Registrar ajuste autorizado con diferencia `0`.

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
