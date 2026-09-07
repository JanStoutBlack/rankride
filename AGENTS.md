# AGENTS.md

Instructions for AI coding agents working in this repository.

## What this project is

TaxiRank: a React + TypeScript + Vite + Tailwind + shadcn/ui web app for
South African taxi ranks, backed by Lovable Cloud (Supabase Postgres, Auth,
Realtime, Edge Functions). Roles: customer, driver, owner.

Read `DOCUMENTATION.md` for the architecture, `PLAN.md` for direction, and
`TODO.md` for open work before proposing changes.

## Hard constraints

- This is a **React web app**. Do not add Flutter, Angular, Vue, Next.js, or a
  Node/Express server. Server-side logic belongs in `supabase/functions/*`
  (Deno + TypeScript).
- Do not edit generated files: `src/integrations/supabase/client.ts`,
  `previewAuthStorage.ts`, `types.ts`, `.env`, `supabase/config.toml`.
- Do not touch the `auth`, `storage`, `realtime`, `supabase_functions`, or
  `vault` schemas.
- Never print or log secrets; the service-role key and database password are
  not retrievable.

## Database rules

- Roles live only in `user_roles`; check them with the security-definer
  `public.has_role(uuid, app_role)`. Never store a role on `profiles` and never
  trust a role from client storage.
- Every new `public` table: `CREATE TABLE` → `GRANT` → `ENABLE ROW LEVEL
  SECURITY` → policies, in the same migration.
- Migrations are append-only; never rewrite an applied migration.

## Edge Function rules

Order of operations in every handler:
1. Handle the CORS preflight (`OPTIONS`).
2. Read the `Authorization` header; reject when missing.
3. Resolve the user from the token; reject when invalid.
4. Check the role when the endpoint is privileged (e.g. `create-driver` is
   owner-only).
5. Validate inputs, including UUID shape.
6. Only then run queries with the service-role client.

## Frontend rules

- Colors, gradients and shadows come from tokens in `src/index.css` and shadcn
  variants. No hardcoded `text-white` / `bg-black` / `bg-[#hex]`.
- The visual language is glassmorphism: frosted translucent surfaces, blurred
  backdrops, soft borders, light and dark themes. Keep it consistent; don't
  introduce a second style.
- Route pages `export default`; shared components use named exports.
- Role gating in the UI is `ProtectedRoute` — it is convenience, not security.
  The database is the source of truth.

## Realtime rules (a past crash came from breaking these)

- Create channels inside `useEffect`, never during render or in a helper called
  from render.
- Attach all `.on('postgres_changes', ...)` handlers **before** `.subscribe()`.
  Calling `.on()` after `subscribe()` throws and blanks the screen.
- Give each subscriber a unique channel name, e.g. `driver-trips-${vehicleId}`.
- Remove the channel in the effect cleanup.

## Verification before reporting done

- `npm run lint` and `npm run build` must pass.
- Exercise the affected role path in the running preview.
- Do not claim a change is applied unless the tool call that applied it
  succeeded.

## Communication

Explain changes in plain language for a non-technical audience: pages, buttons,
prices, tickets. Avoid internal jargon and file paths in user-facing summaries.
