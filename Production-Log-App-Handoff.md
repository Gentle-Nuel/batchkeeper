# Production Log App — Wireframe → Development Handoff

*23 screens · Penpot file · High-fidelity mobile wireframe (no final brand identity applied)*

---

## 1. Overview

A production/inventory log app for a cosmetics and soap/cleaning-agent maker. She currently tracks raw ingredients, batch production, sales, and profit/loss informally; this app replaces that with a structured mobile tool.

**Who it's for**
- Single user — the business owner, solo. No staff accounts or role permissions in v1.
- Used mid-production, likely on her phone. Design is mobile-first throughout.
- Not yet NAFDAC-registered but in the process — the product has provision for NAFDAC fields without depending on them.

**Platform**
- Mobile-first Progressive Web App (PWA)
- React frontend, Supabase backend, hosted on Vercel
- Batch-logging needs to work offline-first: hold entries locally, sync when back online. Reflected throughout the UI via a persistent sync-status indicator and a dedicated Sync & Offline Data screen (§3.5).

**Design file**: Penpot file (internal name "New File 2" — consider renaming before sharing externally). Ask the design owner for the current share link; file ID `3be9e5e1-190f-8090-8008-79deba348ccc` for reference.

---

## 2. Navigation Architecture

Three bottom tabs, not a flat screen list. Production and the former "Dashboard" concept are merged — the operational snapshot sits directly above the batch list inside the Production tab, not behind a separate tab.

**Tab 1 — Production**
- Top: operational snapshot — low-stock alert (product-aware, not generic), what's curing, what's ready to sell.
- A persistent "Log a Batch" action, visible throughout the tab — production is the core workflow, it shouldn't require navigating to a "home base" first.
- Below: batch list (curing / ready / sold out) → tap a batch → Batch Detail → "Log a Sale" happens from there (selling has no standalone screen).

**Tab 2 — Materials**
- Stock list, cost/unit, add/edit.

**Tab 3 — More**
- Products/Recipes — BOM + NAFDAC status/reg. no., deliberately buried here, not in the daily production flow.
- Reports — filter by date range or product, profit/loss over time.
- Settings — business profile, sync, notifications, account, support.

**Screen-to-screen map:**
```
Production ──▶ Log a Batch
           └─▶ Batch Detail ──▶ Log a Sale (sheet)
           └─▶ All Batches
Materials  ──▶ Edit/Add Material
More       ├─▶ Products & Recipes ──▶ Product Detail (BOM + NAFDAC)
           ├─▶ Reports
           └─▶ Settings ├─▶ Business Profile
                        ├─▶ Sync & Offline Data
                        ├─▶ Notifications
                        ├─▶ Account ├─▶ Change Email
                        │           ├─▶ Change Password
                        │           └─▶ Delete Account
                        ├─▶ Help & Support ──▶ Send Feedback
                        └─▶ About
```

---

## 3. Screen Inventory

All 23 screens are built in the Penpot file (board names match the numbers below, e.g. "03 — Batch Detail"). Mock content uses a running example (Body Cream / BC-260813-01) kept consistent across every screen it appears on — treat those numbers as illustrative, not final.

### 3.1 Core Production Flow

**01 — Production**
Home tab. Low-stock snapshot (names affected products, not just the material), curing/ready counts, persistent "Log a Batch" CTA, recent batches list with status pills (Ready/Curing/Sold Out), "View all" link to the full batch list.

**02 — Log a Batch**
Product picker → recipe-loaded editable table, not a step-through wizard. Materials table shows Planned (from the recipe, read-only) vs. Actual (editable) side by side, visually distinct. Yield/loss outcome, labour cost, save.

**03 — Batch Detail**
Overview (made date, labour cost), yield/loss with loss reason, materials used showing Used vs. Remaining stock (low-stock materials flagged), cost breakdown (materials + labour → total + cost/unit), "Log a Sale" CTA.

**06 — Log a Sale**
Rendered as a bottom sheet over a dimmed Batch Detail, not a standalone screen — selling only happens from a specific batch. Quantity + unit price, Retail/Distributor toggle, optional buyer name, live total and "N units will remain" note.

**22 — All Batches**
Reached from Production's "View all". Status filter (All/Curing/Ready/Sold Out) plus the full batch history beyond what's shown inline on Production.

### 3.2 Materials

**04 — Materials**
Tab. Live count + low-stock summary in the header, material rows show cost/unit, current stock, and reorder point, with low-stock ones flagged.

**07 — Edit Material / Add Material**
One screen serves both flows. Name, unit, cost/unit, stock, reorder point, supplier — all real editable inputs. "Used in" section lists which products draw on this material (materials are shared across recipes). Delete action.

### 3.3 Products & Recipes

**08 — Products & Recipes**
Reached from More. Lists each product line with category and NAFDAC status at a glance (color-coded: registered / in process / not registered).

**09 — Product Detail**
Standard batch size + target yield, a dedicated NAFDAC section (status + optional registration number — both non-blocking, buried here per the brief), and the Recipe (BOM): materials + quantity per standard batch, editable.

