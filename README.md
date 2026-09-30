# Zohaan Motors

Foundation for the Zohaan Motors used-car dealership workspace. This phase covers the application shell, authentication, design system, English/Arabic with RTL, and placeholder routes. Business modules and the database come later.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`. Do not put the Supabase service-role key in any frontend variable.

## Scripts

- `npm run dev` — local app
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript
- `npm run build` — production build

The UI is English by default. Arabic is available from the language control and switches the document to right-to-left. Currency is AED and dates use Asia/Dubai.
