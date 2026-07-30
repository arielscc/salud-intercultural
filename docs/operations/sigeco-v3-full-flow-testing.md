# Prueba Del Flujo Completo Sigeco V3.7

Guia operativa y guiada para validar el flujo vigente desde recepcion hasta cierre o seguimiento. Esta pensada para ejecutarse a mano, pantalla por pantalla, con un paciente simulado y datos exactos para cada campo.

**Tiempo estimado:** 60 a 90 minutos completa; las secciones 1 a 9 (flujo clinico) toman unos 40 minutos.

**Como usar esta guia:** cada seccion indica la ruta, que hacer con valores concretos, el resultado esperado y, cuando aplica, un error intencional para confirmar que el sistema lo rechaza bien. Ejecuta en orden: las secciones reutilizan al paciente creado al inicio.

## Objetivo

Confirmar que:

- El paciente se registra una sola vez (una ficha, muchas visitas).
- Cada llegada abre una visita independiente.
- Consulta recibe el contexto de recepcion sin volver a pedirlo.
- Las tareas llegan al area correcta.
- La salida o abandono queda trazado en el historial.
- Ventas, pagos y stock son consistentes (y el stock insuficiente se rechaza sin efectos).
- Los permisos impiden acceso a modulos no autorizados.

## Preparacion

```bash
docker compose up -d postgres
pnpm internal:seed
pnpm dev
```

Usar solo base local o staging aislado. Nunca ejecutar QA destructivo contra produccion.

Requisitos:

- Usuario `super_admin` local (por defecto `test@test.si`; el password no se documenta).
- Un producto activo en `/sigeco/inventario`. Antes de empezar, abre ese modulo y anota el **nombre y stock actual** del primer producto; lo usaras en la seccion 8.
- Viewports 390x844 (movil) y 1440x900 (escritorio).
- Consola del navegador abierta para detectar errores.

Advertencias:

- No registrar passwords en reportes o commits.
- **No ejecutar `pnpm run build` mientras `next dev` este corriendo**: corrompe la cache de `.next` y los formularios devuelven error 500 hasta reiniciar el servidor.
- Si algun dato sugerido (ej. el telefono) ya existe en tu base, cambia los ultimos digitos y anota el valor usado.

## Paciente Simulado

Todo el recorrido usa a esta persona ficticia. Ten la tabla a mano: cada seccion indica cuando usar cada valor.

| Campo | Valor a ingresar | Donde se usa |
| --- | --- | --- |
| Nombre completo | `Julia Mamani Condori` | Funnel paso 1 |
| Telefono | `71112233` | Funnel paso 1 |
| Fecha de nacimiento | `1979-03-15` | Funnel paso 1 (debe mostrar 47 anos) |
| Ciudad | chip `El Alto` | Funnel paso 1 |
| Genero | chip `Femenino` | Funnel paso 1 |
| Motivo | `Dolor de cabeza fuerte` | Funnel paso 2 |
| Desde cuando | `3` + chip `Dias` | Funnel paso 2 |
| Tipo de visita | chip `Primera consulta` | Funnel paso 2 |
| Ya se atendio antes | chip `No` | Funnel paso 2 |
| Trae estudios | chip `No` | Funnel paso 2 |
| Alergias | chip `Ninguna conocida` | Funnel paso 3 |
| Enfermedad de base | `Hipertension` | Funnel paso 3 |
| Medicacion actual | `Enalapril 10 mg cada manana` | Funnel paso 3 |
| Como nos conocio | chips `Referido` y `Facebook` (multiple) | Funnel paso 4 |
| Contacto para seguimiento | chip `WhatsApp` | Funnel paso 4 |

Segundo personaje, solo para la prueba de duplicados (seccion 2, error B):

| Campo | Valor |
| --- | --- |
| Nombre | `Pedro Choque Flores` |
| Telefono | `711-12233` (mismos 8 digitos que Julia, con guion a proposito) |

## 1. Login Y Dashboard

Ruta: `/sigeco/login`.

