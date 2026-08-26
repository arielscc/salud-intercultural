# Tarea 11: CI remoto y cierre acumulado

## Fecha

2026-08-25

## Objetivo

Que ningún cambio llegue a `staging` o `main` sin pasar los controles, y ejecutar
el cierre acumulado de las Fases A y B: la primera vez que pruebas, integración y
build corren completos sobre este trabajo.

Plan: [Lanzamiento por etapas](../sigeco-lanzamiento-por-etapas/tasks.md).

## Resultado Del Cierre Acumulado

Los seis controles del gate, en verde por primera vez juntos:

| Control | Resultado |
| --- | --- |
| `pnpm lint` | Sin errores, 14,6 s |
| `pnpm typecheck` | Sin errores |
| `pnpm test` | 93 archivos, 480 pruebas |
| `pnpm test:integration` | 24 archivos, 94 pruebas, 67 migraciones desde base vacía |
| `pnpm run build` | Compilado, 23 páginas estáticas generadas |
| `pnpm deps:check` | Sin vulnerabilidades altas bloqueantes |

Las pruebas de integración **nunca se habían ejecutado**. Arrancaron con 18
fallos de 94.

## Lo Que Encontró La Integración

### Contaminación entre archivos de prueba (7 fallos)

Mis pruebas de módulos asumían que las once filas sembradas por la migración
sobrevivían a la suite. No sobreviven: seis archivos de integración hacen
`TRUNCATE TABLE … "InternalUser" CASCADE`, y PostgreSQL propaga a **toda tabla
que referencie** la truncada. `ModuleActivation.activatedById` apunta a
`InternalUser`, así que sus filas desaparecían antes de que el archivo corriera.

Corregido haciendo el archivo autosuficiente: prepara su propio estado base en
`beforeEach`. Que la migración siembre exactamente el catálogo se verifica ahora
sobre el archivo de migración, donde ninguna otra prueba puede borrarlo.

### Fechas fijas contra una regla nueva (9 fallos)

Desde el 2026-08-14 una Caja abierta de otro día se rechaza como
`session_stale_open`. Los fixtures de cinco archivos abrían sesiones con fechas
escritas a mano —`2026-07-30`— que envejecieron. Ahora se calculan contra el día
operativo en curso.

**La regla no tenía ninguna prueba propia**: se agregó el 2026-08-14 y rompió
cinco archivos de integración sin que nadie se enterara, porque no se corrían.

### Dos dependencias mías con el orden equivocado

Mis pruebas encendían `opiniones` sin encender antes `recepcion`. La regla de
dependencias duras las rechazó, con razón: el error estaba en el fixture.

### Un texto que cambió y la prueba no siguió

`"Realizar estudios pagados"` pasó a `"Realizar estudios/servicios pagados"`.

### Un defecto real: la compra urgente no puede alimentar el stock

El commit `fa15696` (2026-08-14) quitó `requiresInventoryEntry` de la entrada de
`createUrgentPurchaseExpense` y lo dejó fijo en `false`, al simplificar los
diálogos de egreso.

Pero `createPurchaseDraftRecord` **exige** ese campo en `true` para enlazar un
gasto urgente con una orden de compra. Con el valor fijo en falso, ese enlace
pasó a ser imposible: siempre responde `source-expense-invalid`.

Es la trazabilidad "compra urgente pagada por Caja → orden de compra → entrada de
stock" de la Tarea 20 del plan integral, rota desde hace once días.

Se restauró el campo como **opcional con valor falso por omisión**: el contrato
vuelve a ser satisfacible, los diálogos actuales no lo envían y su comportamiento
no cambia. **Queda una decisión para Dirección:** si la compra urgente debe poder
alimentar el stock, el diálogo tiene que volver a preguntarlo; si no, hay que
quitar el enlace y su prueba en lugar de dejarlo inalcanzable.

## Vulnerabilidades De Dependencias

