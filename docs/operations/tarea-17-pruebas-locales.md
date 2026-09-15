# Tarea 17 — Guía completa de pruebas locales

Fecha de preparación: 2026-09-12  
Alcance: desarrollo local primero y staging después. Producción queda fuera de
esta etapa y no debe consultarse, migrarse ni desplegarse.

## 1. Objetivo y estado actual

Esta guía permite que Dirección y el personal validen manualmente el conjunto
de las Tareas 1–17 antes de revisar el mismo flujo en staging.

El cierre automatizado ya aprobó lint, tipos, pruebas unitarias, integración,
build, RLS, backup y el ensayo sintético de staging. Esto no reemplaza la
prueba humana de pantallas, permisos, operación y usabilidad.

Estado detectado el 2026-09-12:

- la rama de trabajo es `develop`;
- la base local principal es `salud_intercultural_dev`;
- hay 27 migraciones pendientes en esa base;
- existe la cuenta local `test@test.si` como superadministrador;
- no existe una cuenta `test@test.cb`;
- El Alto y Cochabamba aparecen activas en la base local anterior a las
  migraciones pendientes.

No iniciar la prueba manual hasta actualizar o reconstruir de forma controlada
la base local.

## 2. Orden de ambientes

El orden obligatorio es:

```text
1. develop + localhost
2. staging, después de aprobar local
3. producción, únicamente en una fase futura con autorización independiente
```

La aprobación local autoriza solamente comenzar la revisión de staging. La
aprobación de staging tampoco autoriza por sí sola producción.

## 3. Preparación del código y PostgreSQL

Usar Node.js 22:

```bash
nvm use 22.23.2
git branch --show-current
git status --short
pnpm install
docker compose up -d postgres
pnpm env:check
pnpm exec prisma migrate status
```

Resultado esperado:

- `git branch --show-current` devuelve `develop`;
- `pnpm env:check` confirma ambiente local;
- PostgreSQL responde en `localhost:5432`;
- nunca aparece una URL de staging o producción.

### 3.1 Conservar los datos locales actuales

Si existe información local que se quiere conservar, crear primero una copia
cifrada. La clave debe guardarse fuera del repositorio y no escribirse en esta
guía, capturas o commits.

```bash
export BACKUP_ENCRYPTION_KEY="<clave-guardada-en-el-gestor-de-secretos>"
export BACKUP_RESPONSIBLE="<responsable>"
pnpm backup:create:local
pnpm db:deploy
```

Si una migración informa datos ambiguos, una reconciliación pendiente o una
relación cruzada, detenerse. No ejecutar `prisma migrate resolve`, no asignar
sucursales por intuición y no modificar las tablas manualmente. Conservar el
mensaje exacto y resolver el caso mediante las herramientas de reconciliación.

### 3.2 Empezar con una base local limpia

Si los datos de `salud_intercultural_dev` son descartables, esta es la opción
más predecible:

```bash
pnpm db:reset
pnpm seed
INTERNAL_ADMIN_BRANCH=el-alto pnpm internal:seed
```

`pnpm db:reset` elimina todos los datos de la base local de desarrollo. No toca
staging ni producción, pero solo debe ejecutarse después de decidir que esos
datos pueden perderse o después de conservar el backup.

### 3.3 Abrir Cochabamba solo para el ensayo local

```bash
SIGECO_BRANCH=cochabamba \
SIGECO_BRANCH_OPEN=true \
pnpm branch:open
```

La apertura real de una sede fuera de local requiere otro procedimiento. Este
comando está bloqueado en staging y producción.

### 3.4 Activar los módulos en ambas sucursales

El núcleo está siempre activo. Activar el resto en orden para respetar sus
dependencias:

```bash
for branch in el-alto cochabamba; do
  for module in administracion inventario compras catalogo recepcion consulta enfermeria seguimientos opiniones reportes; do
    SIGECO_BRANCH="$branch" \
    SIGECO_MODULE="$module" \
    SIGECO_MODULE_ACTIVE=true \
    pnpm modules:set || break 2
  done
done
```

