# Database Module

Shared database access layer for the V2 modular monolith.

## Responsibilities

- Expose a Prisma singleton through `src/modules/database/client.ts`.
- Keep Prisma queries out of React components.
- Group database reads and writes by domain under `src/modules/database/queries`.
- Wrap database failures with `DatabaseError`.
- Provide pagination and ordering helpers.

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
pnpm db:seed
pnpm db:studio
```

`src/generated/prisma` is generated and ignored by git. Run `pnpm db:generate`
after schema changes or after installing the project.
