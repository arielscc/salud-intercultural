# Tarea 4: navegación e inicio según módulos activos

## Fecha

2026-08-24

## Objetivo

Que el personal solo vea lo que está lanzado. La Tarea 3 ya impedía el acceso,
pero el menú seguía ofreciendo módulos apagados y el inicio ejecutaba sus
consultas: el resultado era un enlace que rebotaba al inicio con un aviso.

Plan: [Lanzamiento por etapas](../sigeco-lanzamiento-por-etapas/tasks.md).

## Cambios Implementados

### Una sola regla para mostrar y para bloquear

`canUse(role, activeModules, permission, module?)` en
`src/features/modules/access.ts` repite exactamente la condición que aplica
`requirePermission` en el servidor: el rol tiene el permiso **y** el módulo está
lanzado, con el mismo `module` opcional para fijar la pertenencia. Es puro y apto
para cliente.

Que las dos capas usen la misma función es lo que evita el desfase entre lo que
el menú ofrece y lo que el servidor acepta.

### Menú

- Cada `SigecoNavItem` declara su módulo.
- `SidebarNav` (móvil) y `DesktopSidebarNav` (escritorio) reciben los módulos
  activos y filtran por permiso **y** módulo.
- El layout de `(app)` lee `getActiveModules()` una vez por request, en paralelo
  con el contexto de sucursal, y lo entrega al shell. Como la consulta está
  memoizada, las guardas de cada página reutilizan esa misma lectura.

### Inicio

Los cinco indicadores del dashboard pasaron de `roleHasPermission` a `canUse`, así
que un módulo apagado no ejecuta su consulta ni dibuja su tarjeta. `patients_read`
e `inventory_read` fijan `recepcion` e `inventario` porque sus enlaces viven en
esas pantallas.

El mensaje de la tarjeta vacía ahora distingue dos situaciones que antes se
confundían: **"Tu rol no tiene módulos asignados"** manda a pedir permisos, y eso
es un consejo equivocado cuando el problema es que la etapa todavía no se lanzó.
En ese caso ahora dice que los módulos aún no están disponibles.

### Enlaces cruzados

Recorrí el código buscando enlaces de un módulo hacia otro que pueda estar
apagado, descartando los que una dependencia dura garantiza (Consulta siempre
tiene Recepción; Compras siempre tiene Inventario). Aparecieron diez, en seis
archivos, y quedaron condicionados al módulo destino:

| Desde | Hacia | Enlace |
| --- | --- | --- |
| Ficha del paciente | Administración | Venta, en tarjeta móvil y tabla |
| Ficha del paciente | Seguimiento | Historial y "Registrar contacto" |
| Detalle de visita | Seguimiento | Responsable del seguimiento |
| Abandonos | Seguimiento | Responsable del seguimiento |
| Inventario, lotes y ficha del producto | Compras | Compra de origen |
| Catálogo | Inventario | Producto componente |

En todos los casos se oculta el **enlace**, no el dato: la ficha sigue mostrando
el monto de la venta o el nombre del responsable, porque esa información ya era
visible para ese rol y esconderla sería un cambio de alcance distinto.

La búsqueda de pacientes del encabezado también quedó condicionada a `recepcion`:
lleva a la ficha, que vive en ese módulo. Administración tendrá su propia
búsqueda para vender en la Tarea 8.

## Decisiones

### Se oculta el enlace, no la información

Un módulo apagado no cambia quién puede ver qué. La ficha del paciente ya mostraba
sus ventas a cualquiera con `patients_read`; seguir mostrándolas sin enlace
conserva el comportamiento y evita convertir esta tarea en una revisión de
permisos.

### El menú no adivina, declara

El módulo de cada entrada está escrito en `nav-items.ts` y una prueba verifica que
coincida con el que fija su página. Derivarlo del `href` habría funcionado hasta
la primera ruta que no siguiera el patrón —`/sigeco/atribucion` pertenece a
Reportes, por ejemplo—.

## Validación

- `pnpm typecheck`: sin errores.
- `npx eslint src scripts --max-warnings=0`: sin errores.
- Pruebas unitarias: 442 en total, 437 aprobadas. Doce nuevas:
  - `SidebarNav.test.tsx` verifica el criterio de aceptación tal cual: en la
    Etapa 1 el menú muestra Inicio, Caja, Catálogo, Inventario, Compras y las
    entradas del núcleo, y ninguna clínica. También comprueba que el permiso del
    rol sigue mandando y que el núcleo sobrevive sin ningún módulo lanzado.
  - `access.test.ts` cubre `canUse`, incluido el caso de Administración leyendo
    fichas sin Recepción y el del módulo fijado.
  - `module-gate.test.ts` suma que cada entrada del menú declare un módulo del
    catálogo y que coincida con el que fija su página. Verifiqué que falla de
    verdad cambiando un módulo a propósito.
- Se ajustó `scripts/privacy-controls.test.ts`: comprobaba el texto literal del
  control de la búsqueda de pacientes en el shell, que ahora usa `canUse`. El
  control no se debilitó, se reforzó con el módulo.

### Fallos previos que no son de esta tarea

Siguen los cinco de siempre, ya presentes en `HEAD` antes de este plan:
`paid-study.schema` (2), `audit-coverage`, `privacy-controls` (redirecciones con
datos en la URL) y el mapa de acciones de `security-boundaries`.

## Pendientes

- QA de navegador con módulos apagados, en 390, 768, 1024, 1280 y 1440 px:
  cierre acumulado (Tarea 12).
- La detección de enlaces cruzados fue una revisión manual sobre `href` literales.
  Un enlace construido desde una variable no aparecería; conviene repasarlo en el
  QA de la Tarea 12 con la Etapa 1 encendida y el resto apagado.
- La pantalla para encender y apagar módulos sigue siendo la Tarea 5; hoy se
  hace con `pnpm modules:set`.
