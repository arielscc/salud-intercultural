# Plan De Implementacion De GitHub Actions

Plan posterior al cierre de las 10 tareas de simplificacion V3.7. Su objetivo es convertir las validaciones locales actuales en controles automaticos y obligatorios antes de promover cambios a `staging` y `main`.

Estado al 2026-07-28: `.github/workflows/ci.yml` esta implementado localmente como parte de la Tarea 1 de mejoras integrales. Falta publicarlo, observar una ejecucion remota completa y configurar las reglas de proteccion; hasta entonces la Tarea 1 permanece en progreso.

## Objetivos

1. Ejecutar lint, typecheck, pruebas unitarias, pruebas de integracion y build en GitHub.
2. Evitar que `staging` o `main` reciban cambios que no pasen los controles tecnicos.
3. Usar una base PostgreSQL efimera y aislada para las pruebas de integracion.
4. Mantener secretos de staging y produccion fuera de los workflows de validacion.
5. Separar validacion de codigo, migraciones y despliegue para que un PR no pueda modificar datos remotos.

## Workflows Propuestos

### 1. CI De Pull Requests

Archivo implementado: `.github/workflows/ci.yml`.

Triggers:

- `pull_request` hacia `develop`, `staging` y `main`.
- `push` a `develop` para validar integraciones directas mientras se adopta el flujo por PR.
- `workflow_dispatch` para repeticion manual.

Permisos del token:

```yaml
permissions:
  contents: read
```

Jobs:

| Job | Comandos | Dependencias |
| --- | --- | --- |
| `quality` | `pnpm lint`, `pnpm typecheck` | Node.js 22, pnpm fijado por `packageManager` |
| `unit-tests` | `pnpm test` | Node.js 22 |
| `integration-tests` | `pnpm test:integration` | PostgreSQL 16 como service container |
| `build` | `pnpm run build` | Variables no secretas y `CMS_READS_DURING_BUILD=false` |
| `dependency-audit` | `pnpm peers check`, `pnpm audit:prod`, `pnpm audit:high` | Acceso al registry; bloquea altas/criticas salvo una excepcion de desarrollo documentada |

Los jobs pueden ejecutarse en paralelo. `build` no debe compartir `.next` con otro job y cada job debe partir de un checkout limpio.

### 2. Verificacion De Migraciones

Puede formar parte de `integration-tests` al inicio. Si crece, moverlo a `.github/workflows/migrations.yml`.

Debe:

1. Levantar PostgreSQL 16 vacio.
2. Usar exclusivamente `salud_intercultural_test`.
3. Ejecutar todas las migraciones desde cero.
4. Ejecutar la suite de integracion.
5. Fallar si Prisma detecta una migracion invalida o no reproducible.

Nunca debe conectarse a Neon, Vercel, staging o produccion.

### 3. Controles De Promocion

GitHub Actions valida el cambio; Vercel conserva el despliegue.

- PR `develop -> staging`: requiere todos los checks obligatorios y QA funcional registrado.
- PR `staging -> main`: requiere los mismos checks, aprobacion humana y validacion del Preview Deployment.
- Las migraciones remotas se ejecutan como una operacion separada y controlada. No se ejecutan automaticamente desde PRs de forks ni desde el job general de CI.

## Configuracion Tecnica

Usar:

- `actions/checkout` con una version mayor fijada y mantenida.
- `pnpm/action-setup@v6` leyendo `pnpm@11.17.0` del proyecto.
- `actions/checkout@v6` y `actions/setup-node@v6`.
- `actions/setup-node` con Node.js 22 y cache de pnpm.
- `pnpm install --frozen-lockfile`.
- Timeouts explicitos por job.
- `concurrency` para cancelar ejecuciones anteriores del mismo PR.

Variables seguras para CI:

```env
NODE_ENV=test
DATABASE_URL=postgresql://salud_intercultural:salud_intercultural@localhost:5432/salud_intercultural_test?schema=public
PAYLOAD_DB_SCHEMA=payload_test
PAYLOAD_SECRET=ci-only-non-production-secret
CMS_READS_DURING_BUILD=false
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=Salud Intercultural
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_META_PIXEL_ID=
```

No copiar valores de `.env`, staging o produccion a GitHub Actions. Si un job futuro necesita un servicio externo, usar GitHub Environments y aprobacion obligatoria.

## Proteccion De Ramas

Despues de que el workflow sea estable:

1. Proteger `staging` y `main` contra push directo.
2. Exigir PR y checks `quality`, `unit-tests`, `integration-tests` y `build`.
3. Exigir al menos una aprobacion para `main`.
4. Invalidar aprobaciones cuando cambie el contenido del PR.
5. Restringir force-push y eliminacion de ramas protegidas.

