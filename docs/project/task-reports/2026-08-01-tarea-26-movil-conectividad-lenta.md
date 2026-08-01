# Tarea 26 — Móvil Y Conectividad Lenta

Fecha: 2026-08-01. Entorno modificado: desarrollo local.

## Resultado

- Estado global en línea, conexión lenta, sin conexión y conexión recuperada.
- Un formulario no se envía sin conexión y conserva lo escrito en pantalla.
- La reconexión no repite automáticamente dinero o stock.
- `SubmitButton`, `NoticeForm`, avisos y errores distinguen guardando, guardado
  y falta de confirmación.
- Idempotencia agregada a llegada, venta con cobro, pago y movimientos manuales
  de stock; se reutiliza la protección existente de Caja y Compras.
- Borrador local estricto únicamente para la nueva compra administrativa.
- Limpieza de claves `sigeco.*` al cerrar la sesión actual.
- Ficha imprimible en `/sigeco/contingencia` para cortes largos.
- Controles móviles principales ajustados a 44 px y teclados de teléfono,
  cantidad y dinero conservados.
- Historia clínica y adjuntos permanecen fuera del almacenamiento local y del
  caché offline.

## Decisiones De Riesgo

- No se agregó PWA, service worker ni sincronización automática en segundo
  plano.
- El borrador de compra excluye pacientes, datos clínicos y archivos.
- Una respuesta perdida se reintenta manualmente con la misma clave; nunca se
  repiten cobros o stock en automático.
- La ficha en papel debe imprimirse antes del corte y protegerse como documento
  privado.

## Migración

- `20260801160000_mobile_resilience_idempotency`: claves únicas opcionales en
  `Visit`, `Sale`, `Payment` e `InventoryMovement` para conservar registros
  históricos y proteger operaciones nuevas.

La migración se aplicó solo en `salud_intercultural_dev`. La base local quedó
al día con 35 migraciones. Staging y producción no fueron modificados.

## Validación Ejecutada

- Prisma format, validate, generate y migración local aprobados.
- TypeScript y lint enfocado aprobados.
- Conexión, bloqueo offline, storage, borrador seguro, schemas, privacidad y
  límites de seguridad: 10 archivos y 48 pruebas aprobadas.
- Las pruebas de integración existentes ahora cubren reintentos de visita,
  venta, pago, entrada y ajuste de stock, pero se ejecutarán en el cierre
  acumulado acordado.
- Build completo, integración acumulada y QA gstack permanecen aplazados hasta
  terminar todas las tareas.

## Pendientes Antes De Producción

- Ejecutar la simulación real de red lenta y corte temporal en staging.
- Validar targets táctiles y cámara en teléfonos físicos.
- Ensayar la ficha en papel con Recepción y Administración.
- Ejecutar integración, build y QA gstack acumulados.
- Avisar y pedir autorización antes de migrar o habilitar producción.

## Commit Sugerido

`feat(sigeco): improve mobile resilience`