Antes de abrir el navegador:

```bash
pnpm branch:isolation:sql
```

Resultado esperado: `127/127` controles sin hallazgos.

### 3.5 Iniciar la aplicación

```bash
pnpm dev
```

Abrir:

```text
http://localhost:3000/sigeco/login
```

El puerto `3001` corresponde al piloto local aislado de Cochabamba. No es
necesario para probar el selector con ambas sucursales dentro de la base local
principal.

No ejecutar `pnpm run build` mientras `pnpm dev` esté activo: ambos utilizan
la carpeta `.next`.

## 4. Cuentas para la prueba

### 4.1 Superadministrador

La cuenta configurada actualmente es:

| Usuario | Rol | Alcance esperado |
| --- | --- | --- |
| `test@test.si` | Superadministrador | Todas las sucursales activas o en preparación |

La contraseña se obtiene de `INTERNAL_ADMIN_PASSWORD` en `.env` y se restaura
con:

```bash
INTERNAL_ADMIN_BRANCH=el-alto pnpm internal:seed
```

No copiar esa contraseña a este archivo ni a Git. No hace falta crear
`test@test.cb`: una sola identidad de superadministración gobierna todas las
sucursales.

### 4.2 Cuentas QA locales

Entrar como superadministrador y abrir:

```text
http://localhost:3000/sigeco/usuarios
```

Crear las siguientes cuentas:

| Nombre | Correo | Rol | Sucursal y modalidad |
| --- | --- | --- | --- |
| `[QA P29-R01] Dirección` | `p29.direccion@local.invalid` | Dirección | El Alto; consulta consolidada autorizada |
| `[QA P29-R01] Médico` | `p29.medico@local.invalid` | Médico | Ambas; El Alto predeterminada |
| `[QA P29-R01] Marlen Recepción` | `p29.recepcion@local.invalid` | Recepción | El Alto |
| `[QA P29-R01] Administración` | `p29.administracion@local.invalid` | Administración | El Alto |
| `[QA P29-R01] Enfermería` | `p29.enfermeria@local.invalid` | Enfermería | Ambas; El Alto predeterminada |
| `[QA P29-R01] Yazmin Recepción` | `p29.yazmin@local.invalid` | Recepción | El Alto |
| `[QA P29-C01] Recepción CBBA` | `p29.cbba.recepcion@local.invalid` | Recepción | Cochabamba |
| `[QA P29-C01] Administración CBBA` | `p29.cbba.administracion@local.invalid` | Administración | Cochabamba |

Para cada cuenta:

1. generar una contraseña local distinta;
2. incluir mayúsculas, minúsculas y números;
3. usar al menos 12 caracteres aunque el mínimo técnico sea menor;
4. evitar nombres, correos y patrones fáciles;
5. guardarla temporalmente en un gestor de contraseñas;
6. cambiarla al primer ingreso si SIGECO lo exige;
7. cerrar todas sus sesiones al terminar el ciclo.

Médico y Enfermería pueden tener ambas sedes activas porque son los roles que
rotan. Recepción y Administración trabajan en una sola sucursal; por eso se
utilizan cuentas independientes para Cochabamba.

El rol técnico `seguimiento` está retirado. Marlen y Yazmin utilizan Recepción.

## 5. Material para la prueba

Preparar:

- computadora con viewport aproximado de `1440 × 900`;
- teléfono real o emulado en `390 × 844`;
- tableta real o emulada en `820 × 1180`;
- consola y panel Network del navegador;
- una ventana normal y otra incógnita, o dos navegadores;
- una hoja para conciliación de Caja;
- una hoja para conciliación de inventario;
- un PDF o imagen ficticia menor a 4 MB;
- cronómetro;
- carpeta privada de evidencia `P29-R01-evidencia`.