**Error intencional A — credenciales malas:** ingresa el email correcto con un password incorrecto. Esperado: mensaje de fallo generico que NO revela si la cuenta existe, y el email se conserva en el campo.

Luego ingresa con las credenciales correctas.

Verificar en `/sigeco` (dashboard "Trabajo de hoy"):

1. Sidebar con 7 secciones: Inicio, Recepcion, Consulta, Enfermeria, Caja, Seguimiento, Inventario.
2. Seis KPIs: `Pacientes de hoy`, `Visitas activas`, `Abandonos hoy`, `Seguimientos hoy`, `Seguimientos vencidos`, `Stock bajo`. Anota los valores iniciales: los compararas al final.
3. Tarjeta `Visitas activas por area` y tabla `Ultimas llegadas`.
4. Accesos rapidos `Buscar paciente` y `Registrar llegada` en la cabecera.

**Por que importa:** el dashboard es la foto operativa del dia; si sus conteos no cambian con tus acciones, hay un bug de conteo o de revalidacion.

## 2. Recepcion Y Funnel (Registrar A Julia)

Ruta: `/sigeco/recepcion/nuevo` (o el boton `Registrar llegada`).

### Paso 0 — Busqueda previa

1. En "Ya nos visito antes?" escribe `71112233` y pulsa `Buscar`.
2. Esperado: "Sin resultados. Registralo como paciente nuevo."
3. Pulsa `Es paciente nuevo`. Esperado: el paso 1 arranca limpio y solo trae precargado lo buscado (si el termino parece telefono llena el campo telefono; si es texto, el nombre; si el buscador esta vacio, todo vacio).

### Paso 1 — Quien es?

1. Nombre completo: `Julia Mamani Condori`.
2. Telefono: `71112233` (ya viene precargado desde la busqueda del paso 0).

**Error intencional B — telefono invalido:** antes de llenar bien el telefono, escribe `abc` y pulsa `Continuar`. Esperado: mensaje inline "Ingresa un telefono valido." y el funnel no avanza. Corrige a `71112233`.

3. Fecha de nacimiento: `15/03/1979` (con el selector de fecha). Esperado: el label cambia a "Fecha de nacimiento (47 anos)".
4. Ciudad: toca el chip `El Alto` (opciones: El Alto, La Paz, Otra; "Otra" abre un campo de texto).
5. Genero: toca `Femenino` (opciones: Femenino, Masculino, Otro; es opcional y se puede destildar).
6. Pulsa `Continuar`.

### Paso 2 — A que viene?

1. Motivo: `Dolor de cabeza fuerte`.

**Error intencional C — duracion incompleta:** escribe `3` en la cantidad de "Desde cuando?" SIN elegir unidad y pulsa `Continuar`. Esperado: "Para desde cuando completa la cantidad y la unidad, o deja ambas vacias."

2. Toca el chip `Dias` (opciones: Dias, Semanas, Meses, Anos).
3. Tipo de visita: `Primera consulta` (opciones: Primera consulta, Control de tratamiento, Nuevo problema, Revision de resultados).
4. "Ya se atendio antes por esto?": chip `No`.
5. "Trae analisis o estudios?": chip `No`.
6. `Continuar`.

### Paso 3 — Antecedentes rapidos

1. Alergias: toca el chip `Ninguna conocida` (el campo de texto se oculta).
2. Enfermedad de base: `Hipertension`.
3. Medicacion actual: `Enalapril 10 mg cada manana`.
4. `Continuar`.

### Paso 4 — Origen y seguimiento

1. "Como nos conocio?": toca `Referido` y luego `Facebook` — es seleccion multiple, tocar un chip lo agrega o lo quita (opciones: Facebook, TikTok, WhatsApp, Referido, Paciente anterior, Volante, Sitio web, Otro). No se pregunta al paciente si vio publicidad o contenido organico.
2. "Podemos contactarlo para seguimiento?": chip `WhatsApp` (opciones: WhatsApp, Llamada, Ambos, Prefiere no recibir seguimiento).
3. Pulsa `Registrar llegada`.

