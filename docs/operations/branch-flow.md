# Flujo De Ramas

Guia operativa para mover cambios entre desarrollo local, staging y produccion.

## Resumen

```txt
develop local -> staging -> main produccion
```

## Objetivo De Cada Rama

| Rama | Objetivo | Deploy |
| --- | --- | --- |
| `develop` | Trabajo local diario, cambios en progreso y validacion antes de publicar. | No necesita deploy automatico. |
| `staging` | Revision publicada antes de produccion. | Vercel Preview Deployment. |
| `main` | Produccion. Solo recibe cambios aprobados desde staging. | Vercel Production. |

## Trabajo Diario

Trabajar normalmente en `develop`:

```bash
git checkout develop
pnpm dev
```

Antes de promover a staging:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm run build
```

El workflow [CI](../../.github/workflows/ci.yml) ejecuta estos controles en PRs hacia `develop`, `staging` y `main`, y en pushes a `develop`. Hasta publicarlo y configurar reglas de proteccion en GitHub, los controles tambien deben ejecutarse localmente y registrarse en el reporte.

## Promover A Staging

Requisito previo: los jobs `Quality`, `Unit tests`, `Integration tests and migrations`, `Build` y `Dependency audit` deben estar en verde.

Cuando local este validado:

```bash
git checkout staging
git pull origin staging
git merge develop
git push origin staging
```

Despues revisar el deployment de staging en Vercel. Aunque Vercel lo muestre como Preview, internamente se trata como staging. Para V3.7 ejecutar tambien la [prueba completa de Sigeco](./sigeco-v3-full-flow-testing.md).

## Promover A Produccion

Requisito previo: los mismos checks deben estar en verde y la aprobacion humana requerida por la proteccion de `main` debe estar registrada.

Cuando staging este aprobado:

```bash
git checkout main
git pull origin main
git merge staging
git push origin main
```

Ese push a `main` despliega produccion.

## Reglas Practicas

- No trabajar directo en `main`.
- No hacer reset destructivo de `main` ni `staging`.
- No ejecutar seeds destructivos contra produccion.
- No ejecutar tests de integracion contra staging o produccion.
- Aplicar migraciones remotas con backup y verificacion del ambiente.
- Resolver conflictos localmente antes de hacer push.
- Si un cambio urgente se corrige en `main`, devolverlo despues a `staging` y `develop`.

## Variables Por Ambiente

- Local usa `.env`.
- Staging usa variables de Vercel en el ambiente Preview, aplicadas al deployment de la rama `staging`.
- Produccion usa variables de Vercel en Production, aplicadas a `main`.
