# TODO

Status legend: `[ ]` open · `[~]` in progress · `[x]` done

## Blocking / correctness

- [ ] Replace the payment placeholder with a real provider (Stripe or a local
      PSP such as Paystack/Yoco) — "Pay Now" currently does not move money.
- [ ] Remove or substantiate the bank/partner trust badges. The FNB / Standard
      Bank / ABSA / Nedbank / Capitec, "PCI DSS" and "256-bit SSL" claims are
      unverified and must not ship publicly as-is.
- [ ] Verify every Edge Function end-to-end against real rows
      (`calculate-fare`, `assign-trip`, `maintenance`, `create-driver`).
- [ ] Audit remaining realtime subscriptions for the "one channel per effect,
      unique name, cleanup on unmount" rule.
- [ ] Turn off auth email auto-confirm before going live.

## Features

- [ ] Real push notifications (service worker + Web Push) — today's alerts are
      in-app toasts only.
- [ ] Trip cancellation flow for customers, with seat release.
- [ ] Rank queue view: which vehicle is next to depart.
- [ ] Owner revenue charts by day / vehicle / route.
- [ ] Driver earnings summary.
- [ ] Fare management UI for owners (currently seeded by SQL only).
- [ ] Offline-tolerant ticket display (cache the QR payload).

## Quality

- [ ] Component and Edge Function tests.
- [ ] Error boundaries around each route.
- [ ] Loading skeletons instead of text placeholders.
- [ ] Accessibility pass: contrast on glass surfaces, focus rings, labels.
- [ ] SEO pass on the landing page (title, description, JSON-LD).

## Data

- [ ] Replace sample ranks/fares with real rank data before launch.
- [ ] Add indexes for `trips(vehicle_id, created_at)` and
      `trips(customer_id, created_at)` once volumes grow.