### Resultado esperado

- Redirige al detalle de la visita nueva: Julia con codigo `SI-XXXXXX`, estado `En recepcion`, area `Recepcion`.
- En la ficha de Julia, "Fuente" muestra `Referido · Facebook` (las dos fuentes elegidas).
- "Ruta del paciente" muestra un paso: Recepcion, "Llegada registrada en recepcion".
- En `/sigeco` los KPIs `Pacientes de hoy` y `Visitas activas` suben en 1 y Julia aparece en `Ultimas llegadas`.

**Por que importa:** este es el unico punto de entrada de pacientes; solo nombre, telefono y motivo son obligatorios para que el registro tome 2-3 minutos.

### Error intencional D — telefono duplicado

1. Vuelve a `/sigeco/recepcion/nuevo`, pulsa `Es paciente nuevo`.
2. Nombre: `Pedro Choque Flores`. Telefono: `711-12233` (con guion).
3. Pulsa `Continuar`. Esperado: panel amarillo "Ya existe una ficha con este telefono" mostrando a Julia, aunque el numero se escribio con guion (la comparacion normaliza los ultimos 8 digitos).
4. Opciones: tocar la ficha de Julia (prellena todo) o "No es la misma persona, continuar como nuevo".
5. Para esta prueba: **abandona con Atras / navegando fuera**, no registres a Pedro.

## 3. Segunda Llegada Sin Duplicar

Ruta: `Recepcion -> Pacientes` (`/sigeco/recepcion?vista=pacientes`).

1. Busca `Julia` y abre su ficha.
2. Pulsa `Registrar llegada` (tarjeta lateral). Esperado: el funnel abre directo en el paso 1 con el banner "Ficha existente SI-XXXXXX" y todo prellenado.
3. Motivo de esta visita: `Control de presion`. Tipo: `Control de tratamiento`. Registra.

Resultado esperado: segunda visita abierta para la MISMA ficha (mismo codigo interno). En la ficha, la tabla "Visitas" muestra 2 filas. El total de pacientes no cambio.

## 4. Edicion De Ficha

Ruta: ficha de Julia -> boton `Editar ficha` (cabecera).

1. Verifica que el formulario llega prellenado con los mismos chips del funnel.
2. Corrige la ciudad: toca `La Paz`.
3. Cambia la medicacion a: `Enalapril 10 mg cada noche`.
4. Pulsa `Guardar cambios`.

Resultado esperado: vuelve a la ficha con Ciudad `La Paz`; mismo ID en la URL y mismo codigo interno; el buscador de pacientes sigue mostrando UNA sola Julia.

**Error intencional E — nombre invalido:** vuelve a editar, borra el nombre dejando 1 letra y pulsa `Guardar cambios`. Esperado: error inline "Ingresa el nombre completo." sin enviar. Restaura el nombre y cancela.

## 5. Consulta Prellenada

1. Abre la visita activa de Julia (la de `Control de presion`) desde `Recepcion -> Hoy`.
2. En "Derivar paciente": Estado `En consulta`, Area destino `Medico`, pulsa `Actualizar ruta`.
3. Abre `/sigeco/consultas` y entra a la consulta de Julia.

Verificar la cabecera clinica (nada de esto debe pedirse de nuevo):

| Dato | Valor esperado |
| --- | --- |
| Motivo de consulta | Control de presion |
| Desde cuando | segun lo capturado (vacio en esta visita) |
| Tipo de visita | Control de tratamiento |
| Atencion previa por esto | segun lo capturado |
| Trae estudios | segun lo capturado |
| Edad | 47 anos |
| Alergias | Ninguna conocida |
| Enfermedad de base | Hipertension |
| Medicacion actual | Enalapril 10 mg cada noche |

4. Registra la consulta: Diagnóstico principal `Hipertensión descompensada`,
   Hallazgos `PA elevada en control`. Pulsa `Guardar borrador`.
