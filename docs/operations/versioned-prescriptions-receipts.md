# Recetas Y Comprobantes Versionados

Guía operativa de la Tarea 21. La fuente de verdad son la receta clínica, la
venta y sus pagos registrados en SIGECO. El formulario del documento no permite
escribir una versión distinta de esos datos.

## Decisión Clínica Y Fiscal

La receta se prepara con nombre, título, especialidad, registro del Ministerio
de Salud y registro del Colegio Médico del profesional. El PDF indica que está
preparado para firma y sello: SIGECO no afirma que exista una firma electrónica
ni reemplaza la revisión profesional.

El [Código de Ética y Deontología Médica del Ministerio de
Salud](https://www.minsalud.gob.bo/images/Documentacion/normativa/CODIGODEETICAYDEONTOLOGIAMEDICA.pdf)
establece datos profesionales para el sello y diferencia tipos de receta. Antes
de producción, Dirección debe confirmar con asesoría clínica cuál corresponde a
cada tratamiento y si alguna sustancia exige una receta especial, valorada o
archivada.

El documento de venta se llama **Comprobante interno — no es factura fiscal**.
SIGECO no tiene en esta tarea autorización, credenciales ni validación del SIN.
Las [modalidades de facturación del
SIN](https://siatinfo.impuestos.gob.bo/index.php/12-modalidades-de-facturacion)
y la [facturación electrónica en
línea](https://siatinfo.impuestos.gob.bo/index.php/facturacion-en-linea/factura-electronica)
usan sistemas autorizados y validación fiscal. Cambiar el título a “factura” no
lo convertiría en un documento fiscal.

## Responsables

- **Médico:** revisa la receta vigente, la emite, firma y sella. Si corrige,
  explica el motivo y crea una nueva versión.
- **Administración:** emite el comprobante interno desde la venta y sus pagos.
- **Dirección:** confirma los datos profesionales y define el mecanismo
  autorizado para entregar o compartir documentos.
- **Super administrador:** mantiene la función técnica; no inventa registros
  profesionales ni aprueba el contenido clínico.

## Configuración Inicial

1. Dirección abre `/sigeco/documentos/configuracion`.
2. Completa los cinco datos profesionales del médico.
3. Revisa los registros contra documentos reales.
4. Activa “Datos revisados y habilitados”.
5. El médico ya puede emitir recetas nuevas.

Una receta queda bloqueada si el perfil profesional falta o está inactivo.

## Emitir Una Receta

1. El médico guarda la receta clínica dentro de la consulta.
2. Finaliza la consulta.
3. En “Receta para entregar”, elige **Emitir primera versión**.
4. Revisa la vista previa.
5. Descarga el PDF o abre **Imprimir copia**.
6. Firma y sella antes de entregar.

El documento contiene solamente los datos de `Prescription`,
`PrescriptionItem`, paciente, visita y perfil profesional confirmados.

## Corregir Una Receta

1. Abrir “Corregir receta emitida”.
2. Escribir el motivo real.
3. Corregir el tratamiento, dosis, frecuencia, duración u observaciones.
4. Confirmar.

SIGECO inserta una nueva `Prescription`, la enlaza con la anterior y emite una
nueva `GeneratedDocument`. La versión anterior no cambia ni se borra.

## Emitir Un Comprobante Interno

1. Administración abre el detalle de la venta.
2. Revisa productos, descuento, total, pagos, devoluciones y saldo.
3. Elige **Emitir primera versión** o **Comprobar y emitir versión vigente**.
4. SIGECO bloquea la emisión si las sumas no coinciden.
5. Revisa, descarga o imprime.

Si se agrega un pago o devolución después, la siguiente emisión crea otra
versión. Si nada cambió, SIGECO reutiliza la misma versión.

## Reimpresión, Descarga Y Auditoría

- Generar una versión registra un evento de auditoría.
- Descargar registra `document.pdf.download`.
- Imprimir otra copia registra `document.pdf.reprint`.
- Abrir la vista previa no llena la auditoría con lecturas repetitivas.
- Descargar o reimprimir nunca modifica el documento original.

Los PDF requieren sesión y permiso, se entregan con `private, no-store` y no se
guardan en una URL pública.

## Uso En Teléfono

La pantalla muestra un resumen legible sin depender del visor PDF. El PDF se
puede descargar o abrir para imprimir. No se agregó envío libre a WhatsApp,
correo o redes: compartir debe hacerse únicamente por el mecanismo que
Dirección apruebe, comprobando al destinatario.

## Antes De Producción

- Confirmar datos y registros reales de cada médico.
- Confirmar tipos de receta y requisitos clínicos con asesoría profesional.
- Confirmar con asesoría contable/fiscal que el comprobante siga siendo
  únicamente interno.
- Ejecutar integración, build, QA web/móvil y pruebas negativas por rol.
- Aplicar la migración primero en staging y validar PDF e impresión.
- Pedir autorización expresa antes de migrar o habilitar en producción.

