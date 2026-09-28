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

The app uses `profiles`, `ranks`, `fares`, `vehicles`, `trips`, and `maintenance_logs` collections. Roles are not stored in editable profile documents. They are signed Firebase custom claims with four supported values: `rider`, `driver`, `admin`, and `superadmin`.

## Access levels

- **Rider:** may create and read only their own trips, and edit only their own role-free profile.
- **Driver:** may see trips for their assigned vehicle and update boarding/trip status.
- **Admin:** may manage fleet data, drivers, fares, maintenance, and view operational analytics.
- **Superadmin:** has admin access plus platform-level user-role and deletion controls.

Public signup always creates a rider. Admins create driver accounts through a callable function. Only a superadmin can change a user's signed role claim. Firestore rules independently enforce access even if someone bypasses the page navigation.

## Trusted functions

| Callable | Purpose | Access |
| --- | --- | --- |
| `calculateFare` | Look up a configured fare or provide the existing estimate | Signed-in users |
| `assignTrip` | Atomically select a vehicle and reserve one seat | Rider/admin/superadmin |
| `maintenance` | Report or update a vehicle issue | Driver/admin; updates admin-only |
| `createDriver` | Create an account, sign its driver claim, and optionally link a vehicle | Admin/superadmin |
| `listDrivers` | Return the driver directory without exposing all Auth users | Admin/superadmin |
| `manageUserRole` | Set one of the four signed role claims | Superadmin only |
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

The Firebase web configuration identifies the project and is safe to include in the browser bundle; authorization is provided by Authentication, custom claims, Firestore rules, and callable-function checks. Privileged Admin SDK credentials must never be placed in the frontend.
