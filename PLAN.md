# TaxiRank — Product & Engineering Plan

## Goal

Digitise the minibus-taxi rank: predictable fixed fares, cashless payment, a
verifiable ticket, and visibility for vehicle owners — without changing how the
rank actually works.

## Phases

### Phase 1 — Foundation (done)
- Postgres schema: profiles, ranks, vehicles, trips, fares, maintenance_logs.
- Roles in a dedicated `user_roles` table + `has_role()` security-definer
  function; RLS and GRANTs on every table.
- Email/password auth. Self-registration limited to customers and owners;
  drivers are created by owners.

### Phase 2 — Customer (done)
- Booking: pick current rank, enter destination, see fixed fare, confirm.
- QR ticket for boarding.
- Trip history with live status updates.

### Phase 3 — Driver (done)
- Today's trips for the driver's vehicle.
- Ticket scanner that validates a ticket and marks the trip boarded.
- Driver QR code for scan-to-pay.

### Phase 4 — Owner (done)
- Dashboard: total trips, revenue, vehicle list.
- Vehicle and driver management.
- Maintenance log with issue reporting.

### Phase 5 — Dispatch & fares (done)
- `calculate-fare`: preset fare lookup, distance-based fallback.
- `assign-trip`: next available vehicle at the rank, destination match
  preferred, seat count decremented on assignment.

### Phase 6 — Experience (done)
- Glassmorphism design system with light/dark themes.
- Realtime in-app notifications per role.

### Phase 7 — Payments & launch readiness (next)
1. Choose a payment provider and implement the charge + payout flow.
2. Replace placeholder trust/marketing claims with verified ones.
3. Real push notifications via service worker.
4. Testing, accessibility, and SEO passes.
5. Seed real rank and fare data; disable email auto-confirm.

## Principles

- Roles are never stored on a user-editable row; authorization is enforced in
  the database, not the UI.
- Fares are fixed and shown before confirmation — no surprise pricing.
- Every server-side function authenticates the caller before any query.
- One visual direction (glass) applied consistently; colors come from design
  tokens, never hardcoded utility classes.
