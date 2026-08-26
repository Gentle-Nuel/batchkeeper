# Production Log App — Wireframing Handoff

## Project summary
A production/inventory log for a cosmetics and soap/cleaning-agent maker. She currently tracks raw ingredients, batch production, sales, and profit/loss informally and wants a proper digital tool for it. This document hands off the planning so far for **wireframing only** — no visual branding has been decided yet (see Open Items).

## Who it's for
- Single user (the business owner), solo — no staff accounts or role permissions needed for v1
- Used mid-production, likely on her phone — **design mobile-first**
- Not yet NAFDAC-registered but in the process — the product/UI should have provision for NAFDAC fields without depending on them (see Data Model)

## Platform & approach (for context, not wireframe-critical)
Mobile-first Progressive Web App (PWA) — React frontend, Supabase backend, hosted on Vercel. The batch-logging screen needs to work offline-first (hold entries locally, sync when back online) — worth reflecting in the wireframe with a subtle sync/offline status indicator on that screen.

## Data model (so wireframe fields match real data)

**Materials** — name, unit (g/ml/kg/l), cost per unit, current stock, reorder point, supplier

**Products (Recipes)** — name, category (soap / cosmetic / cleaning agent), standard batch size, target yield (units), NAFDAC status (not registered / in process / registered), NAFDAC reg. no. (optional/nullable)

**Recipe Items (BOM)** — per product: which materials + quantity per standard batch

**Batches** — batch number (auto-generated, format like `PRODCODE-YYMMDD-01`), product, date made, cure/ready date (soap only), planned yield, actual yield, loss quantity + reason, labor cost, status (curing / ready / selling / sold out)

**Batch Materials Used** — materials actually consumed for that batch — pre-filled from the recipe, editable

**Sales** — batch, date, quantity sold, unit price, buyer type (retail / distributor), buyer name (optional)

## She makes more than one product line
This isn't a single-product app. She produces multiple things (e.g. soap bars, a cosmetic cream, cleaning agents), each with its own recipe/BOM, NAFDAC status, and batch history. Materials are shared across products (e.g. shea butter feeding three different recipes) — one stock count, multiple recipes drawing from it. Batch numbers encode the product code so batches stay distinguishable across product lines at a glance. Reports and the low-stock warning below both need to be product-aware, not just generic.

## Navigation architecture (resolved — carry this into Penpot as-is)
Three tabs, not a flat list of seven screens. Production and the old "Dashboard" concept have been merged — a standalone snapshot screen was thin enough to compete with the batch list for the same attention, so the snapshot now sits directly above production instead of behind a separate tab.

**1. Production** (merged Home + Batches)
   - Top: operational snapshot — low-stock alerts (see below), what's curing, what's ready to sell
   - A **persistent "Log a Batch" action** (e.g. floating action button, or pinned at the top) — visible throughout this tab, not tied to one screen, since production is the core workflow and she shouldn't have to navigate to a "home base" to start a batch
   - Below: batch list (curing / ready / sold out) → tap into **Batch Detail**: materials used, remaining stock, cost, and a **Log a Sale** action right there (selling only ever happens from a specific batch — it doesn't need its own standalone screen)

**2. Materials**
   - Stock list, cost/unit, add/edit

**3. More**
   - Products/Recipes — each with its BOM and NAFDAC status/reg. no. fields (deliberately buried here, not in the daily production flow)
   - Reports — filter by date range or product, profit/loss over time
   - Settings

## Log a Batch — confirmed interaction model
The system already knows today's date, the batch number, and the full recipe (materials + planned quantities) once a product is picked. She should be **confirming reality, not re-entering data**:

**Product selection → recipe-loaded batch review (one editable table, not a step-through wizard) → actual adjustments → outcome (yield/loss) → save/sync**

Keep "planned" (from the recipe) and "actual" (what she really used) visually distinct in that review table — the gap between them is real production data worth seeing, not something to hide for simplicity. Also needs the offline/sync status affordance mentioned above.

## Low-stock warning — be specific, not generic
Because materials are shared across products, a shortage should say *which products it affects*, not just flag the material in isolation — e.g. "Shea butter low — affects Body Cream, Soap Bar A" rather than a bare "Shea butter low" badge.

## Design constraints
- Mobile-first; she'll mostly use this on a phone during production
- Log a Batch is the screen that has to feel the smoothest — minimize taps, autofill wherever possible
- NAFDAC fields should be present but optional/non-blocking — the app must work fully before she's registered
- No brand identity applied yet — use clean, neutral styling for the wireframe stage

## Open items (not yet decided)
- No brand colors/logo/visual identity from the client yet — wireframes should stay in grayscale/neutral, not attempt final visual design
- Exact report types beyond basic profit/loss by date/product not yet finalized
