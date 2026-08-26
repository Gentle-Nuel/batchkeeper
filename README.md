# Batchkeeper

A mobile-first production and inventory log for small cosmetics, soap, and cleaning-agent makers. It replaces informal tracking (notebooks, spreadsheets, memory) with a structured tool for logging batches, tracking raw material stock, recording sales, and seeing real profit and loss.

Built for a single business owner working mid-production, usually on her phone, often with unreliable internet. The app is offline-first: entries are held locally and synced when a connection is available.

## Status

Actively in development. The Penpot wireframe (23 screens, documented in [Production-Log-App-Handoff.md](Production-Log-App-Handoff.md)) is done and the real app is being built against it in [app/](app). See [DEVLOG.md](DEVLOG.md) for a day-by-day build log and [Wireframe-vs-Build-Comparison.md](Wireframe-vs-Build-Comparison.md) for where the build has diverged from the original wireframe and why.

## Core workflow

- **Log a batch**: pick a product, confirm materials actually used against the recipe, record yield and loss, and get a cost breakdown.
- **Track stock**: raw materials with cost per unit, current stock, and reorder points, shared across every recipe that uses them.
- **Log a sale**: sell from a specific batch, retail or distributor pricing, with running stock and totals.
- **Reports**: profit and loss by date range or product, with a trend view.

Materials are shared across product lines, so a shortage in one material is reported against every product it affects, not just flagged in isolation. NAFDAC registration fields exist on each product but are optional and out of the daily flow, since the business isn't registered yet.

## Stack

- React 19 + TypeScript, built with Vite
- Tailwind CSS
- Zustand for state
- Supabase (Postgres, Auth, Edge Functions) as the backend
- Deployed as a PWA on Vercel, with offline sync and Web Push notifications

## Repository layout

```
app/                          The real application (React + Supabase)
  src/                        Screens, components, stores, lib
  supabase/                   SQL migrations and edge functions
Production-Log-App-Handoff.md Full wireframe-to-development spec (screens, design system, data model)
DEVLOG.md                     Day-by-day build log
Wireframe-vs-Build-Comparison.md   Known gaps between the wireframe and the current build
production-log-wireframe-handoff.md   Earlier, shorter handoff draft
```

## Getting started

```bash
cd app
npm install
cp .env.example .env   # fill in your own Supabase project URL, anon key, and VAPID public key
npm run dev
```

The app expects a Supabase project with the schema in `app/supabase/migrations` applied. It will not run against a shared or example backend since data is scoped per business.

Other scripts, run from `app/`:

```bash
npm run build     # type-check and build for production
npm run lint      # oxlint
npm run preview   # preview a production build locally
```

## Design reference

The original wireframe lives in Penpot (23 screens, no final brand identity applied yet). [Production-Log-App-Handoff.md](Production-Log-App-Handoff.md) is the full handoff document: navigation architecture, screen-by-screen inventory, the color and type system, key interaction patterns, and the data model the screens were built against.
