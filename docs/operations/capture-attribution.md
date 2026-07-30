# Fuentes De Captación Y Atribución

Esta guía explica cómo registrar de manera simple dónde conoció el paciente a
la clínica y cómo comparar ese origen con llegadas, planes de tratamiento,
ventas e ingresos.

## Lo Que Debe Preguntar Recepción

La pregunta principal es:

> ¿Dónde conoció la clínica por primera vez: Facebook, TikTok, WhatsApp, una
> recomendación u otro medio?

Recepción selecciona una **fuente principal**. Después puede registrar canales
de apoyo.

Ejemplo:

- Fuente principal: TikTok.
- Fuente de apoyo: WhatsApp.

WhatsApp ayudó a coordinar la llegada, pero no borra que la persona conoció la
clínica por TikTok.

No se debe preguntar si Facebook era publicidad pagada o una publicación
normal. Tampoco se debe pedir al paciente que recuerde cuál cuenta exacta de
TikTok vio.

## Dos Historias Que Se Conservan

1. **Fuente original del paciente:** queda guardada cuando se crea la ficha y
   no se reemplaza desde la edición ni en visitas posteriores.
2. **Fuentes de cada llegada:** cada visita conserva su propia fuente principal
   y sus apoyos.

Esto evita que una visita nueva cambie los datos históricos.

## Códigos De Evidencia

El campo **Código de formulario o campaña** es opcional. Solo se usa cuando el
código aparece en un formulario, enlace o registro comercial verificable.

Ejemplos iniciales:

| Código | Detalle obtenido automáticamente |
| --- | --- |
| `TIKTOK-DR` | TikTok del Dr. Franco, orgánico |
| `TIKTOK-DRA` | TikTok de la Dra. Cinthia, orgánico |
| `FACEBOOK-CLINICA` | Facebook institucional, orgánico |
| `WEB-123` | Formulario público número 123 y su campaña, si la tenía |

Recepción escribe o copia el código. SIGECO busca la configuración y obtiene la
cuenta y el tipo de tráfico. Si el código no existe, la llegada no se guarda
hasta corregirlo. No existe un selector manual de “orgánico” o “pagado” para
Recepción.

Cuando no hay evidencia, el detalle interno queda como **No identificado**.

## Enlaces Y Formularios

Marketing puede usar un enlace con código:

```text
https://sitio.example/contacto?camp=TIKTOK-DR&utm_source=tiktok&utm_medium=organic
```

El formulario público conserva el código y las etiquetas UTM. Al enviarse,
muestra un código como `WEB-123`. Si la persona continúa por WhatsApp, ese
código se agrega al mensaje.

El contacto previo a la llegada continúa en Payload y en la bandeja comercial
acordada. Esta tarea no reactiva el antiguo módulo de leads de SIGECO.

## Reporte

La ruta `/sigeco/atribucion` permite filtrar por fechas, ciudad de llegada y
departamento.

Muestra:

- llegadas;
- pacientes distintos;
- planes de tratamiento registrados por el médico;
- ventas;
- monto vendido;
- ingresos realmente cobrados;
- fuentes principales y fuentes que ayudaron;
- cuentas o campañas identificadas mediante evidencia.

Las ventas y los ingresos se asignan únicamente a la fuente principal para
evitar sumarlos dos veces. Una fuente de apoyo sí aparece en la columna de
llegadas influenciadas.

El reporte es agregado: no muestra diagnósticos ni detalles clínicos.

## Catálogo Administrable

Dirección y el super administrador pueden:

- crear una fuente;
- cambiar el texto sencillo que ve Recepción;
- cambiar el nombre interno;
- ordenar las opciones;
- mostrar u ocultar una opción en Recepción;
- desactivar una fuente sin borrar su historial;
- crear campañas con cuenta, código y tipo de tráfico;
- activar o desactivar campañas.

Desactivar no elimina visitas anteriores.

## Ambientes

La migración `20260729210000_capture_attribution` está aplicada únicamente en
desarrollo local.

Antes de staging se debe:

1. aplicar las migraciones Prisma;
2. actualizar el schema de Payload mediante el proceso de seed de staging;
3. crear los fixtures sintéticos;
4. probar una llegada `TikTok + WhatsApp`;
5. probar `TIKTOK-DR`, `TIKTOK-DRA` y `FACEBOOK-CLINICA`;
6. verificar el reporte con Dirección en móvil y escritorio.

Producción no debe actualizarse sin autorización expresa. Antes de hacerlo se
deben revisar la migración Prisma, el cambio de Payload, los códigos públicos y
el reporte con datos de staging.