5. Confirma que `Receta rápida` y `Evolución` están **colapsadas** por defecto;
   abre `Receta rápida` y registra: Medicamento `Enalapril 20 mg`, Dosis
   `1 tableta`, Frecuencia `cada 12 horas`, Duración `30 días`. Guarda
   nuevamente.
6. Pulsa `Finalizar y firmar consulta` y confirma. Esperado: estado
   `Finalizada`, usuario, fecha, hora y versión visibles; los campos dejan de
   editarse como borrador.
7. En `Indicación para otra área` (colapsable): Tipo `Signos vitales`, Área
   destino `Enfermería`, Indicación `Control de presión arterial`, pulsa
   `Crear indicación`.

Resultado esperado: consulta finalizada, contexto de recepción intacto y orden
visible en `Órdenes clínicas`.

### Corrección sin sobrescribir

1. Abre `Corregir consulta finalizada`.
2. Elige `Diagnóstico`, escribe el motivo
   `Se digitó de forma incompleta el diagnóstico` y cambia el diagnóstico a
   `Hipertensión arterial descompensada`.
3. Confirma y abre `Ver historial y comparar versiones`.
4. Esperado: la versión finalizada conserva el texto anterior, la corrección
   muestra autor, fecha y motivo, y el diagnóstico aparece resaltado como
   modificado. La receta y la orden de Enfermería no cambian.

## 6. Enfermeria

Ruta: `/sigeco/enfermeria` -> abrir la tarea de Julia.

1. Esperado: el formulario `Signos vitales` (o el que corresponda al tipo de orden) llega **abierto automaticamente**; los demas colapsados.
2. Registra: Presion sistolica `150`, Presion diastolica `95`, Pulso `82`.
3. Agrega nota si corresponde y completa la tarea.

Resultado esperado: el registro aparece en el detalle de la consulta ("Estudios y enfermeria") y en la ficha de Julia ("Timeline de enfermeria").

## 7. Salida Post-Consulta Hacia Caja

Vuelve a la consulta de Julia. En la tarjeta `Salida del paciente` (3 opciones: `Enviar a enfermeria`, `Enviar a administracion`, `Se va - cerrar visita`):

1. Pulsa `Enviar a administracion`.

Resultado esperado: en `/sigeco/administracion` aparece el pendiente "Paciente derivado - Pasa a administracion tras la consulta" para Julia.

## 8. Administracion, Venta E Inventario

Ruta: `/sigeco/administracion` -> abrir el pendiente de Julia.

### Error intencional F — stock insuficiente (hazlo PRIMERO)

1. En `Registrar venta`: Producto inventariable = el producto que anotaste en la preparacion; Cantidad `999`; Precio unitario `10`; pulsa `Crear venta`.
2. Esperado: vuelve a la misma tarea con alerta roja "No hay stock suficiente para completar la venta." indicando producto, disponible y solicitado.
3. Verifica en `/sigeco/inventario` que el stock NO cambio, y en la tarea que NO se creo venta ni pago (rollback completo).

### Venta valida con pago parcial

1. Misma pantalla: Tipo `Servicio` o `Producto` segun el caso; Producto inventariable = el mismo producto; Descripcion `Control + medicamento`; Cantidad `1`; Precio unitario `50`; Cobro inicial `30`; Forma de pago `Efectivo` (opciones: Efectivo, QR, Tarjeta, Transferencia, Otro).
2. Pulsa `Crear venta`. Esperado: venta con saldo `Bs 20`.
3. Abre el detalle de la venta y, en la tarjeta `Registrar cobro`, ingresa Monto Bs `20` y guarda.
4. Verifica: venta saldada, movimiento de caja registrado y stock del producto reducido en 1.

### Cierre en un toque

1. De vuelta en el pendiente, tarjeta `Salida del paciente`: pulsa `Cerrar visita`.
2. Esperado: la visita de Julia queda `Finalizada`; su historial muestra recepcion -> consulta -> administracion -> cierre con notas; desaparece de `Recepcion -> Hoy`.

