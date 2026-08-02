# Demo architecture

`ATLAS_DEMO_MODE=true` selects isolated demo behavior at server boundaries. Shipment intake uses `apps/web/lib/demo-store.ts`, an in-memory server store. Active operations use typed initial state in `operations-demo-data.ts` and mutations in `operations-demo-provider.tsx`. The provider stores synthetic state in browser `sessionStorage` so tracking, attention, exceptions, drafts, pricing, and sourcing remain connected across routes.

Demo components live under `apps/web/app/ui/`. Production Prisma commands and session authorization remain intact and are selected whenever demo mode is false. No demo mutation writes PostgreSQL. No external request is required. Restarting or clearing the browser session resets active operations.

When adding demo behavior, update the central types and mutation API first, then render the same state across every affected screen. Never duplicate independent cards for a connected operational event.
