# EMSXpress

Responsive shipment-management frontend built with Vite, React, and TypeScript. The UI includes the landing page plus `/shipping`, `/tracking`, `/tracking/:trackingNumber`, `/services`, `/quote`, `/locations`, `/dashboard`, `/help`, `/contact`, `/faqs`, `/about`, and `/register` views.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Run `npm run dev` for the frontend only. To run Vercel API routes locally, add the environment values below and run `npx vercel dev`.

## Tracking backend and map

- `GET /api/track?numbers=EMS-2048-7319` returns shipment status and scan history from PostgreSQL. Up to 10 comma- or newline-separated numbers are accepted.
- The tracking page refreshes the latest scan every 30 seconds and displays its coordinates on an interactive OpenStreetMap map. The map follows recorded scan coordinates; continuous vehicle GPS requires a connected carrier or device feed.
- `POST /api/dispatch/shipments` creates a shipment, and `POST /api/dispatch/events` records a new scan. Both require the `x-dispatch-key` header matching the server-only `DISPATCH_API_KEY` environment variable.
- `prisma/seed.mjs` adds the illustrative `EMS-2048-7319` sample shipment for development.

### Configure PostgreSQL and Vercel

1. Create a PostgreSQL database with a provider such as Neon or Supabase.
2. Put its connection string in a local `.env` as `DATABASE_URL` (copy `.env.example`). Keep this secret out of Git.
3. Run `npm run db:migrate` to create the tables. Optionally run `npm run db:seed` to add the sample shipment.
4. In Vercel, open **Project → Settings → Environment Variables** and add `DATABASE_URL` and a strong random `DISPATCH_API_KEY` for Production (and Preview if needed).
5. Push the app to GitHub. Vercel will rebuild and deploy the API routes with the frontend.

After setting the Vercel environment variables, redeploy once so the serverless functions receive them. For an existing production database, run `npm run db:migrate` against its URL before using tracking.

To add shipment activity, send authenticated JSON requests to `/api/dispatch/shipments` and `/api/dispatch/events`. Never expose `DISPATCH_API_KEY` in frontend code.

Example scan update:

```sh
curl -X POST http://localhost:3000/api/dispatch/events \
  -H 'content-type: application/json' \
  -H 'x-dispatch-key: YOUR_DISPATCH_API_KEY' \
  -d '{"trackingNumber":"EMS-2048-7319","status":"IN_TRANSIT","location":"North Atlantic","facility":"Flight EMS 204","description":"Shipment is airborne to London.","latitude":48,"longitude":-30}'
```

## Deploy to Vercel

The project is configured for Vercel in `vercel.json`. It builds with `npm run build` into `dist`, and rewrites direct route requests to the SPA entry so URLs such as `/tracking` and `/locations` work after refresh.

### Git-based deployment

1. Push this repository to GitHub.
2. In Vercel, choose **Add New → Project** and import the `emsxpress` repository.
3. Keep the detected Vite settings: build command `npm run build`, output directory `dist`, install command `npm install`.
4. Add `DATABASE_URL` and `DISPATCH_API_KEY` as Vercel environment variables, then deploy.

### CLI deployment

Run `npx vercel` to link the local project and create a preview deployment. After signing in and reviewing the preview, run `npx vercel --prod` to publish it.
# emsxpress
