# Taxi Go App

Generate a PostgreSQL schema for a taxi rank app. Have tables: users (id, phone, role: customer/driver/owner), ranks (id, name, location), vehicles (id, plate, capacity, rank_id, driver_id), trips (id, customer_id, vehicle_id, fare, status)."
2. For Authentication API:
   "Create a Node.js/Express API endpoint for login. It takes phone and password, checks the users table, returns a JWT token and the user's role (customer, driver, owner)."

👤 Phase 2: Customer Features

Generate the customer's booking and payment flow.

1. For Customer Booking:
   "Write a Flutter UI page where a customer selects their current rank from a dropdown, enters a destination, and sees a fixed fare. On confirm, it calls an API to create a trip and returns a ticket QR code."
2. For Customer Scan-to-Pay:
   "Create a Flutter screen with a QR scanner. When it scans a driver's code, it fetches the trip's final fare and shows a 'Pay Now' button that calls a Stripe payment API."

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c801525c-bb80-4206-af7b-672774bbb77b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