### 3.4 Reports

**10 — Reports**
Filter by period and product. P&L overview (revenue, costs, profit, margin), a 6-month trend chart, and a by-product profit breakdown.

**10b — Reports (loss-state reference)**
Same screen with a loss period selected, included specifically to specify the negative-number treatment: "Profit" relabels to "Loss", figures turn danger red. See §5.5.

### 3.5 More / Settings

**05 — More**
Tab. Grouped menu: Products & Recipes and Reports under "Business", Settings under "App".

**11 — Settings**
Grouped menu: Business Profile; Sync & Offline Data and Notifications under "Data & Sync"; Account; Help & Support and About under "Support"; Sign Out at the bottom.

**12 — Business Profile**
Business name, phone, address, currency. Name/phone/address are empty by default (placeholder text) — no brand identity has been decided, so nothing is pre-filled with an invented business name.

**13 — Sync & Offline Data**
Status card (items waiting to sync + last-synced time + manual Sync Now), a pending-items list showing what's queued offline, and a plain-language explainer that nothing is lost while offline.

**14 — Notifications**
Toggle list: low-stock alerts, batch-ready alerts, daily summary, sync-issue alerts.

**15 — Account**
Email and Change Password are tap-through rows (not inline-editable — credential changes need their own verification flow), plus Delete Account.

**16 — Delete Account**
Confirmation screen for account deletion. Because this is a single-user account with no other members, deletion wipes all business data — the screen states this plainly, lists concrete counts of what will be lost, and requires typing "DELETE" to confirm.

**17 — Help & Support**
Contact options (email, WhatsApp), an FAQ accordion (one item shown expanded to demonstrate the interaction), and a link to Send Feedback.

**18 — Send Feedback**
Feedback type (bug / idea / general), message, optional email.

**19 — About**
App name, version, Terms/Privacy links.

**20 — Change Email**
Current email (read-only), new email, password confirmation, verification-sent messaging.

**21 — Change Password**
Current/new/confirm password fields with a requirements hint.

---

## 4. Design System

No final brand identity has been supplied — every color below is a functional wireframe choice (chosen for clarity and to demonstrate patterns), not an approved brand palette. Treat hex values as placeholders unless told otherwise.

### 4.1 Color

| Token | Hex | Usage |
|---|---|---|
| Primary teal | `#0F766E` | Primary CTAs, sync indicator, active nav/tab state |
| Text — primary | `#171717` | Headings, primary body text |
| Text — secondary | `#777772` | Labels, captions, secondary text |
| Border | `#E2E2DF` | Card and input borders |
| Surface | `#FFFFFF` on `#F7F7F5` | Cards on screen background |
| Input fill | `#F8F8F6` | Editable field background (see §5.1) |
| Danger red | `#B3261E` | Destructive actions, loss figures (see §5.4, §5.5) |

### 4.2 Status pills

| Status | Background | Text |
|---|---|---|
| Ready / Registered | `#E8EEE7` | `#4D624D` |
| Curing / In process | `#F0ECE3` | `#665E4B` |
| Sold Out / Not registered | `#ECECE9` | `#666662` |

The same 3-tone system covers two different fields — batch status and NAFDAC registration status — since both are a 3-state "done / in progress / not started" shape.

### 4.3 Typography

| Role | Size / Weight |
|---|---|
| Page header | 24 / Semibold (600) |
| Section heading | 16 / Semibold |
| Card / item title | 14 / Semibold |
| Body / secondary | 12 / Regular |
| Uppercase field label | 10 / Semibold |

Font sizes are even numbers only (8/10/12/14/16/18/24) — a deliberate constraint, not a technical limit. Keep it if extending the file.

### 4.4 Spacing & shape

- Screen margin: 20px both sides
- Card-to-card gap: 12px; section-to-section gap: ~20–32px
- Corner radius: 14 for cards/buttons, 10 for nested inputs/chips, 16 for pills, 18 for the outer screen frame
- Mobile frame: 390×844 (iPhone-class viewport)

---

## 5. Key Interaction Patterns

### 5.1 Editable vs. read-only
Every editable value sits inside a distinct boxed input (fill `#F8F8F6`, border `#E2E2DF`, radius 10) with its label above it. Plain text with no box is reserved for genuinely read-only data — e.g. Batch Detail's cost summary, or the "Planned" column in Log a Batch sitting next to the editable "Actual" column. This distinction is used deliberately to signal which numbers the user can change and which are fixed reference data — please preserve it in the build rather than treating all fields as visually equivalent.

### 5.2 Planned vs. Actual (Log a Batch)
The system already knows the recipe once a product is picked — she's confirming reality, not re-entering data. Planned (from the recipe) and Actual (what she really used) are shown side by side and stay visually distinct; the gap between them is real production data worth surfacing, not something to collapse away for simplicity.

