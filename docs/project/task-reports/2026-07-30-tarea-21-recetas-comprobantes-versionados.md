# Tarea 21 — Recetas Y Comprobantes Versionados

Fecha: 2026-07-30. Entorno modificado: desarrollo local.

## Resultado

- Las recetas se emiten desde la receta clínica vigente y una consulta
  finalizada.
- Los comprobantes se emiten desde los productos, totales, pagos y devoluciones
  reales de la venta.
- Cada emisión conserva paciente, responsable, fecha, fuente, número y versión.
- Una fuente sin cambios reutiliza el documento existente; no crea copias
  innecesarias.
- Una corrección de receta o un cambio financiero crea otra versión y enlaza la
  anterior.
- Las versiones emitidas son append-only en PostgreSQL.
- El comprobante dice expresamente “No es factura fiscal”.
- La receta exige identidad profesional confirmada y queda preparada para firma
  y sello, sin afirmar una firma electrónica inexistente.

## Web Y Móvil

- Consulta permite emitir, revisar historial y corregir la receta.
- Venta permite emitir y revisar el historial del comprobante interno.
- Dirección configura registros profesionales desde Documentos.
- La vista previa HTML es legible en teléfono; escritorio incluye el visor PDF.
- Descarga y reimpresión usan un endpoint autenticado con `no-store`.
- No se habilitó compartir libremente por canales personales.

## Datos, Seguridad Y Auditoría

- `Prescription` ahora tiene versión, motivo y referencia a la anterior.
- `ClinicalProfessionalProfile` conserva la identidad confirmada.
- `GeneratedDocument` conserva un snapshot JSON y una huella SHA-256 de la
  fuente.
- Constraints validan versión y relación correcta con receta o venta.
- Triggers impiden editar o borrar un documento emitido.
- Generación, descarga y reimpresión son eventos importantes auditados.
- Preview repetitiva no genera eventos para evitar ruido y peticiones
  innecesarias.
- La migración local es
  `20260730201257_versioned_prescriptions_receipts`.

## Criterio Fiscal Y Clínico

La implementación usa “comprobante interno” porque SIGECO no es un sistema de
facturación autorizado ni validado por el SIN. Los tipos de receta, registros
profesionales, firma y sello deben confirmarse con responsables clínicos antes
de producción.

## Validación Ejecutada

- Prisma validate, migración local y Prisma generate: aprobados.
- TypeScript: aprobado.
- Seguridad y pruebas enfocadas: 4 archivos, 14 pruebas, aprobadas.
- Se agregó prueba de integración de idempotencia, nueva versión e
  inmutabilidad, reservada para el cierre acumulado.

## Pendientes Antes De Producción

- Ejecutar integración completa, lint global, build y QA gstack acumulado.
- Probar impresión y descarga en teléfonos reales.
- Confirmar datos profesionales reales con Dirección.
- Confirmar requisitos clínicos y fiscales con asesoría competente.
- Validar roles y PDF en staging.
- Avisar y pedir autorización expresa antes de tocar producción.

## Commit Sugerido

`feat(sigeco): generate versioned documents`

