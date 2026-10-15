# EMSXpress

Responsive shipment-management frontend built with Vite, React, and TypeScript. The UI includes the public landing page plus dedicated `/services`, `/track`, `/track/:trackingNumber`, `/quote`, `/locations`, `/dashboard`, `/help`, `/contact`, and `/faqs` views.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Run `npm run dev` and open the local URL printed by Vite.

## Current behavior

- Tracking, rate calculations, location search, FAQ filters, CSV manifest import/export, and contact submission are interactive in the browser.
- Demonstration shipment, rate, dashboard, and location data are illustrative. The contact form confirms submission locally.
- PostgreSQL data models are defined in `prisma/schema.prisma`. Set `DATABASE_URL` from `.env.example` before connecting a database.

Authentication, persistence, carrier APIs, label/PDF generation, and production server actions still require service credentials and backend implementation.
# emsxpress
