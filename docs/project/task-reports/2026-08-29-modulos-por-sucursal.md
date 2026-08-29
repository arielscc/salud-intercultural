# 2026-08-29 — Activación De Módulos Por Sucursal

## Objetivo

Que el estado de cada módulo sea propio de cada sede. Apagar la Caja de
Cochabamba por un incidente no debe dejar sin cobrar a El Alto.

## Origen

Pregunta de Dirección durante la preparación del piloto de Cochabamba:

> «¿los módulos no deberían ser independientes por sucursal? Si yo apago la caja
> de cbba y el alto está activo, no debería pasar nada en el alto, pero debería
> apagarse en cochabamba.»

Antes de esto `ModuleActivation` tenía el código del módulo como clave primaria
y no guardaba sucursal: un apagado valía para todo el sistema.

## Corrección De Una Estimación

En la conversación previa se dijo que el cambio era caro porque la sucursal
activa se resolvía *después* del estado de los módulos, y habría que desenredar
esa dependencia. **Era falso.** `getBranchContext` solo lee las asignaciones del
usuario y el estado de la sede; no consulta módulos. La sucursal se resuelve
antes, sin ciclo.

Eso cambió el alcance: las ~35 pantallas y guardas que preguntan qué está
encendido **no se tocaron**. Todas llaman a `getModuleAccessState()` sin
argumentos, y la sede se resolvió por dentro.

## Cambios

### Datos

`ModuleActivation` pasa de clave `code` a clave compuesta `(code, branchCode)`,
con referencia a `ClinicBranch`. `ModuleActivationEvent` gana `branchCode`.

La migración **no cambia el comportamiento el día que corre**: el estado vigente
se copia tal cual a cada sucursal existente. Falla en voz alta si no hay ninguna
sucursal, en lugar de dejar el sistema sin nada encendido.

El historial **no se reescribe**. Los eventos anteriores quedan con la sucursal
en nulo, que significa «cuando el cambio valía para todo el sistema». La tabla
es append-only precisamente para que nadie corrija el pasado, y atribuir esos
eventos a una sede sería inventar dónde ocurrieron. Se muestran en el historial
de todas las sedes, porque son el pasado común de todas.

### Lectura

`getModuleAccessStateForBranch(branchCode)` es la consulta explícita, memoizada
por request y por sede.

`getModuleAccessState()` —la firma que ya usaban las pantallas— resuelve la
sucursal activa y delega. **Se mudó a `src/features/modules/request-state.ts`.**
Resolver la sede necesita cookies y sesión, y dejarlo en `queries/modules.ts`
metía `server-only` en un archivo que también importan los scripts de línea de
comandos, donde no hay request que resolver.

Sin sucursal resuelta devuelve solo el núcleo. Es el lado seguro: sin saber en
qué sede se está no se sabe qué está lanzado, y suponerlo abriría pantallas.

### Escritura

`setModuleActivation` recibe la sucursal. Las dependencias duras se evalúan
dentro de la sede: Inventario encendido en El Alto no habilita Compras en
Cochabamba.

`setModuleActivationAction` resuelve la sucursal **en el servidor** y no la lee
del formulario. Un campo oculto lo podría reescribir cualquiera desde el
navegador, y encender un módulo en la sede equivocada es justo lo que no debe
poder pasar.

### Pantalla

`/sigeco/modulos` administra la sucursal activa, lo dice en el encabezado y
avisa que el cambio no toca a las demás. Para administrar otra sede se cambia de
sucursal en la cabecera, como en el resto del sistema.

### Trabajo pendiente de un módulo suspendido

`getModulePendingWork` se acota a la sede. A Cochabamba no le sirve saber
cuántas visitas dejó abiertas El Alto. Lo que está a dos relaciones de distancia
se acotó igual —los casos de opiniones, por `feedback → visit → branchCode`—.
La única cuenta que sigue siendo del sistema entero es la alerta de stock:
`InventoryAlert` no guarda sucursal porque la alerta es del producto.

## La Línea Que Importa

La sucursal activa viene de una **cookie**. Desde este cambio esa cookie decide
además qué módulos están encendidos, así que pasa a ser parte de la barrera.

La regla es que la cookie solo puede **elegir** entre las sedes asignadas al
usuario y abiertas, nunca agregar una. Ya era así en `resolveBranchContext`;
ahora está fijado por pruebas propias, y se comprobó que fallan: quitar el
filtro de asignación pone una en rojo con
`expected 'cochabamba' to be 'el-alto'`.

## Validación

| Comprobación | Resultado |
| --- | --- |
| Migración sobre base limpia | 11 módulos × 2 sucursales, núcleo activo en cada una |
| `prisma migrate diff` contra el esquema | «No difference detected» |
| Migración sobre las bases de trabajo y del piloto | estado copiado sin cambios de comportamiento |
| Pruebas unitarias | 485 en verde |
| Integración de módulos | 31 en verde, incluidas 5 nuevas de independencia entre sedes |
| Prueba de la cookie | 5 en verde, y se probó que sabe fallar |
| `pnpm lint` / `pnpm typecheck` | limpios |

**Prueba de extremo a extremo, misma sesión y mismo despliegue**, con
Administración encendida en Cochabamba y apagada en El Alto:

| Cookie de sucursal | Aviso de suspensión | `/administracion/ventas/nueva` |
| --- | --- | --- |
| `cochabamba` | ninguno | formulario presente |
| `el-alto` | «suspendido: Caja y Administración… solo lectura» | sin formulario |

Las sesiones y asignaciones temporales de esa prueba quedaron **borradas**
(`InternalSession` → 0 filas).

## Lo Que Se Vio Y No Se Tocó

- **`InventoryAlert` no tiene sucursal.** La alerta es del producto. Su cuenta
  sigue siendo del sistema entero, y se dejó documentado en el código antes que
  atribuirla a una sede que no le corresponde.
- **`scripts/rehearse-stage-one.ts` sigue fijado a El Alto.** Ahora pasa la sede
  a cada llamada, pero el ensayo no corre contra Cochabamba.
- **Abrir una sucursal sigue sin auditoría ni pantalla.** Es el pendiente que ya
  quedó anotado el mismo día en el reporte del entorno piloto.

## Cambio De Infraestructura De Pruebas

`server-only` no es un paquete instalado: lo resuelve el empaquetador de Next.
Al entrar en la cadena de importaciones de las guardas, tres suites dejaron de
resolver el import. Se agregó un sustituto vacío en `tests/stubs/server-only.ts`
y su alias en `vitest.config.ts`. No debilita nada: la guarda que cuenta la
sigue aplicando `next build`.

## Pendientes

1. Decidir qué módulos arranca cada sede en el lanzamiento real.
2. El ensayo automático de la Etapa 1 contra una sede distinta de El Alto.
