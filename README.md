# EMSXpress

Responsive shipment-management application built with Vite, React, TypeScript, Vercel API routes, Prisma, and PostgreSQL.

## Run locally

1. Install Node.js 20 or newer and run `npm install`.
2. Set `DATABASE_URL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, and `DISPATCH_API_KEY` in `.env` (see `.env.example`).
3. Run `npm run db:migrate` to apply database migrations.
4. Run `npx vercel dev` to use the frontend and API routes together. `npm run dev` serves only the frontend.

No sample shipments, quotes, or service locations are seeded. Add operational records through the authenticated admin tools.

## Operational workflows

- `/admin` manages shipments and tracking scans, quote rate cards, service points, support inquiries, and business invoices.
- `/quote` calculates rates from active admin-published tariffs, including optional country, package, and postal-prefix matching. It returns no price when no active rate matches.
- `/locations` searches active service locations entered by an administrator and displays their verified coordinates on OpenStreetMap.
- `/contact` and collection requests save inquiries in the admin support inbox with their selected route/category.
- `/dashboard` shows the signed-in account's actual shipment and invoice records and accepts a CSV manifest. Invoice totals are generated from rated shipments.
- `/tracking` reads shipment events from PostgreSQL and refreshes every 30 seconds. It displays a recent GPS/device position when available, and falls back to the latest scan location otherwise. Customers can look up a shipment with its tracking number; no account is required.

### GPS/device feed

No carrier feed is connected by default. Dispatchers can share a driver's phone location from the admin UI: open `/admin` on the phone over HTTPS, sign in, select the shipment, choose **Start live location**, and allow browser location access. Keep the page open while the parcel is moving and choose **Stop location sharing** when the trip ends. The browser route is protected by the admin session and never receives the dispatch API key. Customer tracking refreshes the latest position every 30 seconds.

A GPS device or trusted carrier integration can also post coordinates to `POST /api/dispatch/location` with the server-only `x-dispatch-key` matching `DISPATCH_API_KEY`:

```sh
curl -X POST https://YOUR_DOMAIN/api/dispatch/location \
  -H 'content-type: application/json' \
  -H 'x-dispatch-key: YOUR_DISPATCH_API_KEY' \
  -d '{"trackingNumber":"EMS-TRACKING-NUMBER","latitude":40.7128,"longitude":-74.006,"timestamp":"2026-10-16T12:00:00Z","source":"vehicle-device-17"}'
```

Both location paths update the shipment's current position without adding GPS pings to the scan timeline. The API-key integration ignores older pings. Until a dispatcher starts sharing or a GPS integration sends data, the map shows scan coordinates when available.

### Dispatch scans and shipments

`POST /api/dispatch/shipments` creates shipment records and `POST /api/dispatch/events` records status scans. Both require the same dispatch key. Never put `DISPATCH_API_KEY` in frontend code.

### Database migrations

`npm run db:migrate` applies Prisma migrations. The operational workflows migration adds rates, service locations, inquiries, invoices, and account fields. The live-position migration adds GPS position storage and postal-prefix rate zones.

## Deploy to Vercel

The project builds with `npm run build` into `dist`. Set the environment variables above in Vercel for each environment, apply database migrations against the target database, and redeploy. Git-connected Vercel projects deploy automatically when commits are pushed to the connected branch.
