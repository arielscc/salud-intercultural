# 2026-08-29 — Entorno Piloto Local De Cochabamba

## Objetivo

Tener un segundo entorno local para ensayar el lanzamiento de **Cochabamba con
solo Caja y Administración**, sin borrar ni alterar el entorno de trabajo
(`test@test.si`, El Alto, los once módulos encendidos).

## Origen

Pedido de Dirección: lanzar primero en Cochabamba y solo con Caja y
Administración, y probarlo antes en local.

## Hallazgo Que Decidió El Diseño

**Los módulos se encienden para todo el sistema, no por sucursal.**
`ModuleActivation` tiene el código del módulo como clave primaria y no guarda
sucursal (`prisma/schema.prisma`). No existe "Cochabamba con Caja mientras El
Alto conserva Recepción": apagar un módulo lo apaga para todos.

De ahí que el piloto sea **otra base de datos** y no otra sucursal dentro de la
misma. Es también la única forma de cumplir el "sin borrar el actual".

Segundo hallazgo, de la misma revisión: una sede en `preparation` **no opera**.
`getBranchContext` solo deja elegir sucursales `active` y asignadas, así que
Caja, ventas y stock quedan fuera de alcance hasta abrirla. Y no había ninguna
forma de abrirla: ni pantalla, ni script, ni acción auditada. Solo SQL a mano.

## Qué Se Construyó

| Pieza | Detalle |
| --- | --- |
| Base | `salud_intercultural_piloto`, en el mismo PostgreSQL de Docker |
| Entorno | `.env.piloto` (ignorado) y `.env.piloto.example` (versionado) |
| Dirección | `http://127.0.0.1:3001` |
| Compilación | `.next-piloto` |
| Comandos | `pnpm piloto:dev`, `:migrate`, `:seed`, `:branch`, `:modules`, `:load`, `:check` |
| Guía | [entorno piloto local](../../operations/entorno-piloto-local.md) |

Estado sembrado: Cochabamba abierta y predeterminada, El Alto en preparación,
`core` y `administracion` encendidos, sin datos de demostración.

## Cambios En Código

- **`scripts/open-branch.ts`** (nuevo). Abre o cierra una sucursal. Se niega a
  correr fuera de local y test, porque el cambio **no queda en auditoría**: no
  existe acción de auditoría para sucursales. Al reabrir conserva la `openedAt`
  original.
- **`scripts/run-with-env.ts`** (nuevo). Corre un comando con otro archivo de
  entorno. Existe por `next dev`, que solo lee `.env` y `.env.local` y no
  acepta `DOTENV_CONFIG_PATH`; sin esto no había forma de levantar un segundo
  entorno sin sobrescribir el `.env` de trabajo.
- **`scripts/seed-internal-user.ts`**. Acepta `INTERNAL_ADMIN_BRANCH`; sigue
  siendo `el-alto` por omisión. Antes el administrador nacía siempre asignado a
  El Alto, que es justo la sede que no se quería tocar. Valida que la sucursal
  exista.
- **`scripts/check-stage-one-readiness.ts`**. Acepta `STAGE_ONE_BRANCH`; sigue
  siendo `el-alto` por omisión. Con el código fijo la revisión daba por buena a
  El Alto y nunca miraba la sede que se iba a lanzar.
- **`next.config.mjs`**. `distDir` sale de `NEXT_DIST_DIR`, con `.next` por
  omisión. Next 16 toma el candado del servidor de desarrollo dentro de esa
  carpeta, y con la misma el segundo entorno aborta con *"Another next dev
  server is already running"*.
- **`eslint.config.mjs`**. Ignora `.next-*/`; sin eso `pnpm lint` levantaba 276
  errores de la compilación del piloto.
- **`.gitignore`**. Ignora `.next-*/` y deja de ignorar `.env*.example`, para
  que la plantilla del piloto se pueda versionar como las otras tres.

## Qué Permite Realmente "Solo Administración"

Se puede vender, cobrar, registrar egresos y abrir y cerrar Caja. Se puede
además **leer** catálogo y stock: `inventory_read` y `service_catalog_read` los
habilita también `administracion` (`src/features/modules/permission-modules.ts`),
porque sin ellos no se podría armar una venta.

No se puede dar de alta productos, crear ofertas, cargar proveedores ni
registrar compras y recepciones.

**Consecuencia práctica: con solo Administración se cobra, pero no hay nada que
cobrar hasta cargar los datos maestros.** La vía que corresponde a un
lanzamiento de solo Caja es `pnpm piloto:load`, que escribe sin pasar por la
interfaz. La alternativa es encender `inventario` y `catalogo` mientras dura la
carga y apagarlos después, con motivo.

## Validación

| Comprobación | Resultado |
| --- | --- |
| `pnpm piloto:migrate` sobre base nueva | todas las migraciones aplicadas |
| Estado de arranque | solo `core` activo, Cochabamba en `preparation` |
| `pnpm piloto:seed` | super administrador creado en `cochabamba` |
| `pnpm piloto:branch` | Cochabamba `active`; El Alto de vuelta a `preparation` |
| Los dos servidores a la vez | 3000 y 3001 responden 200 en `/sigeco/login` |
| Cabecera del piloto | «Sucursal activa Cochabamba», «El Alto: en preparación» |
| Navegación del piloto | Administración + núcleo. Sin Recepción, Inventario, Compras, Catálogo, Consulta |
| `/sigeco/recepcion` en el piloto | rebota al inicio |
| `pnpm piloto:check` | corre contra Cochabamba y lista 4 faltantes reales |
| `pnpm lint` / `pnpm typecheck` | limpios |

La verificación por HTTP usó una sesión temporal en la base del piloto,
**borrada al terminar** (`select count(*) from "InternalSession"` → 0).

## Lo Que Se Vio Y No Se Tocó

- **Abrir una sucursal no deja rastro en auditoría.** No hay valor en el enum de
  acciones para sucursales; agregarlo pide migración y es parte del lanzamiento
  en producción, congelado en `tasks-produccion.md`. Por eso el script se limita
  a local y test.
- **No hay pantalla para abrir una sucursal.** Sigue siendo solo el script.
- **`pnpm stage-one:rehearse` sigue fijado a El Alto.** El ensayo automático no
  corre contra Cochabamba.
- **`pnpm db:reset` no acepta la base del piloto.** Su lista de bases permitidas
  nombra `_dev` y `_test`. Se dejó como está: la guarda es deliberada y el
  piloto se rehace borrando la base.

## Pendientes

1. Cargar los datos maestros reales de Cochabamba en `.data/` y correr
   `pnpm piloto:load`. **No se inventaron precios, stock ni proveedores.**
2. Recorrer el día operativo completo de Caja en el piloto, por navegador.
3. Decidir si el lanzamiento real de Cochabamba necesita antes la pantalla de
   apertura de sucursal y su acción de auditoría.
