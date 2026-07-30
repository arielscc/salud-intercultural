# Correcciones, Cierre Y Firma Clínica

Esta guía explica cómo guardar, finalizar y corregir una consulta médica sin
ocultar ni reemplazar su historia.

## Estados De La Consulta

### Borrador

El médico todavía está revisando la información. Puede guardar varias veces.
Cada guardado conserva una versión y aumenta el número de revisión.

### Finalizada

El médico confirma que el registro está completo. SIGECO guarda:

- usuario que finalizó;
- fecha y hora;
- número de versión;
- contenido exacto aprobado.

Esta es una firma clínica interna: identifica la cuenta autenticada que realizó
el cierre. No es una firma digital criptográfica ni reemplaza los requisitos
legales que puedan aplicarse a documentos externos.

Una visita que ya contiene una consulta no puede marcarse como completada
mientras esa consulta continúe en borrador.

## Qué Forma Parte De La Versión

La fotografía de la consulta incluye:

- motivo;
- diagnóstico principal y secundario;
- hallazgos;
- observaciones;
- plan de tratamiento;
- indicaciones.

Recetas, evoluciones, órdenes clínicas, ventas, cobros y aplicaciones son
registros relacionados pero independientes. Una corrección de la consulta no
los modifica automáticamente.

## Cómo Corregir

Una consulta finalizada no vuelve a borrador. El médico autorizado debe:

1. abrir `Corregir consulta finalizada`;
2. elegir el tipo de corrección;
3. escribir un motivo claro;
4. modificar únicamente los datos necesarios;
5. revisar la advertencia;
6. confirmar la nueva versión.

SIGECO conserva la versión anterior, registra autor y hora, y marca la nueva
como vigente.

No se permite crear una corrección si los campos son iguales a la versión
vigente.

## Historial Y Comparación

La ruta `/sigeco/consultas/[visitId]/historial` permite:

- ver todas las versiones;
- conocer autor, fecha y tipo de cambio;
- leer el motivo de una corrección;
- comparar dos versiones;
- identificar los campos modificados.

En móvil cada campo se presenta en bloques que permiten leer ambas versiones
sin una tabla ancha.

## Permisos

- Médico y super administrador: guardar borrador, finalizar y corregir.
- Dirección: consultar la versión vigente, historial y comparación.
- Otros roles: sin acceso a la consulta clínica.

La página oculta los controles no autorizados y el servidor vuelve a comprobar
el permiso en cada acción.

## Protección Contra Dos Pestañas

Cada formulario envía la revisión que estaba viendo. Si otra persona o pestaña
guardó primero, SIGECO rechaza el segundo cambio y pide recargar.

Esto evita que el último clic reemplace silenciosamente el trabajo anterior.

## Datos Anteriores

La migración crea una primera versión para las consultas ya existentes. Estas
permanecen como borradores porque el sistema no inventa una firma ni una fecha
de aprobación que nunca fueron registradas.

## Antes De Producción

1. Probar borrador, cierre y corrección con un médico.
2. Confirmar que Dirección solo pueda leer.
3. Abrir dos pestañas y comprobar el rechazo de una revisión antigua.
4. Corregir una consulta con venta, orden o aplicación y verificar que esos
   registros no cambien.
5. Revisar la comparación en escritorio y móvil.
6. Ejecutar integración, build y QA acumulados.
7. Solicitar autorización expresa antes de migrar producción.

