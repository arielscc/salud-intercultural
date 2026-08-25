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

## Pendiente: La Mitad Remota

Lo que falta **no se puede hacer desde acá**:

1. Publicar el workflow en `origin` y observar una ejecución completa. Requiere
   empujar los commits.
2. Configurar la protección de ramas. `gh` no está instalado en este entorno.

Los comandos exactos quedaron escritos en
[el plan de GitHub Actions](../github-actions-implementation-plan.md), con los
nombres de contexto que corresponden a cada job. El audit de dependencias ya
puede exigirse como check obligatorio, cosa que ese plan condicionaba a resolver
las altas.

## Riesgo Conocido Del Primer Run Remoto

CI usa Node 22 y acá se corrió todo con Node 24. `package.json` declara
`>=22.0.0 <23`, así que el workflow está bien; la diferencia solo significa que
la versión exacta de CI no se probó localmente.
