# Batchkeeper

A mobile-first production and inventory management application for small businesses that manufacture physical products. It replaces informal tracking (notebooks, spreadsheets, memory) with a structured tool for logging production batches, tracking raw material stock, recording sales, and understanding product costs and profitability.

Built for a business owner working during production, often from a phone and sometimes with unreliable internet. The app is designed around an offline-first workflow: entries can be held locally and synchronized when a connection is available.

## Status

**Deployed web application — actively being refined.**

The application is deployed and functional, with ongoing development focused on refining existing workflows and expanding the product. The original Penpot wireframe (23 screens, documented in `Production-Log-App-Handoff.md`) provided the foundation for the current application, while `DEVLOG.md` documents the development process and `Wireframe-vs-Build-Comparison.md` records known differences between the original design and the current implementation.

## Core workflow

* **Log a batch:** Select a product, confirm materials actually used against its recipe, record yield and loss, and get a production cost breakdown.
* **Track stock:** Manage raw materials with cost per unit, current stock levels, and reorder points across the products that use them.
* **Log a sale:** Record sales against specific production batches using retail or distributor pricing, while keeping stock and sales totals up to date.
* **Reports:** Review profit and loss across date ranges or products, with trend information for understanding performance.

Materials are shared across product lines, so shortages can be traced across every product affected by a material rather than being treated as isolated inventory issues.

Products also support optional NAFDAC registration information without making regulatory data part of the daily production workflow.

## Stack

* React 19 + TypeScript, built with Vite
* Tailwind CSS
* Zustand for state management
* Supabase (PostgreSQL, Auth, Edge Functions) as the backend
* Progressive Web App deployed on Vercel
* Offline synchronization and Web Push notifications
* SQL migrations for database schema management
* oxlint for code quality

## Repository layout

```text
app/                                  The production application (React + Supabase)
  src/                                Screens, components, stores, and libraries
  supabase/                           SQL migrations and Edge Functions

Production-Log-App-Handoff.md        Wireframe-to-development specification
DEVLOG.md                             Development log
Wireframe-vs-Build-Comparison.md     Differences between the wireframe and current build
production-log-wireframe-handoff.md  Earlier, shorter handoff draft
```

## Getting started

```bash
cd app
npm install
cp .env.example .env
```

Fill in the required Supabase project credentials and VAPID public key in `.env`, then start the development server:

```bash
npm run dev
```

The application expects a Supabase project with the schema in `app/supabase/migrations` applied. Data is scoped per business, so the application is not intended to run against a shared or example backend.

Other scripts, run from `app/`:

```bash
npm run build     # type-check and build for production
npm run lint      # oxlint
npm run preview   # preview a production build locally
```

## Design reference

The original wireframe was created in Penpot and contains 23 screens. It established the application's navigation architecture, screen structure, interaction patterns, color and typography system, and underlying data model.

`Production-Log-App-Handoff.md` contains the full design-to-development handoff and documents the decisions used to build the application.

The current implementation has intentionally evolved beyond the original wireframe where product and implementation requirements called for it. `Wireframe-vs-Build-Comparison.md` documents those differences and the reasoning behind them.
