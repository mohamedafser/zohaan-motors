# Zohaan Motors

Foundation for the Zohaan Motors used-car dealership workspace.

## Phase status

- **Phase 2** — application shell, auth foundation, i18n, themes, PWA, route shells
- **Phase 3** — Supabase PostgreSQL schema, migrations, seed, storage buckets, typed database models
- **Phase 4** — authentication (no public signup, no MFA), RBAC, RLS, storage security

Security docs: [`docs/security.md`](docs/security.md) · [`docs/rbac-matrix.md`](docs/rbac-matrix.md) · [`docs/rls.md`](docs/rls.md)

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `NEXT_PUBLIC_SUPABASE_URL` and either `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. Do not put the Supabase service-role key in any frontend variable.

## Database (Phase 3)

Schema, migrations, and seed live under `supabase/`. Architecture notes: [`docs/database.md`](docs/database.md).

```bash
# Local (requires Docker + Supabase CLI)
npm run db:start
npm run db:reset
npm run db:types

# Remote linked project
npx supabase login
npx supabase link --project-ref <project-ref>
npm run db:push
# then seed + regenerate types
npx supabase db query -f supabase/seed.sql
npm run db:types:linked
```

Constraint and security smoke tests (transaction rolled back):

```bash
npm run db:test:constraints
npm run db:test:security
```

Apply Phase 4 migrations with `npm run db:reset` (local) or `npm run db:push` (linked).

## Bootstrap Super Admin (dev / first install)

Hidden route (not linked in nav):

```text
http://localhost:3003/setup/super-admin
```

Requires in `.env.local` (server-only):

```bash
SUPABASE_SERVICE_ROLE_KEY=...
BOOTSTRAP_SECRET=at-least-16-chars
```

Creates the **first** Super Admin only. After one exists, the form rejects further use. Remove or empty `BOOTSTRAP_SECRET` in production to return 404.

## Scripts

- `npm run dev` — local app
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript
- `npm run build` — production build
- `npm run db:*` — Supabase helpers (see package.json)

The UI is English by default. Arabic is available from the language control and switches the document to right-to-left. Currency is AED and dates use Asia/Dubai.