El archivo de prueba puede llamarse `P29-R01-documento-prueba.pdf` y contener:

```text
DOCUMENTO FICTICIO DE PRUEBA SIGECO
Ejecución: P29-R01
Paciente: [QA P29-R01] Julia Mamani Condori
Contenido: SIN INFORMACIÓN CLÍNICA REAL
Fecha: 2026-09-12
```

No utilizar documentos, imágenes, números ni información de pacientes reales.

## 6. Juego de datos de El Alto

### 6.1 Paciente principal

| Campo | Valor |
| --- | --- |
| Nombre | `[QA P29-R01] Julia Mamani Condori` |
| Teléfono | `00002901` |
| Fecha de nacimiento | `15/03/1979` |
| Género | Femenino |
| Ciudad | El Alto |
| Departamento | La Paz |
| País | Bolivia |
| Procedencia | Igual a residencia |
| Motivo | `Dolor de rodilla de prueba` |
| Duración | `3 días` |
| Tipo | Primera consulta |
| Atención previa | No |
| Trae estudios | Sí |
| Alergias | Ninguna conocida |
| Enfermedad de base | `Hipertensión de prueba` |
| Medicación | `Enalapril 10 mg de prueba` |
| Fuente principal | Facebook |
| Fuente de apoyo | WhatsApp |

### 6.2 Consulta

| Campo | Valor |
| --- | --- |
| Diagnóstico principal | `Dolor de rodilla en evaluación (piloto)` |
| Hallazgos | `Molestia referida durante la prueba; sin evaluación clínica real.` |
| Observaciones | `Registro completamente ficticio para P29-R01.` |
| Plan | `Plan ficticio de una sesión para comprobar el recorrido.` |
| Indicaciones | `No aplicar a ninguna persona. Dato de prueba.` |
| Medicamento | `Producto ficticio P29-R01` |
| Dosis | `1 unidad` |
| Frecuencia | `Una vez` |
| Duración | `Solo prueba` |
| Evolución | `Evolución ficticia sin valor clínico.` |

### 6.3 Enfermería

| Campo | Valor |
| --- | --- |
| Tipo de orden | Signos vitales |
| Indicación | `Control ficticio de presión arterial P29-R01` |
| Presión sistólica | `150` |
| Presión diastólica | `95` |
| Pulso | `82` |
| Nota | `Valores ficticios; no corresponden a una persona real.` |

### 6.4 Productos

| Campo | Suero | Jeringa |
| --- | --- | --- |
| Código | `P29-R01-SUERO` | `P29-R01-JERINGA` |
| SKU El Alto | `P29-R01-SKU-S` | `P29-R01-SKU-J` |
| Nombre | `[QA P29-R01] Suero de prueba` | `[QA P29-R01] Jeringa de prueba` |
| Categoría | Sueros | Material clínico |
| Unidad | frasco | unidad |
| Uso | Venta y uso interno | Uso interno |
| Stock mínimo | 5 | 5 |
| Precio | Bs 50 | Bs 0 |
| Costo referencial | Bs 3 | Bs 5 |
| Stock inicial | 0 | 0 |

### 6.5 Proveedor

| Campo | Valor |
| --- | --- |
| Nombre | `[QA P29-R01] Proveedor de prueba` |
| Contacto | `[QA] Contacto ficticio` |
| Teléfono y WhatsApp | `00002911` |
| Correo | `p29-r01@local.invalid` |
| Dirección | `Dirección ficticia local` |
| Notas | `No contactar. Proveedor ficticio P29-R01.` |

### 6.6 Compra y lote

| Campo | Valor |
| --- | --- |
| Documento | `COMPRA-P29-R01-A` |
| Forma de pago | Crédito |
| Producto | Suero de prueba |
| Cantidad | 2 |
| Costo unitario | Bs 3 |
| Total | Bs 6 |
| Recepción | `REC-P29-R01-A` |
| Lote | `LOTE-P29-R01-S` |
| Vencimiento | `02/08/2027` |
| Ubicación | `Almacén piloto EA-01` |