**Por que importa:** este es el camino real "consulta -> caja -> salida" mas el caso "el paciente solo compra y se va".

## 9. Caminos De Salida Alternativos

Usa la PRIMERA visita de Julia (la de `Dolor de cabeza fuerte`, que sigue activa) y una tercera llegada rapida:

### Abandono (No continuará)

1. En `Recepción -> Hoy`, pulsa `No continuará` en la primera visita de
   Julia. La acción abre el detalle de la visita; no la cierra todavía.
2. En el formulario `No continuará`, elige `Tiempo de espera`, marca
   `Consulta` como pendiente y agrega la nota `Esperó 40 minutos`.
3. Confirma el registro. Esperado: la visita sale de la lista activa, el KPI
   `Abandonos hoy` sube en 1 y el detalle muestra el punto, área, motivo,
   responsable, fecha, nota y pendiente.
4. Abre `/sigeco/recepcion/abandonos`. Esperado: la visita aparece bajo
   `Tiempo de espera`.

El seguimiento de recuperación es opcional. Solo debe crearse si se marca la
opción y Julia tiene consentimiento vigente para seguimiento.

### Error intencional G — actuar sobre visita cerrada

1. Con la visita abandonada abierta, edita la URL agregando `?error=cerrada` para ver el aviso (o reintenta una acción desde una pestaña vieja si tienes una abierta).
2. Esperado: banner "Esta visita ya esta cerrada; no se aplico la accion." La base ademas bloquea cualquier reapertura server-side (`ClosedVisitTransitionError`).

### Salida directa desde consulta

1. Registra una tercera llegada de Julia desde su ficha (motivo `Revision rapida`).
2. Derivala a `Medico / En consulta`, abre la consulta y pulsa `Se va - cerrar visita`.
3. Esperado: visita `Finalizada` sin pasar por enfermeria ni caja; historial `in_reception -> in_consultation -> completed` con nota "Salida directa despues de la consulta".

## 10. Seguimiento

1. En la ficha de Julia, tarjeta `Crear seguimiento`: Titulo `Control de presion en 7 dias`, Fecha y hora = manana 10:00, pulsa `Crear seguimiento`.
2. Esperado: redirige al detalle de la tarea; aparece en `/sigeco/seguimientos` (filtros Hoy / Vencidos / Proximos).
3. Registra un contacto: Metodo `Llamada`, Resultado `Realizado`, nota breve. Verifica que queda en el "Historial" y en la ficha de Julia.

### Caso no_contact

1. Edita la ficha de Julia y cambia la preferencia a `Prefiere no recibir seguimiento`. Guarda.
2. Verifica las 3 advertencias: en la ficha (panel amarillo sobre "Crear seguimiento"), en la bandeja (`Pidio no recibir seguimiento` bajo el telefono) y en el detalle de la tarea (panel sobre los botones Llamar / WhatsApp).
3. Nota: advierte pero NO bloquea (puede existir razon clinica). Al terminar, restaura la preferencia a `WhatsApp`.

## 11. Matriz De Roles

Cambia el rol del usuario QA con el script oficial (y restauralo al final):

```bash
INTERNAL_USER_EMAIL=test@test.si INTERNAL_USER_ROLE=recepcion pnpm internal:set-role
# ... probar, luego repetir con: seguimiento, medico, enfermeria, administracion, direccion
INTERNAL_USER_EMAIL=test@test.si INTERNAL_USER_ROLE=super_admin pnpm internal:set-role
```

Cierra sesion y vuelve a entrar despues de cada cambio.

| Rol | Debe ver en la sidebar | Notas |
| --- | --- | --- |
| recepcion | Inicio, Recepcion, Seguimiento | Puede registrar llegada y editar fichas. |
| seguimiento | Inicio, Seguimiento | Sin `Registrar llegada`; abre fichas por enlace (solo lectura). |
| medico | Inicio, Recepcion, Consulta, Enfermeria (lectura), Seguimiento | Ve la tarjeta `Salida del paciente`. |
| enfermeria | Inicio, Recepcion, Enfermeria | |
| administracion | Inicio, Recepcion, Caja, Seguimiento, Inventario | Puede cerrar visitas desde Caja. |
| direccion | Todos en lectura | Sin registrar llegada ni editar. |

