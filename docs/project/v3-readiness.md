# V3 Readiness

Documento de preparacion para iniciar Version 3 sin arrastrar ambiguedades de V2.

## Estado De Partida

V2 queda como baseline estable documentado en:

- [Estado de implementacion V2](./v2-implementation-status.md)
- [Arquitectura V2](../architecture/v2-architecture.md)
- [Sistema visual publico](../design/public-visual-system.md)
- [Operaciones](../operations/README.md)

Antes de iniciar V3, usar esos documentos como fuente de verdad. No recrear guias historicas ni duplicar checklists.

## Criterios Para Iniciar V3

1. Confirmar que `main` representa produccion estable.
2. Confirmar que `staging` funciona como ambiente de revision.
3. Confirmar que `develop` se usara para integrar trabajo diario.
4. Ejecutar validacion base antes de abrir ramas grandes:

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm run build
```

5. Confirmar que `.env.example` refleja las variables reales necesarias.
6. Confirmar que `docs/operations/external-platforms.md` refleja dominio, hosting, base de datos, media y analytics vigentes.
7. Confirmar que no hay documentos sueltos fuera de los directorios canonicos de `docs`.

## Areas Candidatas Para V3

Estas mejoras vienen del backlog V2.1 y deben convertirse en alcance V3 solo si aportan valor claro:

1. Paginas individuales de servicios: `/servicios/[slug]`.
2. Paginas individuales de tratamientos: `/tratamientos/[slug]`.
3. Navbar con menus desplegables por subsecciones.
4. Blog o articulos.
5. Landing pages por enfermedad o condicion.
6. Automatizaciones por email.
7. Integracion CRM.
8. Reportes avanzados para leads.
9. Roles y permisos granulares.
10. Auditoria de cambios en CMS.
11. Notificaciones internas.
12. Integracion con calendario.

## Decisiones Que Deben Tomarse Antes De Implementar

1. Mantener monolito modular o justificar monorepo.
2. Mantener Vercel o ejecutar prueba controlada en otro hosting.
3. Definir si las nuevas rutas individuales seran CMS-first, fallback-first o mixtas.
4. Definir si V3 requiere cambios de modelo Prisma o solo nuevas collections en Payload.
5. Definir estrategia de migraciones y seeds para staging antes de tocar produccion.
6. Definir medicion de conversion para nuevas paginas antes de publicarlas.

## Reglas Para Documentar V3

1. Actualizar documentos existentes antes de crear nuevos.
2. Mantener arquitectura en `docs/architecture`.
3. Mantener UI y experiencia en `docs/design`.
4. Mantener procedimientos en `docs/operations`.
5. Mantener roadmap, estado y decisiones de version en `docs/project`.
6. Registrar solo decisiones vigentes y pendientes accionables; no crear diarios extensos de cambios.

## Checklist De Cierre Para Cada Entrega V3

1. Codigo implementado y revisado contra la arquitectura vigente.
2. Documentacion actualizada en el directorio correcto.
3. Variables nuevas agregadas a `.env.example` y `docs/operations/environment-variables.md`.
4. Scripts o migraciones nuevos documentados en operaciones.
5. Eventos analytics nuevos documentados en `docs/operations/analytics.md`.
6. `pnpm lint`, `pnpm test`, `pnpm typecheck` y `pnpm run build` ejecutados cuando aplique.
7. Backlog actualizado en [estado de implementacion V2](./v2-implementation-status.md) o en el documento V3 que lo reemplace cuando exista.