### 6.7 Caja, venta y conciliación

| Concepto | Valor |
| --- | ---: |
| Efectivo inicial | Bs 100 |
| Almuerzo ficticio | - Bs 10 |
| Compra urgente de 2 jeringas | - Bs 10 |
| Venta de 1 suero | + Bs 50 |
| Efectivo esperado | Bs 130 |
| Efectivo contado | Bs 130 |
| Diferencia | Bs 0 |

## 7. Rutas que se deben recorrer

### Acceso y gobierno

- `/sigeco/login`
- `/sigeco`
- `/sigeco/mi-cuenta`
- `/sigeco/usuarios`
- `/sigeco/modulos`
- `/sigeco/sucursales`
- `/sigeco/auditoria`
- `/sigeco/documentos/configuracion`

### Recepción y pacientes

- `/sigeco/recepcion`
- `/sigeco/recepcion/nuevo`
- `/sigeco/recepcion?vista=pacientes`
- `/sigeco/recepcion/pacientes/[patientId]`
- `/sigeco/recepcion/pacientes/[patientId]/editar`
- `/sigeco/recepcion/visitas/[visitId]`
- `/sigeco/recepcion/duplicados`
- `/sigeco/recepcion/duplicados/[candidateId]`
- `/sigeco/recepcion/abandonos`

### Consulta, Enfermería y seguimiento

- `/sigeco/consultas`
- `/sigeco/consultas/[visitId]`
- `/sigeco/consultas/[visitId]/historial`
- `/sigeco/consultas/[visitId]/recetas/[documentId]`
- `/sigeco/enfermeria`
- `/sigeco/enfermeria/[workItemId]`
- `/sigeco/seguimientos`
- `/sigeco/seguimientos/[taskId]`
- `/sigeco/seguimientos/recordatorios`

### Administración y Caja

- `/sigeco/administracion`
- `/sigeco/administracion/[workItemId]`
- `/sigeco/administracion/clientes`
- `/sigeco/administracion/clientes/nuevo`
- `/sigeco/administracion/ventas`
- `/sigeco/administracion/ventas/nueva`
- `/sigeco/administracion/ventas/[saleId]`
- `/sigeco/administracion/caja`
- `/sigeco/administracion/caja/cierres/[sessionId]`

### Inventario, compras y catálogo

- `/sigeco/inventario`
- `/sigeco/inventario/nuevo`
- `/sigeco/inventario/[itemId]`
- `/sigeco/inventario/proveedores`
- `/sigeco/inventario/proveedores/nuevo`
- `/sigeco/inventario/lotes`
- `/sigeco/inventario/traslados`
- `/sigeco/compras`
- `/sigeco/compras/nueva`
- `/sigeco/compras/[purchaseId]`
- `/sigeco/compras/[purchaseId]/recibir`
- `/sigeco/catalogo`
- `/sigeco/catalogo/nuevo`

### Dirección y reportes

- `/sigeco/atribucion`
- `/sigeco/reportes/recorrido`
- `/sigeco/reportes/tiempos`
- `/sigeco/opiniones`
- `/sigeco/contingencia`

La palabra `[id]` no se escribe literalmente; se conserva el identificador que
SIGECO coloca en la URL.

## 8. Recorrido manual principal

Ejecutar en este orden. Los pasos posteriores reutilizan los datos anteriores:

