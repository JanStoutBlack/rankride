# Contributing to TaxiRank

Internal guide. This project is **not** open source — do not publish code,
schema details, or credentials outside the team.

## Getting started

```bash
npm install
npm run dev     # http://localhost:8080
```

The backend (database, auth, functions) is hosted on Lovable Cloud. There is one
instance shared by preview and production, so treat data changes as real.

## Ground rules

1. **Never edit generated files**: `src/integrations/supabase/client.ts`,
   `previewAuthStorage.ts`, `types.ts`, `.env`, `supabase/config.toml`.
2. **Never store roles on `profiles`** or in localStorage. Authorization goes
   through `user_roles` + `has_role()` in RLS policies.
3. **Every new public table** needs, in this order: `CREATE TABLE`, `GRANT`s,
   `ENABLE ROW LEVEL SECURITY`, then policies.
4. **Colors and shadows come from design tokens** in `src/index.css`. No
   `text-white`, `bg-black`, or `bg-[#hex]` in components — it breaks dark mode.
5. **Edge Functions authenticate first.** Verify the bearer token, check the
   role where relevant, validate UUID inputs, and only then use the
   service-role client.
6. **Realtime**: create the channel in `useEffect`, attach all `.on()` handlers
   before `.subscribe()`, use a unique channel name, remove the channel on
   cleanup.

## Working on a change

1. Keep changes scoped — UI work stays in UI code unless the task says
   otherwise.
2. Reuse existing components (`AppLayout`, `StatusBadge`, `QRCodeDisplay`,
   shadcn primitives) before adding new ones.
3. Run `npm run lint` and `npm run build` before handing work over.
4. Manually exercise the affected role: customer booking, driver scan, or owner
   dashboard.

## Code style

- TypeScript, functional components, hooks for shared logic.
- Named exports for components; `export default` only for route pages.
- File-level comment block explaining what a non-obvious module does; inline
  comments for *why*, not *what*.
- Async data fetching: handle the error branch explicitly, never swallow it.

## Migrations

- One migration per logical change, never edited after being applied.
- Include RLS policies and GRANTs in the same migration as the table.
- Do not touch the `auth`, `storage`, `realtime`, `supabase_functions` or
  `vault` schemas.

## Security reporting

Report suspected vulnerabilities privately to the project owner. Do not open a
public ticket and do not include real user data in reproduction steps.
