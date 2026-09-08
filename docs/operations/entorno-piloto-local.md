# Entorno Piloto Local (Cochabamba)

Un segundo entorno local, independiente del de todos los días, para ensayar el
lanzamiento de **Cochabamba con solo Caja y Administración** encendidas.

Los dos entornos conviven. El de trabajo no se toca.

| | Entorno de trabajo | Piloto |
| --- | --- | --- |
| Archivo | `.env` | `.env.piloto` |
| Base | `salud_intercultural_dev` | `salud_intercultural_piloto` |
| Dirección | `http://localhost:3000` | `http://127.0.0.1:3001` |
| Compilación | `.next` | `.next-piloto` |
| Archivos clínicos | `.data/clinical-files` | `.data/clinical-files-piloto` |
| Sucursal activa | El Alto | Cochabamba |
| Módulos de Cochabamba | los once | núcleo + `administracion` |

## Por Qué Una Base Aparte Y No Solo Otra Sucursal

Cuando se creó este entorno, los módulos se encendían para todo el sistema:
apagar Recepción para probar Cochabamba la habría apagado también para El Alto.
**Eso ya no es así**: desde el 2026-08-29 el estado de cada módulo es propio de
cada sede, así que un piloto de Cochabamba con solo Caja se puede montar dentro
de la base de trabajo, abriendo Cochabamba y encendiéndole solo Administración.

La base aparte sigue teniendo sentido por otra razón: **aísla los datos**. El
piloto se llena de ventas, cobros y cierres de prueba que no ensucian el entorno
de trabajo, y se borra entero con un `DROP DATABASE`. Si lo que se quiere es
solo ver cómo se comporta una sede con pocos módulos, alcanza con la base de
siempre.

## Por Qué 127.0.0.1 Y No localhost

La cookie de sesión no distingue puertos: `localhost:3000` y `localhost:3001`
comparten `sigeco_session`. Con los dos entornos en `localhost`, entrar a uno
cierra la sesión del otro. `127.0.0.1` es otro host para el navegador y cada
entorno conserva la suya.

## Crear El Entorno Desde Cero

```bash
docker compose up -d postgres
docker exec salud-intercultural-postgres \
  psql -U salud_intercultural -d postgres \
  -c 'CREATE DATABASE salud_intercultural_piloto OWNER salud_intercultural;'

cp .env.piloto.example .env.piloto   # completar INTERNAL_ADMIN_PASSWORD

pnpm piloto:migrate                  # estructura y datos de las migraciones
pnpm piloto:seed                     # super administrador en Cochabamba

SIGECO_BRANCH=cochabamba SIGECO_BRANCH_OPEN=true  pnpm piloto:branch
SIGECO_BRANCH=el-alto    SIGECO_BRANCH_OPEN=false pnpm piloto:branch

SIGECO_BRANCH=cochabamba SIGECO_MODULE=administracion \
  SIGECO_MODULE_ACTIVE=true pnpm piloto:modules
```

Una base recién migrada trae **solo el núcleo encendido en cada sucursal** y
Cochabamba en preparación: ese ya es el punto de partida del piloto, no hay que
apagar nada. El estado de los módulos es por sede, así que encender
Administración en Cochabamba no toca a El Alto.

## Usarlo

```bash
pnpm piloto:dev     # http://127.0.0.1:3001/sigeco/login
pnpm cochabamba:dev # alias explícito: Cochabamba en 127.0.0.1:3001
```

Se puede dejar corriendo junto a `pnpm dev`. Cada uno usa su carpeta de
compilación, así que el candado de Next no los enfrenta.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `pnpm piloto:dev` | Servidor de desarrollo del piloto en el 3001 |
| `pnpm cochabamba:dev` | Servidor de Cochabamba, fijado a `127.0.0.1:3001` |
| `pnpm piloto:migrate` | Aplica migraciones a la base del piloto |
| `pnpm piloto:seed` | Crea o actualiza el super administrador |
| `pnpm piloto:branch` | Abre o cierra una sucursal |
| `pnpm piloto:modules` | Enciende o apaga un módulo |
| `pnpm piloto:load` | Carga datos maestros reales de la Etapa 1 |
| `pnpm piloto:check` | Revisa si Cochabamba está lista para la Etapa 1 |

Todos son los comandos de siempre con `DOTENV_CONFIG_PATH=.env.piloto`. Sin ese
prefijo apuntan al entorno de trabajo.

## Qué Se Puede Hacer Con Solo Administración

Encendida `administracion`, la cuenta puede **vender, cobrar, registrar egresos
y abrir y cerrar Caja**. Puede además **leer** el catálogo y el stock: los
permisos `inventory_read` y `service_catalog_read` los habilita también
Administración, porque sin ellos no se podría armar una venta.

Lo que **no** puede: dar de alta productos, crear ofertas del catálogo, cargar
proveedores ni registrar compras y recepciones. Esos permisos son de
`inventario`, `catalogo` y `compras`.

O sea: **con solo Administración se cobra, pero no hay nada que cobrar hasta
cargar los datos maestros.** Dos salidas:

1. `pnpm piloto:load`, que escribe productos, proveedores y catálogo desde
   `.data/datos-maestros-etapa-1.json` sin pasar por la interfaz. En ese archivo
   hay que poner `"sucursal": "cochabamba"`.
2. Encender `inventario` y `catalogo` mientras dura la carga y apagarlos
   después, con motivo.

La primera es la que corresponde a un lanzamiento de solo Caja: el personal de
Cochabamba nunca ve pantallas que no va a usar.

## Cargar Los Datos Maestros

```bash
cp docs/operations/plantillas/datos-maestros-etapa-1.example.json \
   .data/datos-maestros-etapa-1.json
# completar con datos reales y poner "sucursal": "cochabamba"

STAGE_ONE_RESPONSIBLE_EMAIL=<correo> \
STAGE_ONE_CONFIRM=salud_intercultural_piloto \
pnpm piloto:load
```

Precios, stock y proveedores **no se inventan**: un precio inventado se cobra y
un stock inventado descuadra la Caja. Ver
[datos maestros de la Etapa 1](./stage-one-master-data.md).

## Borrar El Entorno

```bash
docker exec salud-intercultural-postgres \
  psql -U salud_intercultural -d postgres \
  -c 'DROP DATABASE salud_intercultural_piloto;'
rm -rf .next-piloto .data/clinical-files-piloto .env.piloto
```

No toca `salud_intercultural_dev`.

## Límites Conocidos

- **Abrir una sucursal no queda en auditoría.** No existe acción de auditoría
  para sucursales, así que `pnpm branch:open` no deja rastro. Por eso el script
  se niega a correr fuera de local y test: la apertura real de Cochabamba en
  producción necesita antes su pantalla y su registro.
- **No hay pantalla para abrir una sucursal.** Hoy es solo este script.
- `pnpm db:reset` y `scripts/seed-demo-patient.ts` no aceptan la base del
  piloto: su lista de bases permitidas nombra `salud_intercultural_dev` y
  `_test`. Para rehacer el piloto se borra la base y se repiten los pasos de
  arriba.
- `pnpm stage-one:rehearse` sigue fijado a El Alto. El ensayo automático no
  corre contra Cochabamba.