Para cada rol:

1. Revisar la sidebar contra la tabla.
2. Abrir un modulo permitido.
3. **Error intencional H:** escribir a mano una URL no permitida (ej. `/sigeco/inventario` como recepcion). Esperado: redirect silencioso a `/sigeco`.
4. Confirmar que los botones de escritura no autorizados no aparecen (ej. `Editar ficha` no existe para seguimiento).
5. Extra: `captacion` es un rol retirado; un usuario con ese rol ve solo Inicio con el mensaje "Tu rol no tiene modulos asignados", y el script rechaza asignarlo.

## 12. Responsive Y Regresiones

En 390x844 recorrer: dashboard; Recepcion (Hoy, Pacientes, funnel, ficha, edicion, visita); Consulta (lista y detalle); Enfermeria (lista y detalle); Caja (lista, tarea, venta); Seguimientos (lista y detalle); Inventario (lista y detalle).

Confirmar:

- Sin desplazamiento horizontal del documento (las tablas anchas se desplazan dentro de su contenedor).
- Botones y textos no se superponen; formularios conservan labels y estados de error.

Regresiones externas:

- Las diez rutas publicas cargan en movil y escritorio.
- `/admin` carga o redirige a `/admin/login`.
- Sitemap y robots responden.
- El formulario publico conserva `/api/leads`; ese endpoint es del sitio publico, no el modulo interno retirado.

## 13. Validacion Tecnica

Detener `next dev` primero (nunca correr build con dev activo) y ejecutar:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm run build
```

## Resumen De Errores Intencionales

| # | Donde | Accion | Resultado esperado |
| --- | --- | --- | --- |
| A | Login | Password incorrecto | Fallo generico, no revela si la cuenta existe, email conservado |
| B | Funnel paso 1 | Telefono `abc` | "Ingresa un telefono valido.", no avanza |
| C | Funnel paso 2 | Duracion `3` sin unidad | Pide cantidad y unidad juntas, no avanza |
| D | Funnel paso 1 | Telefono de Julia con guion | Panel de duplicado con la ficha existente |
| E | Editar ficha | Nombre de 1 letra | "Ingresa el nombre completo.", no envia |
| F | Caja | Venta de 999 unidades | Alerta de stock con cantidades; sin venta, pago ni descuento |
| G | Visita cerrada | Reintentar accion | Banner "visita ya cerrada"; reapertura bloqueada en base |
| H | Cualquier rol | URL sin permiso | Redirect a `/sigeco` |

## Criterio De Aprobacion

V3.7 puede promoverse a staging cuando:

- Todos los comandos de la seccion 13 pasan.
- No hay fallos criticos, altos o medios abiertos.
- La matriz de roles pasa completa.
- Los cuatro caminos de salida (enfermeria, caja, directa, abandono) conservan historial.
- Los 8 errores intencionales se comportan como se describe.
- No hay overflow de pagina a 390px.
- Sitio publico y CMS no presentan regresiones.
- Los pendientes clinicos y operativos no resueltos estan documentados y aceptados.

## Evidencia

Registrar:

- Fecha y ambiente.
- Commit probado (`git rev-parse --short HEAD`).
- Usuario y rol, sin password.
- Paciente y visitas QA creados (codigo interno de Julia).
- Comandos y conteos de tests.
- Hallazgos, correcciones y revalidacion.
- Capturas de dashboard inicial y final, flujo cerrado y una pantalla movil.

## Limpieza Opcional

Los datos QA pueden quedarse en la base local. Si quieres empezar de cero: `pnpm db:reset` (SOLO en local; destruye todos los datos de la base de desarrollo).