1. login incorrecto y correcto, sesiones y cuentas;
2. alta de los dos productos y del proveedor;
3. compra a crédito, confirmación, recepción y lote del suero;
4. apertura de Caja por Bs 100;
5. egreso ficticio de Bs 10 para almuerzo;
6. compra urgente de 2 jeringas por Bs 10;
7. compra formal vinculada al egreso sin descontar otros Bs 10;
8. alta y llegada de Julia QA;
9. seis consentimientos independientes;
10. inicio de atención y derivación desde Recepción;
11. consulta, adjunto, receta, borrador y firma;
12. corrección clínica sin borrar la versión anterior;
13. propuesta de tratamiento aceptada;
14. signos vitales y cierre de tarea de Enfermería;
15. venta, pago, descuento de stock y comprobante;
16. seguimiento clínico y segunda llegada en la misma ficha;
17. seguimiento administrativo con Yazmin;
18. recordatorio supervisado sin envío automático;
19. encuesta privada y reclamo crítico ficticio;
20. abandono con pendientes y recuperación autorizada;
21. prevención y fusión controlada de duplicados sintéticos;
22. atribución y recorrido completo;
23. tiempos por área;
24. cierre de Caja con diferencia cero;
25. auditoría de los eventos importantes;
26. matriz positiva y negativa de permisos;
27. separación El Alto/Cochabamba;
28. móvil, red lenta y doble envío;
29. contingencia por corte largo;
30. incidente simulado con revocación de sesiones.

