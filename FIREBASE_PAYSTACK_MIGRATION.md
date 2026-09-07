# Firebase and Paystack migration plan

This document is a plan only. The current Supabase backend remains operational
until a separately funded implementation and migration is approved.

## Target services

- Firebase Authentication for rider, driver, admin, and superadmin accounts.
- Cloud Firestore for profiles, ranks, vehicles, trips, fares, maintenance, and payments.
- Cloud Functions for trusted dispatch, administration, and Paystack operations.
- Firebase Cloud Messaging plus the existing PWA service worker for push alerts.
- Paystack hosted checkout, server-side verification, and signed webhooks.

## Security model

Roles will be Firebase custom claims written only by an Admin SDK function.
Public signup creates riders only. Admin and driver invitations are issued by
an administrator; only a superadmin can create another admin. Firestore rules
will deny access by default and scope every fleet record to an `operatorId`.
Paystack secret keys and webhook secrets live only in function secrets.

## Suggested collections

- `users/{uid}`: display profile and `operatorId`; no editable role field.
- `operators/{operatorId}`: fleet or association information.
- `ranks/{rankId}` and `fares/{fareId}`: operational route data.
- `vehicles/{vehicleId}`: operator, driver, rank, queue position, and seats.
- `trips/{tripId}`: rider, operator, vehicle, fare, payment, and status.
- `maintenance/{logId}`: operator-scoped vehicle issues.
- `payments/{reference}`: server-owned Paystack state and immutable audit data.

## Delivery sequence

1. Create separate Firebase development and production projects, emulators,
   App Check, budgets, backups, and secret management.
2. Implement Authentication, custom-claim administration, Firestore rules, and
   emulator rule tests before moving any user data.
3. Write idempotent export/import tooling, map current customer accounts to
   riders and owner accounts to admins, and reconcile record counts.
4. Move reads behind a repository layer, then migrate writes feature by
   feature. Keep Supabase read-only during the final cutover window.
5. Implement atomic dispatch with a Firestore transaction so a seat cannot be
   assigned twice and cancellation reliably releases it.
6. Add a Cloud Function that initializes Paystack checkout using a server-set
   amount and unique reference. Never accept a fare amount from the browser.
7. Verify Paystack webhook signatures, re-query Paystack before marking a
   payment successful, make webhook handling idempotent, and retain an audit log.
8. Run role-by-role acceptance, accessibility, offline, payment, rollback, and
   data-reconciliation tests before changing production DNS.

## Acceptance gates

- Firestore emulator tests prove cross-rider and cross-operator reads fail.
- Replayed or forged Paystack webhooks cannot duplicate a payment or trip.
- Concurrent bookings cannot make seats negative.
- The installable app preserves tickets offline but never queues payment as if
  it succeeded while offline.
- A tested rollback can restore the previous read-only backend and DNS.
