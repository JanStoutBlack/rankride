# TaxiRank — Technical Documentation

TaxiRank is a React web app for South African minibus-taxi ranks. Riders book seats and carry QR tickets, drivers manage assigned trips, admins operate the fleet, and superadmins control the platform.

## Stack

| Layer | Technology |
| --- | --- |
| UI | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Authentication | Firebase Authentication |
| Data | Cloud Firestore and realtime listeners |
| Trusted operations | Firebase Cloud Functions (TypeScript) |
| Hosting | Firebase Hosting-compatible SPA build |

## Firebase layout

- `src/integrations/firebase/config.ts` initializes the provided `rank-ride` Firebase project.
- `src/integrations/firebase/client.ts` is the browser data and realtime adapter used by the existing pages.
- `firestore.rules` is the deny-by-default access policy.
- `firestore.indexes.json` contains the compound trip-history indexes.
- `functions/src/index.ts` contains trusted fare, dispatch, maintenance, account, role, and analytics operations.

The app uses `profiles`, `user_roles`, `ranks`, `fares`, `vehicles`, `trips`, and `maintenance_logs` collections. Roles live in protected `user_roles/{uid}` documents with one `role` field: `rider`, `driver`, `admin`, or `superadmin`. They are never stored on editable profile documents.

## Access levels

- **Rider:** may create and read only their own trips, and edit only their own role-free profile.
- **Driver:** may see trips for their assigned vehicle and update boarding/trip status.
- **Admin:** may manage fleet data, drivers, fares, maintenance, and view operational analytics.
- **Superadmin:** has admin access plus platform-level user-role and deletion controls.

Public email/password signup and first-time Google sign-in always create a rider. Admins create driver accounts through a callable function. A superadmin changes roles from **Users & roles** in the dashboard. Firestore rules independently enforce access even if someone bypasses the page navigation.

### Bootstrap the first superadmin

No local script or service-account key is required. In Firebase Console, open Firestore and create `user_roles/{firebase-auth-uid}` with a string field named `role` and value `superadmin`. Sign out and back in; the dashboard then exposes **Users & roles**, where that superadmin can assign all later roles. Firebase Console access is the trusted bootstrap boundary.

## Trusted functions

| Callable | Purpose | Access |
| --- | --- | --- |
| `calculateFare` | Look up a configured fare or provide the existing estimate | Signed-in users |
| `assignTrip` | Atomically select a vehicle and reserve one seat | Rider/admin/superadmin |
| `maintenance` | Report or update a vehicle issue | Driver/admin; updates admin-only |
| `createDriver` | Create an account, assign its driver role, and optionally link a vehicle | Admin/superadmin |
| `listDrivers` | Return the driver directory without exposing all Auth users | Admin/superadmin |
| `listUsers` | Return the Auth user directory and protected roles | Superadmin only |
| `manageUserRole` | Update a protected user role | Superadmin only |
| `adminAnalytics` | Return seven-day trips, revenue, completion, fleet, and issue totals | Admin/superadmin |

Dispatch uses a Firestore transaction so concurrent bookings cannot reserve the final seat twice.

## Local verification and deployment

```bash
npm install
npm run dev
npm run lint
npm run build
npm --prefix functions install
npm --prefix functions run build
firebase emulators:start
firebase deploy --only firestore,functions,hosting
```

The Firebase web configuration identifies the project and is safe to include in the browser bundle; authorization is provided by Authentication, protected role documents, Firestore rules, and callable-function checks. Privileged Admin SDK credentials must never be placed in the frontend.
