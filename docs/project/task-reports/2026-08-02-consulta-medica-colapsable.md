# Ajuste — Sección "Consulta médica" Colapsable

Fecha: 2026-08-02. Entorno modificado: código en `develop` (sin migración, sin
base). Pantalla afectada: `/sigeco/consultas/[visitId]` (Médico).

Aplica el modo de ejecución vigente: se implementó y se corrieron lint y
typecheck; QA de navegador (gstack), pruebas y build quedan pendientes para el
cierre acumulado.

## Motivo

La tarjeta "Consulta médica" tiene muchos campos y ocupa mucho espacio vertical.
Dirección pidió que sea colapsable para despejar la pantalla y ver con más
facilidad las demás secciones (propuesta, salida, órdenes, resultados).

## Resultado

- La tarjeta "Consulta médica" ahora es colapsable mediante un `<details>`
  nativo (sin JavaScript de cliente, funciona en móvil y escritorio).
- El encabezado es el `summary`: mantiene el título, la descripción y el **chip
  de estado** (Sin guardar / Borrador / Finalizada) visible aun cuando la
  sección está plegada, más un chevron que rota al abrir.
- Comportamiento por defecto: **siempre plegada**; el médico la abre
  manualmente cuando necesita registrar o revisar la consulta (decisión de
  Dirección del 2026-08-02).
- Se conserva todo el contenido y las subsecciones colapsables internas (receta
  rápida, evolución, corrección).

## Archivos

- `src/app/(internal)/sigeco/(app)/consultas/[visitId]/page.tsx`: la Card de
  "Consulta médica" pasa a `<details>`/`<summary>`; se importó `ChevronDown`.

No hay cambios de datos, permisos ni lógica de negocio; es solo presentación.

## Validación

- `pnpm lint`: aprobado.
- `pnpm typecheck`: aprobado.

## Pendientes (cierre acumulado)

- QA de navegador (gstack): abrir/plegar en borrador y finalizada, responsive en
  390/768/1024/1280/1440, foco de teclado sobre el `summary`.
- `pnpm test`, `pnpm run build` en el cierre acumulado.

## Commit Sugerido

`feat(sigeco): make clinical consultation section collapsible`
