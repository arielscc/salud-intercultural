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
pnpm test
pnpm typecheck
pnpm run build
```

## Promover A Staging

Cuando local este validado:

```bash
git checkout staging
git pull origin staging
git merge develop
git push origin staging
```

Despues revisar el deployment de staging en Vercel. Aunque Vercel lo muestre como Preview, internamente se trata como staging.

## Promover A Produccion

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
- Resolver conflictos localmente antes de hacer push.
- Si un cambio urgente se corrige en `main`, devolverlo despues a `staging` y `develop`.

## Variables Por Ambiente

- Local usa `.env`.
- Staging usa variables de Vercel en el ambiente Preview, aplicadas al deployment de la rama `staging`.
- Produccion usa variables de Vercel en Production, aplicadas a `main`.