Siete altas, todas transitivas. Cinco se resolvieron forzando versiones
parcheadas en `pnpm-workspace.yaml` —`undici`, `fast-uri`, `js-yaml`, `nanoid` y
`deepmerge-ts`— y se verificó con build, suite completa e integración que nada se
rompiera.

Las dos restantes son el mismo paquete, `image-size`, que llega por
`payload@3.86.0`: **no tienen corrección publicada**. El aviso pide `>=2.0.3` y
la última versión existente es `2.0.2`. Quedaron aceptadas de forma explícita en
`auditConfig.ignoreGhsas`, con la justificación escrita al lado: explotarlas
exige una cuenta con acceso al CMS que suba un archivo preparado, y no hay carga
pública de imágenes. Hay que revisarlas en cada actualización de Payload.

## `pnpm lint` Volvió A Ser Usable

El comando agotaba la memoria y no terminaba. La causa: ESLint 9 recorre los
directorios que empiezan con punto, y `.data/` —adjuntos clínicos y respaldos
locales— pesa 47 MB.

En CI el problema no aparecería, porque esa carpeta no existe ahí. Pero dejaba el
comando inservible para cualquiera que lo corriera en su máquina. Con `.data/`,
`.gstack/`, `.claude/` y `docker/` en los ignores, pasó de no terminar a 14,6
segundos.

## La Ejecución Remota

### El workflow ya estaba publicado, y llevaba semanas en rojo

El plan decía que faltaba publicarlo. Era incorrecto: al empujar aparecieron
ejecuciones anteriores del **9 y del 19 de agosto**, ambas fallidas. El CI existía
y estaba rojo desde hacía dos semanas sin que nadie lo mirara.

### Por qué fallaba

Primer intento sobre este trabajo (`32867862180`): `Quality`, `Build` y
`Dependency audit` en verde; `Unit tests` e `Integration tests` en rojo con

```
Failed to resolve import "@/generated/prisma/client" from src/modules/database/client.ts
```

El cliente de Prisma se genera en `src/generated/`, que está en `.gitignore`. En
un checkout limpio no existe, y ni `pnpm test` ni `pnpm test:integration` lo
generaban. Cualquier archivo que importe Prisma fallaba **al cargar**, no al
asertar: por eso 367 pruebas pasaban y 14 archivos ni se abrían.

`typecheck` y `build` sí lo generaban, y por eso esos dos jobs pasaban mientras
los de pruebas fallaban. La diferencia estaba a la vista en `package.json` desde
que se creó el workflow.

Se agregó `prisma generate` a los cuatro scripts de prueba. Verificado borrando
`src/generated/` por completo: 480 unitarias y 94 de integración en verde desde
cero.

### Primera ejecución verde

Ejecución `32868540365`, los cinco jobs:

| Job | Tiempo |
| --- | --- |
| Dependency audit | 31 s |
| Quality | 1 m 24 s |
| Integration tests and migrations | 2 m 55 s |
| Build | 1 m 30 s |
| Unit tests | 1 m 35 s |

## Protección De Ramas Aplicada

`staging` y `main` quedaron protegidas y verificadas:

- Los cinco checks son obligatorios, con `strict` activo: la rama debe estar al
  día antes de fusionar.
- **Cero aprobaciones requeridas.** Trabaja una sola persona y GitHub no permite
  aprobar el propio PR; exigir una aprobación habría bloqueado toda promoción sin
  que existiera nadie para desbloquearla.
- `enforce_admins` activo: sin eso, la única persona del repositorio es también
  quien puede saltarse el candado.
- Sin force-push ni borrado.
- Auto-merge habilitado en el repositorio, para que el PR se fusione solo cuando
  los checks terminen.

`develop` queda sin protección a propósito: es la rama de trabajo diario y el CI
corre igual en cada push.

## Para Informar

**El repositorio es público.** No hay fuga de datos —`.env`, `.data/` y los
adjuntos están fuera del control de versiones—, pero cualquiera puede leer la
matriz de permisos, la lógica de auditoría y los controles de seguridad del
sistema. Es una decisión de Dirección, no técnica; conviene revisarla antes de
que la clínica opere con datos reales.
