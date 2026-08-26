# Tarea 12: staging aislado y ensayo de la Etapa 1

## Fecha

2026-08-26

## Objetivo

Probar el lanzamiento completo antes de tocar producción.

Plan: [Lanzamiento por etapas](../sigeco-lanzamiento-por-etapas/tasks.md).

## Estado Real De Staging

La infraestructura existe: base Neon `salud_intercultural_staging`, schema
`payload_staging`, dominio `staging.saludintercultural.com`, comunicaciones
bloqueadas y token de Blob para media. Pero **staging no puede arrancar hoy**.

| Requisito | Estado |
| --- | --- |
| Base exclusiva | Listo |
| Schema Payload separado | Listo |
| Comunicaciones bloqueadas | Listo |
| Blob de media | Listo |
| **Blob clínico privado** | **Falta** `STAGING_CLINICAL_BLOB_READ_WRITE_TOKEN` |
| **Secreto de integración** | **Falta** `PAYLOAD_SIGECO_INTEGRATION_SECRET` |
| Migraciones aplicadas | 12 de 66; faltan 54 |
| Rama `staging` desplegada | 175 commits atrás de `develop` |

`pnpm staging:check` falla con
`STAGING_CLINICAL_BLOB_READ_WRITE_TOKEN is required for private clinical files`.
Son dos secretos que **no se pueden inventar**: el primero exige crear un Blob
Store privado en Vercel y copiar su token; el segundo, generar una cadena de al
menos 32 caracteres exclusiva de staging.

## Las Barreras De Aislamiento Funcionan

Es uno de los criterios de la tarea, y se verificó una por una levantando una
configuración válida de staging y rompiéndola de a un campo:

| Intento | Resultado |
| --- | --- |
| Base productiva | Bloqueado: el nombre debe contener "staging" |
| Dominio productivo | Bloqueado: solo el dominio oficial de staging |
| Schema Payload compartido | Bloqueado: `PAYLOAD_DB_SCHEMA` debe contener "staging" |
| Comunicaciones habilitadas | Bloqueado: debe ser `blocked` |
| Analytics real | Bloqueado: staging no usa GA ni verificación productiva |
| Ambiente de base productivo | Bloqueado: `DATABASE_ENVIRONMENT` debe ser `staging` |
| Blob de media productivo | Bloqueado: exige el token de staging |
| Sin blob clínico privado | Bloqueado: exige un store privado propio |

Ocho de ocho. Una configuración completa y correcta sí pasa, así que la barrera
no bloquea por bloquear.

## El Ensayo, Convertido En Script

El criterio pedía recorrer alta de cliente, venta, cobro, recibo, egreso,
compra, recepción, stock y cierre de Caja. En lugar de una lista para seguir a
mano, quedó como `pnpm stage-one:rehearse`: un recorrido reproducible que usa las
mismas funciones que la aplicación y **verifica cada paso**.

Se ejecutó de punta a punta contra PostgreSQL real:

```
Etapa 1 encendida              core, administracion, inventario, compras, catalogo
Producto con stock inicial     ENSAYO-2026-08-26-P1, stock 10
Caja abierta                   apertura 100 Bs
Cliente registrado sin visita  SI-000001, visitas 0
Venta creada y stock descontado total 90 Bs, stock 8
Cobro registrado en Caja       90 Bs, saldo 0
Recibo emitido                 CINT-20260826-A97F2B75-V1 v1
Egreso autorizado              30 Bs
Compra recibida con lote       stock 13, lote ENSAYO-2026-08-26-L1
Módulo suspendido y reactivado lectura para Dirección, escritura bloqueada
Caja cerrada y conciliada      esperado 35 Bs, diferencia 0 Bs, cuadró sin aprobación

11 pasos completados sin defectos.
```

La cuenta cierra sola: 100 de apertura + 90 de la venta − 30 del egreso − 125 de
la compra = 35 Bs. El script reporta lo que el sistema espera, como haría un
conteo físico correcto, y **falla si aparece cualquier diferencia**.

El script solo corre contra una base cuyo nombre contenga `staging`, `test` o
`dev`, y exige confirmar el nombre a mano. Todo lo que crea lleva el prefijo
`ENSAYO-<fecha>`.

## Lo Que Encontró El Ensayo

- **Una compra en efectivo se paga al confirmarla**, contra la Caja abierta, y no
  admite un pago aparte. La primera versión del ensayo intentaba las dos cosas y
  el sistema la rechazó, con razón.
- **Un cierre que cuadra no pasa por Dirección.** Solo una diferencia mayor al
  umbral requiere aprobación. El ensayo recorre el camino que corresponda en cada
  caso.

Ninguno de los dos es un defecto: son reglas del negocio que el ensayo ahora
documenta ejecutándolas.

## Pendiente

Lo que falta **no es código**:

1. Crear el Blob Store privado de staging en Vercel y poner su token en
   `.env.staging` como `STAGING_CLINICAL_BLOB_READ_WRITE_TOKEN`.
2. Generar `PAYLOAD_SIGECO_INTEGRATION_SECRET` exclusivo de staging.
3. `pnpm staging:check` debe pasar.
4. Promover `develop → staging` con `pnpm promote:staging` y aplicar las 54
   migraciones con `pnpm staging:migrate`. **Las migraciones van antes de que el
   código nuevo quede sirviendo**, o la aplicación falla contra un esquema viejo.
5. Sembrar datos sintéticos con `pnpm staging:seed` y verificar con
   `pnpm staging:verify`.
6. Correr `pnpm stage-one:rehearse` contra staging.
7. QA autenticado por rol y con módulos apagados, en móvil y escritorio.

Hasta entonces la tarea no puede darse por terminada, aunque el ensayo esté listo
y probado.