Los campos y resultados detallados de esos casos se encuentran en
[staff-pilot.md](./staff-pilot.md#10-orden-de-ejecución). Esta guía agrega las
comprobaciones estrictas multisucursal de la Tarea 17.

## 9. Prueba estricta El Alto/Cochabamba

### 9.1 Visitas y dashboard

1. seleccionar Cochabamba;
2. entrar como `p29.cbba.recepcion@local.invalid`;
3. crear `[QA P29-C01] Paciente Cochabamba`, teléfono `00002921`;
4. registrar una visita con motivo
   `Validación de aislamiento Cochabamba`;
5. dejar la visita activa y anotar los KPIs de Cochabamba;
6. cerrar sesión y entrar como superadministrador;
7. cambiar a El Alto;
8. comprobar que esa visita no aparece en dashboard, últimas llegadas,
   Recepción, Consulta, Enfermería ni Administración;
9. pegar directamente la URL de la visita de Cochabamba;
10. confirmar que no muestra información y responde como no encontrada o
    regresa al panel;
11. volver a Cochabamba y confirmar que la visita continúa intacta.

Un paciente puede tener identidad global, pero cada visita y expediente local
deben pertenecer únicamente a la sede que los creó.

### 9.2 Continuidad del mismo paciente

1. después de registrar a Julia en El Alto, seleccionar Cochabamba;
2. desde Recepción buscar exactamente el teléfono `00002901` durante una nueva
   llegada;
3. reutilizar la identidad encontrada, sin crear otra Julia;
4. registrar una visita de Cochabamba;
5. confirmar el mismo código global de paciente y distinto expediente/visita
   local;
6. como Recepción, comprobar que no existe una lista clínica global navegable;
7. como Médico, entrar en `Solo consultar`, indicar el motivo asistencial y
   revisar el antecedente remoto permitido;
8. confirmar que la consulta remota es solo lectura y queda auditada;
9. repetir con Enfermería, limitada a antecedentes de Enfermería y órdenes
   necesarias.

Dirección y superadministración no obtienen una historia clínica global por el
mero rol. Consultan la operación de la sede seleccionada o reportes
multisucursal expresamente autorizados.

### 9.3 Productos, proveedores y stock

El modelo esperado es híbrido:

- la identidad legal y el contacto general del proveedor son globales;
- la identidad canónica, fabricante, presentación y código de barras del
  producto son globales;
- habilitación, SKU, precio, costo, mínimo, ubicación y proveedor preferido son
  propios de cada sucursal;
- stock, lotes, alertas y movimientos son estrictamente locales.

Prueba:

1. asignar el Suero de prueba también a Cochabamba;
2. usar SKU `P29-C01-SKU-S`, precio Bs 55, costo Bs 4 y mínimo 3;
3. recibir 5 unidades en Cochabamba;
4. confirmar que El Alto conserva sus propios valores y stock;
5. vender una unidad en El Alto y verificar que Cochabamba no cambia;
6. vender dos unidades en Cochabamba y verificar que El Alto no cambia;
7. confirmar que alertas, lotes y ubicaciones permanecen separados;
8. actualizar el contacto general ficticio del proveedor y confirmar que la
   identidad global sí refleja el cambio;
9. comprobar que las condiciones comerciales locales no se reemplazan.

### 9.4 Caja, ventas, compras y documentos

1. abrir una Caja de El Alto con Bs 100;
2. abrir otra Caja de Cochabamba con Bs 200;
3. crear una venta y pago diferentes en cada sede;
4. confirmar que cada pago usa únicamente la Caja de su sede;
5. intentar abrir por URL una venta, compra, cierre o comprobante de la otra
   sede;
6. confirmar que se trata como no encontrado;
7. verificar que los números y documentos incluyen el contexto local correcto;
8. cerrar ambas Cajas y reconciliar cada una de manera independiente.

### 9.5 Módulos

1. seleccionar Cochabamba;
2. suspender Inventario indicando un motivo ficticio;
3. confirmar que Cochabamba queda sin escritura y conserva pendientes;
4. cambiar a El Alto;
5. confirmar que Inventario continúa operando normalmente;
6. reactivar Inventario en Cochabamba;
7. confirmar que stock, lotes y pendientes reaparecen sin cambios.

## 10. QA multiventana

### 10.1 Qué significa

La sucursal activa se conserva en una cookie del navegador. Todas las pestañas
del mismo perfil comparten esa cookie. No se espera mantener El Alto en una
pestaña y Cochabamba en otra dentro de la misma sesión.

La prueba busca confirmar que una pestaña antigua jamás puede guardar datos en
la sucursal que quedó seleccionada después.

### 10.2 Cambio de sucursal con pestaña antigua

1. abrir dos pestañas con `test@test.si`;
2. en A seleccionar El Alto y abrir un formulario sin enviarlo;
3. en B cambiar a Cochabamba mediante el modal;
4. volver a A y actualizar: debe mostrar Cochabamba;
5. sin actualizar otra copia del formulario antiguo, intentar enviarlo;
6. confirmar rechazo seguro por contexto desactualizado;
7. verificar que no se creó ninguna fila en El Alto ni Cochabamba;
8. repetir con visita, venta, pago, compra, recepción de stock y cambio de
   estado.

### 10.3 Dos sucursales simultáneas de forma controlada

Usar perfiles separados:

- Chrome normal para El Alto;
- incógnito, Firefox u otro perfil para Cochabamba.

Cada perfil mantiene su propia cookie. Crear operaciones diferenciadas y
confirmar que recargar, filtrar, exportar o abrir IDs nunca mezcla resultados.

### 10.4 Rotación médica y de Enfermería

1. entrar con el Médico asignado a ambas sedes;
2. desde El Alto seleccionar Cochabamba;
3. confirmar que el modal ofrece `Trabajar en esta sucursal` y
   `Solo consultar`;
4. elegir `Solo consultar` y comprobar ausencia/rechazo de escrituras;
5. elegir después `Trabajar en esta sucursal`;
6. confirmar que Cochabamba pasa a ser la única sede de trabajo;
7. confirmar que El Alto continúa disponible en solo consulta;
8. intentar guardar desde una pestaña antigua de El Alto y comprobar rechazo;
9. repetir todo con Enfermería.

### 10.5 Revisiones concurrentes y doble envío

1. abrir el mismo registro editable en dos pestañas;
2. guardar primero en A;
3. guardar después la versión antigua de B;
4. confirmar que B no sobrescribe silenciosamente la revisión nueva;
5. activar red lenta en las herramientas del navegador;
6. hacer doble clic controlado en llegada, pago, egreso, compra y recepción;
7. comprobar que existe una sola operación de cada tipo.

## 11. Matriz de roles

| Rol | Ruta permitida | Ruta que debe rechazarse |
| --- | --- | --- |
| Recepción | `/sigeco/recepcion` | `/sigeco/consultas` |
| Médico | `/sigeco/consultas` | `/sigeco/administracion/caja` |
| Enfermería | `/sigeco/enfermeria` | `/sigeco/compras` |
| Administración | `/sigeco/administracion/caja` | `/sigeco/auditoria` |
| Yazmin/Recepción | `/sigeco/seguimientos` | `/sigeco/inventario` |
| Dirección | `/sigeco/auditoria` | `/sigeco/usuarios` |
| Superadministrador | `/sigeco/usuarios` | Los módulos suspendidos deben bloquear escritura igualmente |

Para cada cuenta:

1. revisar que el menú muestre solo lo autorizado;
2. abrir una ruta permitida;
3. escribir manualmente la ruta prohibida;
4. comprobar que vuelve a `/sigeco` sin mostrar datos durante un instante;
5. confirmar que el intento queda auditado sin contraseñas ni contenido
   clínico completo.

## 12. Responsive, red y almacenamiento del navegador

Repetir las tareas principales en:

- `390 × 844` móvil;
- `820 × 1180` tableta;
- `1440 × 900` escritorio.

Comprobar:

- ausencia de desplazamiento horizontal de toda la página;
- controles táctiles utilizables;
- botones y textos sin superposición;
- tablas desplazables dentro de su contenedor;
- modales completos y cerrables;
- aviso de desconexión y recuperación segura;
- formularios sin operaciones duplicadas;
- historia clínica y adjuntos ausentes de `localStorage`, `sessionStorage` y
  caché offline.

## 13. Evidencia y registro de defectos

Usar una fila por caso:

| Caso | Fecha/hora | Rol | Sucursal | Dispositivo | Ruta | ID creado | Esperado | Obtenido | Evidencia | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P29-01 |  |  |  |  |  |  |  |  |  | Pendiente |

Estados:

- `Aprobado`: coincidió con lo esperado;
- `Repetir`: existió duda, ayuda o error menor;
- `Bloqueado`: no se puede continuar de manera segura;
- `No aplica`: Dirección debe justificarlo por escrito.

Registro de defectos:

| ID | Caso | Acción | Esperado | Obtenido | Severidad | Evidencia | Responsable | Estado | Revalidación |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DEF-P29-R01-01 |  |  |  |  |  |  |  | Abierto |  |

Severidades:

- `Crítico`: fuga o mezcla de datos, pérdida clínica/financiera, duplicación de
  dinero/stock o acceso no autorizado;
- `Alto`: una función principal no puede completarse sin alternativa segura;
- `Medio`: la tarea se completa con dificultad o resultado confuso;
- `Bajo`: problema visual o de texto que no bloquea el trabajo.

Detener inmediatamente el piloto si se mezclan sucursales, se pierde evidencia
clínica/financiera, se duplica dinero o stock, un archivo privado abre sin
sesión o no se puede confirmar el ambiente.

## 14. Reconciliación final esperada

| Control | Resultado esperado |
| --- | ---: |
| Paciente principal global | 1 |
| Visita principal El Alto | 1 |
| Visita de retorno en la misma ficha | 1 |
| Venta principal El Alto | 1 |
| Vendido | Bs 50 |
| Cobrado | Bs 50 |
| Saldo de venta | Bs 0 |
| Suero recibido El Alto | 2 |
| Suero vendido El Alto | 1 |
| Suero disponible El Alto | 1 |
| Jeringas recibidas El Alto | 2 |
| Egreso de compra urgente | 1 de Bs 10 |
| Egreso de almuerzo | 1 de Bs 10 |
| Efectivo esperado El Alto | Bs 130 |
| Efectivo contado El Alto | Bs 130 |
| Diferencia El Alto | Bs 0 |
| Receta | versión 1 y corrección trazable |
| Comprobante | versión 1 |
| Visita Cochabamba | visible solo bajo Cochabamba |
| Stock Cochabamba | independiente de El Alto |
| Caja Cochabamba | independiente de El Alto |

## 15. Cierre técnico después del QA manual

Detener `pnpm dev` y ejecutar:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm deps:check
pnpm security:gate:local
pnpm backup:drill:local
CI=1 pnpm run build
git diff --check
```

`pnpm test:integration` reinicia exclusivamente la base de `.env.test`; se debe
verificar esa URL antes de ejecutarlo. El gate local no autoriza producción.

## 16. Aprobación de Dirección

La aprobación no puede limitarse a “se ve bien”. Completar:

| Área | Sucursal | Persona que probó | Casos | Resultado | Acceso prohibido bloqueado | Defectos abiertos | Evidencia | Firma Dirección |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Recepción | El Alto |  |  |  |  |  |  |  |
| Recepción | Cochabamba |  |  |  |  |  |  |  |
| Consulta | Ambas |  |  |  |  |  |  |  |
| Enfermería | Ambas |  |  |  |  |  |  |  |
| Administración/Caja | Ambas |  |  |  |  |  |  |  |
| Compras/Inventario | Ambas |  |  |  |  |  |  |  |
| Seguimientos | Ambas |  |  |  |  |  |  |  |
| Módulos/Auditoría | Ambas |  |  |  |  |  |  |  |
| Multiventana | Ambas |  |  |  |  |  |  |  |
| Dispositivos/red | Ambas |  |  |  |  |  |  |  |

Local queda aprobado únicamente cuando:

- todos los casos obligatorios están aprobados;
- Caja termina con diferencia cero;
- inventario y libro de movimientos coinciden;
- no hay mezcla entre El Alto y Cochabamba;
- no quedan defectos críticos o altos abiertos;
- cada defecto corregido fue repetido;
- se registraron commit, fecha, navegador, dispositivo e IDs;
- Dirección firma cada área.

Texto sugerido:

```text
Apruebo la ejecución local <ID> correspondiente al commit <HASH> para pasar a
validación en staging. Esta aprobación no autoriza producción.

Nombre:
Cargo:
Fecha y hora:
Firma o confirmación verificable:
```

Después se repite en staging usando otro identificador, por ejemplo `P29-S01`,
y se genera otra aprobación. Producción continúa sin cambios.

## 17. Cambios todavía no commiteados

Los cambios acumulados de las Tareas 1–17 no deben descartarse ni resetearse.
Para que el QA sea reproducible, revisar y crear un commit antes de comenzar:

```bash
git status --short
git diff --check
git diff --stat
git add -p
git diff --cached --check
git diff --cached --stat
git diff --cached --name-only
```

Verificar que nunca se incluyan:

- `.env`, `.env.staging` o `.env.piloto`;
- `.data` o `.next`;
- contraseñas, tokens, PDFs, adjuntos o backups;
- capturas con datos sensibles.

Sí deben incluirse el reporte de Tarea 17, las migraciones nuevas, las pruebas
RLS y todos los cambios funcionales que fueron validados juntos.

Commit sugerido para el cierre acumulado:

```bash
git commit -m "test(sigeco): verify strict branch isolation end to end"
git rev-parse --short HEAD
```

Guardar ese hash en la evidencia. Si el QA descubre un defecto, corregirlo en
un commit posterior y repetir el caso afectado. No hacer merge ni push a
staging antes de la aprobación local de Dirección.

## 18. Documentación relacionada

- [Piloto completo del personal](./staff-pilot.md)
- [Operación multisucursal](./multi-branch-operations.md)
- [Flujo completo SIGECO](./sigeco-v3-full-flow-testing.md)
- [Staging aislado](./staging.md)
- [Lanzamiento y suspensión de módulos](./module-launch-suspension.md)
- [Reporte técnico de la Tarea 17](../project/task-reports/2026-09-11-tarea-17-cierre-acumulado-despliegue-controlado.md)