El audit de dependencias **ya puede exigirse**: el 2026-08-25 se resolvieron
cinco de las siete vulnerabilidades altas forzando versiones parcheadas en
`pnpm-workspace.yaml`, y las dos restantes de `image-size` quedaron aceptadas de
forma explicita en `auditConfig.ignoreGhsas` porque no tienen correccion
publicada.

## Repositorio De Una Sola Persona

Hoy trabaja una sola persona en el repositorio. Eso cambia una decision
importante: **no se puede exigir aprobacion en el Pull Request**. GitHub no
permite que el autor apruebe su propio PR, asi que
`required_approving_review_count: 1` bloquearia toda promocion sin que exista
nadie que pueda desbloquearla.

Lo que si aporta el PR con una sola persona no es la revision, es **el candado**:
GitHub no deja fusionar mientras el CI este en rojo. Ese es el valor.

Combinado con **auto-merge**, la ceremonia desaparece: se abre el PR, se activa
auto-merge y GitHub fusiona solo cuando los cinco checks terminan en verde.

## Comandos Concretos

Con `gh` autenticado sobre `arielscc/salud-intercultural`:

```bash
for BRANCH in staging main; do
  gh api -X PUT "repos/arielscc/salud-intercultural/branches/$BRANCH/protection" \
    --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Quality", "Unit tests", "Integration tests and migrations", "Build", "Dependency audit"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
done

# Auto-merge, para que la promocion no exija esperar mirando la pantalla.
gh api -X PATCH repos/arielscc/salud-intercultural \
  -f allow_auto_merge=true -f delete_branch_on_merge=false
```

`enforce_admins: true` es deliberado: sin eso, la unica persona del repositorio
es tambien quien puede saltarse la proteccion, y el candado no protege de nada.
Para una emergencia se desactiva un momento y se vuelve a activar; queda
registrado en el historial del repositorio.

`develop` queda **sin proteccion**: es la rama de trabajo diario y el CI corre
igual en cada push, avisando sin frenar.

Los nombres de los contextos son los `name:` de cada job en `ci.yml`; si se
renombra un job hay que actualizar la proteccion o el check quedara pendiente
para siempre.

## Como Se Promueve

```bash
# develop -> staging
gh pr create --base staging --head develop --title "Promover a staging" --body ""
gh pr merge --auto --merge

# staging -> main
gh pr create --base main --head staging --title "Promover a produccion" --body ""
gh pr merge --auto --merge
```

## Vercel No Mira El CI Por Su Cuenta

Vercel publica en cuanto la rama cambia; no consulta el resultado de GitHub
Actions. Se puede resolver de tres formas, y la mas simple es la que ya queda
puesta con lo anterior:

1. **Proteger la rama** (recomendado). Si a `main` solo se llega por PR con los
   cinco checks obligatorios, todo lo que aterriza ahi **ya paso el CI**. Vercel
   puede publicar de inmediato porque no existe un commit rojo en `main`. No hace
   falta configurar nada en Vercel.
2. **Ignored Build Step**: un comando en Vercel que consulta el estado de los
   checks del commit y cancela la construccion si estan en rojo. Agrega un token
   y una dependencia mas.
3. **Desplegar desde el workflow** con `vercel deploy --prod` despues del CI.
   Da el control mas fino y obliga a guardar `VERCEL_TOKEN` como secreto.

Con la opcion 1, `staging` tambien queda cubierta porque se promueve igual.

## Orden De Implementacion

1. [Completado] Cerrar y documentar V3.7.
2. [Completado local] Corregir el build y establecer baseline reproducible.
3. [Completado con excepcion documentada] Eliminar altas de produccion y bloquear nuevas vulnerabilidades altas/criticas.
4. [Completado local] Crear `ci.yml` con quality, unit tests y build.
5. [Completado local] Agregar PostgreSQL e integration tests.
6. [Pendiente remoto] Probar el workflow en una rama y medir tiempos.
7. [Pendiente remoto] Activar checks obligatorios en `staging`.
8. [Pendiente remoto] Activar proteccion de `main` despues de una promocion exitosa completa.
9. [Completado local] Actualizar `testing.md`, `branch-flow.md` y `deploy.md`.

## Criterios De Aceptacion

- Un PR con error de lint, tipos, pruebas, migracion o build no puede promoverse.
- La suite de integracion usa una base efimera y nunca datos remotos.
- Un PR valido desde checkout limpio pasa sin intervencion manual.
- Los workflows tienen permisos minimos y no imprimen secretos.
- `staging` y `main` tienen reglas de proteccion verificadas.
- La documentacion operativa coincide con los workflows realmente instalados.
