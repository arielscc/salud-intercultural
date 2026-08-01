# Operación Multi-Sucursal

Esta guía explica cómo SIGECO separa El Alto y Cochabamba sin crear dos fichas
para el mismo paciente.

## Estado Actual

- `el-alto`: activa y predeterminada para el personal existente.
- `cochabamba`: en preparación; aparece para Dirección, pero no admite
  operación real ni se puede seleccionar todavía.
- Staging y producción no fueron modificados por la Tarea 28.

## Qué Es Único Y Qué Se Separa

La ficha del paciente es única. Si una persona se atiende primero en El Alto y
después en Cochabamba, conserva el mismo código y expediente. Cada visita sí
guarda la sucursal donde ocurrió.

Se separan por sucursal:

- colas de Recepción, Consulta, Enfermería y Administración;
- ventas, pagos y movimientos de Caja;
- sesiones y cierres de Caja;
- compras, pagos a proveedores y recepciones;
- lotes, movimientos, saldos y traslados de inventario;
- reportes detallados.

## Sucursal Activa

La cabecera muestra siempre la sucursal activa, también en móvil. El selector
solo permite sedes activas asignadas al usuario. Antes de cambiar pide una
confirmación; al aceptar, las bandejas y datos operativos se vuelven a cargar
con la nueva sede.

Dirección asigna una o varias sucursales desde la cuenta de cada usuario. Toda
persona debe conservar una sede activa como predeterminada. Es posible dejarle
Cochabamba asignada durante la preparación, pero no elegirla como sede activa
hasta su apertura.

## Caja Y Operaciones Financieras

Cada sesión de Caja pertenece a una sucursal. Una venta o pago busca únicamente
la Caja abierta de su misma sede. Un identificador de otra sucursal no permite
ver ni usar su sesión. Los cierres se consultan dentro de la sede activa.

## Stock Y Traslados

El catálogo de productos es compartido, pero la cantidad disponible es propia
de cada sucursal. Una venta descuenta solo el saldo y los lotes de la sede de la
visita.

Un traslado confirmado crea, dentro de una sola transacción:

1. una salida en la sucursal de origen;
2. una entrada por la misma cantidad en la sucursal de destino;
3. un registro que enlaza ambos movimientos, producto, responsable y motivo.

El traslado es append-only: no se edita ni se borra. Si hay un error, se debe
registrar un traslado compensatorio. Mientras Cochabamba esté en preparación,
el formulario de traslado permanece bloqueado.

## Reporte De Dirección

`/sigeco/sucursales` compara visitas, ventas, cobros, compras, stock y Cajas por
sede. Solo `direccion` y `super_admin` pueden ver el consolidado. Los datos de
prueba se muestran en una columna independiente y no se suman a los resultados
reales.

## Validación Sintética De Cochabamba

En local o test se puede ejecutar:

```bash
pnpm branches:seed:synthetic
```

El comando es idempotente, exige que Cochabamba siga en preparación y crea una
visita marcada con `isTestData=true`. Se bloquea en staging y producción.

## Antes De Activar Cochabamba

Dirección debe autorizar expresamente la apertura. Luego el equipo técnico debe:

1. ejecutar backup y revisar el gate de seguridad;
2. aplicar las migraciones primero en staging;
3. asignar personal y definir su sede predeterminada;
4. configurar Caja, responsables y ubicación de inventario;
5. realizar traslados iniciales con conteo físico;
6. probar el flujo completo con datos sintéticos;
7. activar la sede solo después de la aprobación final.

Cambiar `ClinicBranch.status` a `active` no forma parte de esta tarea y no debe
hacerse en producción sin aviso y autorización.
