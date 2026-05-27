# Database Module

Shared database access layer for operational data in the V2 modular monolith.

Payload is the source of truth for editable public content, CMS globals, media,
admin-managed pages, and lead submissions. Do not add Prisma queries here for CMS
content that is already owned by Payload.

## Responsibilities

- Expose a Prisma singleton through `src/modules/database/client.ts` for current
  maintenance scripts and future operational domains.
- Keep database queries out of React components.
- Group operational reads and writes by domain under `src/modules/database/queries`.
- Wrap database failures with `DatabaseError`.
- Provide pagination and ordering helpers.

## Ownership Boundaries

- Public pages, services, team members, testimonials, FAQs, site settings, media,
  and simple leads are owned by Payload.
- Static fallback content lives in `src/data` and should not become an editable
  source of truth.
- Prisma is reserved for future transactional domains such as appointments,
  payments, inventory, audit events, reports, and integrations.
- If public UI needs CMS content, read through `src/lib/cms/public-content.ts`
  rather than adding Prisma query helpers.

## Environment

Create a local `.env` file with:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=verify-full"
```

For Neon on Vercel/serverless, prefer the pooled connection string.

## Commands

```bash
pnpm db:migrate
pnpm db:generate
pnpm db:studio
```

`pnpm seed` loads the canonical Payload seed. Prisma does not currently have an
operational seed because the legacy editorial models were removed.

`src/generated/prisma` is generated. Run `pnpm db:generate` after schema changes
or after installing the project.