### 5.3 Destructive actions
Delete/remove actions use danger red (`#B3261E`) for both icon and label. Signing out is not treated as destructive (neutral gray) — only actions that lose data get red. Delete Account goes further: full-screen confirmation, concrete counts of what's lost, and a type-to-confirm input, because it's an irreversible, total-data-loss action for a single-user account.

### 5.4 Navigation arrows
A trailing arrow icon on a button means it navigates to a new screen or sheet (e.g. "Log a Batch", "Log a Sale"). Save/submit buttons that persist data without navigating anywhere ("Save Material", "Update Password", etc.) have no arrow and centered text. Please keep this distinction when adding new buttons — it's a deliberate signal, not an inconsistency.

### 5.5 Profit vs. loss (Reports)
When a reporting period is negative, "Profit" relabels to "Loss" and the figure + margin turn danger red instead of teal — see screen 10b for the exact reference state. The trend chart itself shows loss periods as red bars below a zero baseline, profit periods as teal bars above it.

### 5.6 Toggles & accordions
- Toggle switches (Notifications): teal + knob-right = on, gray + knob-left = off.
- FAQ accordion (Help & Support): one item shown expanded (teal border, chevron-up, answer visible) among collapsed ones (chevron-down) to specify both states in one place.

### 5.7 Offline & sync
A small sync-status badge (dot + "Synced"/pending label) appears in the header of nearly every screen — the one deliberate exception is Delete Account, where a sync indicator would read as tonally wrong next to an irreversible-deletion warning. The Sync & Offline Data screen (§3.5) is where the fuller picture — pending items, manual sync, and an explanation of what offline mode does — lives.

---

## 6. Data Model Reference

As specified in the original planning brief — included here so screen fields can be traced back to real entities.

**Materials** — name · unit (g/ml/kg/l) · cost per unit · current stock · reorder point · supplier

**Products (Recipes)** — name · category (soap / cosmetic / cleaning agent) · standard batch size · target yield (units) · NAFDAC status (not registered / in process / registered) · NAFDAC reg. no. (optional)

**Recipe Items (BOM)** — per product: which materials + quantity per standard batch

**Batches** — batch number (auto-generated, format `PRODCODE-YYMMDD-NN`) · product · date made · cure/ready date (soap only) · planned yield · actual yield · loss quantity + reason · labour cost · status (curing / ready / selling / sold out)

**Batch Materials Used** — materials actually consumed for a batch, pre-filled from the recipe, editable

**Sales** — batch · date · quantity sold · unit price · buyer type (retail / distributor) · buyer name (optional)

Materials are shared across product lines — one stock count can feed multiple recipes. Low-stock warnings and reports are product-aware because of this: a shortage should name which products it affects, not just flag the material in isolation.

---

## 7. Notable Decisions

*(Context that isn't obvious from the screens alone.)*

- NAFDAC fields are present but deliberately buried in Product Detail, not the daily production flow — she isn't registered yet and the app must work fully regardless.
- Low-stock alerts and reports are product-aware by design ("Shea butter low — affects Body Cream, Soap Bar A"), not generic per-material flags.
- Single user, no roles/permissions in v1 — Account screen is intentionally minimal.
- WhatsApp is included as a support contact channel alongside email — a deliberate localization choice for a Nigerian small business, consistent with the ₦ (Naira) currency used throughout.
- "Production Log" is used as the placeholder app name (About screen) — taken from the project's own working title, not an invented brand name. Replace once branding is decided.
- The Save-button component's arrow was removed after review specifically because it implied navigation that doesn't happen — a reminder that arrow-on-button is a meaningful signal in this system, not decoration.

---

## 8. Out of Scope / Not Wireframed

These were deliberately left unbuilt as reasonable scope boundaries for a wireframe pass — not oversights:

- **Terms of Service / Privacy Policy** — standard legal text pages; content and layout don't need design input.
- **Email Support / WhatsApp rows** (Help & Support) — these hand off to external apps (mail client, WhatsApp) rather than opening an in-app screen.
- **Exact NAFDAC registration workflow / integration** — only the status field and optional reg. number are represented; the registration process itself is external to this app.
- **Exact report types beyond profit/loss by date/product** — flagged as an open item in the original brief; Reports (§3.4) covers the confirmed minimum.
- **Final visual/brand identity** — every color, icon, and the "Production Log" name are functional wireframe choices pending brand decisions.

---

## 9. Penpot File Reference

- Boards are named to match this document exactly, e.g. "03 — Batch Detail" — search by number or name in Penpot's layers panel.
- Screens are laid out in 3 horizontal rows (wrapped for easier browsing), left to right, roughly in build order — not meaningful for implementation, just navigation.
- 5 shared components live in the file's local library — instantiate these rather than rebuilding them if extending the file: **Sync status badge**, **Bottom nav**, **Add button**, **Delete link**, **Save button**.
- Mock data recurs deliberately across screens (Body Cream / BC-260813-01, the same 5 materials, the same 3 products) so the flows read as one coherent business rather than disconnected examples — useful for spotting whether a new screen's data lines up with the rest.
