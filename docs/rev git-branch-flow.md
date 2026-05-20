# Flujo De Ramas

El proyecto usara tres niveles:

```txt
develop local -> staging -> main produccion
```

## Objetivo De Cada Rama

| Rama | Objetivo | Deploy |
| --- | --- | --- |
| `develop` | Trabajo local diario, cambios en progreso y validacion antes de publicar. | No necesita deploy automatico. |
| `staging` | Revision publicada antes de produccion. | Vercel Preview Deployment. |
| `main` | Produccion. Solo recibe cambios aprobados desde staging. | Vercel Production. |

## Preparacion Inicial

Actualmente existe `main` y `staging`. Falta crear `develop`.

Cuando no tengas cambios pendientes sin commit, crea `develop` desde `staging`:

```bash
git checkout staging
git pull origin staging
git checkout -b develop
git push -u origin develop
```

Si prefieres que `develop` no exista en remoto, omite el ultimo comando. La recomendacion es subirla para tener respaldo.

## Trabajo Diario

Trabaja siempre en `develop`:

```bash
git checkout develop
pnpm dev
```

Antes de promover a staging:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Promover A Staging

Cuando local este bien:

```bash
git checkout staging
git pull origin staging
git merge develop
git push origin staging
```

Despues revisa el deployment de staging en Vercel. Aunque Vercel lo muestre como Preview, internamente lo tratamos como staging.

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
