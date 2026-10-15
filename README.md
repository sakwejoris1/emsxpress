# EMSXpress

Responsive shipment-management frontend built with Vite, React, and TypeScript. The UI includes the landing page plus `/shipping`, `/tracking`, `/tracking/:trackingNumber`, `/services`, `/quote`, `/locations`, `/dashboard`, `/help`, `/contact`, `/faqs`, `/about`, and `/register` views.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Run `npm run dev` and open the local URL printed by Vite.

## Current behavior

- Tracking, rate calculations, location search, FAQ filters, CSV manifest import/export, and contact submission are interactive in the browser.
- Demonstration shipment, rate, dashboard, and location data are illustrative. The contact form confirms submission locally.
- PostgreSQL data models are defined in `prisma/schema.prisma`. Set `DATABASE_URL` from `.env.example` before connecting a database.

Authentication, persistence, carrier APIs, label/PDF generation, and production server actions still require service credentials and backend implementation.

## Deploy to Vercel

The project is configured for Vercel in `vercel.json`. It builds with `npm run build` into `dist`, and rewrites direct route requests to the SPA entry so URLs such as `/tracking` and `/locations` work after refresh.

### Git-based deployment

1. Push this repository to GitHub.
2. In Vercel, choose **Add New → Project** and import the `emsxpress` repository.
3. Keep the detected Vite settings: build command `npm run build`, output directory `dist`, install command `npm install`.
4. Deploy. No environment variables are needed for this frontend-only deployment.

### CLI deployment

Run `npx vercel` to link the local project and create a preview deployment. After signing in and reviewing the preview, run `npx vercel --prod` to publish it.
# emsxpress
