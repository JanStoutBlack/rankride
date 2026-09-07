# TaxiRank — Technical Documentation

TaxiRank is a web app for South African minibus-taxi ranks. It connects three
roles: **customers** (book a seat, pay, carry a QR ticket), **drivers** (see
today's trips, scan tickets, report issues) and **owners** (fleet dashboard,
drivers, vehicles, maintenance).

## Stack

| Layer | Technology |
| --- | --- |
| UI | React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Routing | react-router-dom v6 |
| Data / auth | Lovable Cloud (Supabase Postgres, Auth, Realtime, Edge Functions) |
| Styling direction | Glassmorphism ("Apple Glass"): frosted cards, translucent buttons, gradient mesh backgrounds, light/dark themes |

## Directory map

```text
src/
  App.tsx                 Route table + global providers
  main.tsx                Entry point, ThemeProvider
  index.css               Design tokens (HSL variables), glass utilities
  hooks/
    useAuth.tsx           Auth context: session, profile, role, sign in/up/out
    useNotifications.tsx  Realtime toasts per role
    useTheme.tsx          Light/dark theme context
  components/
    AppLayout.tsx         Shell: header, nav, theme toggle
    ProtectedRoute.tsx    Role-gated route wrapper
    QRCodeDisplay.tsx     Renders ticket / driver QR codes
    QRScanner.tsx         Camera-based QR scanning
    StatusBadge.tsx       Trip status pill
    TrustBadges.tsx       Payment/security trust indicators
    ui/                   shadcn primitives
  pages/
    Auth.tsx              Login + signup (customer/owner only)
    Index.tsx             Landing page
    customer/Booking.tsx  Rank + destination -> fare -> trip + QR ticket
    customer/Trips.tsx    Trip history, live updates
    driver/Trips.tsx      Today's trips for the driver's vehicle
    driver/Scan.tsx       Scan customer ticket -> mark boarded
    driver/QRCode.tsx     Driver's own payment QR
    owner/Dashboard.tsx   Totals: trips, revenue, vehicles
    owner/Vehicles.tsx    Fleet CRUD
    owner/Drivers.tsx     Create/manage drivers
    owner/Maintenance.tsx Issue log
supabase/
  migrations/             SQL schema history
  functions/              Edge Functions (Deno)
```

## Data model (public schema)

- **profiles** — one row per auth user: `id` (FK `auth.users`), `phone`,
  `full_name`, timestamps.
- **user_roles** — `(user_id, role)` with enum `app_role`
  (`customer | driver | owner`). Roles live **only** here; never on `profiles`.
- **ranks** — `name`, `location`, optional coordinates.
- **vehicles** — `plate`, `capacity`, `rank_id`, `driver_id`,
  `current_destination`, `available_seats`, `is_active`.
- **trips** — `customer_id`, `vehicle_id`, `origin_rank_id`, `destination`,
  `fare`, `status` (enum `trip_status`: `pending | assigned | in_progress |
  completed | cancelled`).
- **fares** — preset fare per `rank_id` + destination.
- **maintenance_logs** — `vehicle_id`, `reported_by`, `description`, `status`.

### Authorization

Every table has RLS enabled with explicit `GRANT`s. Role checks use a
security-definer function so policies never recurse:

```sql
select public.has_role(auth.uid(), 'owner');
```

Rules of thumb enforced by policy:
- Customers read/write only their own trips and profile.
- Drivers read trips assigned to their vehicle and may update trip status.
- Owners read fleet-wide data and manage vehicles, drivers and maintenance.
- `vehicles` is readable by authenticated users only (no anonymous access).

## Edge Functions

| Function | Purpose | Auth |
| --- | --- | --- |
| `calculate-fare` | Returns the preset fare for a rank + destination, falling back to a distance estimate | JWT required |
| `assign-trip` | Picks the next active vehicle at the origin rank with free seats (preferring a matching destination), assigns the trip and decrements seats | JWT required |
| `maintenance` | `POST` create issue (driver/owner), `GET` list issues, `PATCH` update status | JWT required |
| `create-driver` | Owner-only: creates the driver auth user, sets the `driver` role, links the vehicle | JWT + owner role |

All functions verify the `Authorization` bearer token before touching the
database and validate UUID-shaped inputs.

## Realtime

`useNotifications` subscribes per role: drivers get new-assignment toasts,
customers get status-change toasts, owners get maintenance alerts. Trip lists
also subscribe to their own filtered channel.

Subscription rules (important — violating them causes a runtime crash):
1. Create the channel inside `useEffect`, never in render or inside a helper
   called from render.
2. Attach every `.on(...)` **before** `.subscribe()`.
3. Use a unique channel name per subscriber (e.g. `customer-trips-${userId}`).
4. Always `supabase.removeChannel(channel)` in the cleanup function.

## Local development

```bash
npm install
npm run dev      # http://localhost:8080
npm run lint
npm run build
```

Backend environment variables (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`) are generated —
do not edit `.env` or `src/integrations/supabase/client.ts` / `types.ts`.

## Known gaps

Payments are not wired to a real provider yet; the trust badges are marketing
copy and must not be shown publicly until real agreements and a real payment
integration exist. See `TODO.md`.
