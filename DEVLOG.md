# Business Log App — Dev Log

Day-by-day record of what got built, what broke, and what was learned while
building the Business Log app (production-tracking PWA for cosmetics/soap
makers — see [Production-Log-App-Handoff.md](Production-Log-App-Handoff.md)
for the full spec). Doubles as raw material for social posts — each entry
ends with a **Social angle** line you can lift straight from.

**Convention:** newest day at the top. New entry template:

```md
## YYYY-MM-DD — <one-line theme>
**Progress:**
- ...

**Encountered:**
- ...

**Social angle:** <one caption-ready line>
```

> First four entries below (Aug 13–19) were reconstructed on 2026-08-19
> directly from the session transcripts (timestamps, not guesswork) since
> the log didn't exist yet. No work happened Aug 15, 16, or 18 — real gaps,
> not missing entries.

---

> **Correction (2026-08-22):** the entry originally posted here as a single
> "2026-08-20" day actually spanned two real calendar days with a gap in
> between — the underlying session ran 10:01→16:14 on the 20th, went quiet,
> then resumed 09:13 on the 22nd (Aug 21 was another skipped day, same
> pattern as before). Caught because in-app content generated that day —
> a downloaded export file literally named `batchkeeper-export-2026-08-22.json`,
> a test batch numbered `TEST SOAP-260822-01` — didn't match the session
> log's date. Split into the two correct entries below by reading the
> actual message timestamps rather than trusting either the session log or
> app-generated content alone.

## 2026-08-22 — Real bugs from a real audit: broken date fields, drifting costs, a security gap
**Progress:**
- Ran the **real end-to-end test** of the email-confirmation and
  password-reset links for the first time — actual emails, actual clicks,
  on a real phone, not simulated. That test directly surfaced two UX gaps
  the user caught in the moment: password requirements only validated
  *after* hitting submit, and no field had a show/hide toggle. Both fixed
  app-wide same day — a live requirements checklist that updates on every
  keystroke, plus a per-field show/hide toggle across Sign Up, Change
  Password, and Reset Password (which also caught and fixed an
  inconsistency: Sign Up previously required fewer password rules than
  the other two screens).
- Pushed back on "get this legally reviewed" being a dead end just because
  there's no lawyer on hand — did real research instead. Read up on
  Nigeria's Data Protection Act (NDPA 2023) and wrote grounded, sourced
  content into the Privacy Policy and Terms of Service: a stated data
  retention period, enumerated user rights (access/correct/erase/withdraw
  consent/receive a copy/complain to the NDPC), a cross-border data
  disclosure (Supabase/Vercel aren't Nigeria-hosted), a governing-law
  clause, a bounded liability clause, and an IP clause protecting the
  Batchkeeper name.
- Built a **data export feature** from scratch and iterated on it live
  through three formats in one sitting, each swap driven directly by the
  user actually trying the previous one: raw JSON → a self-contained HTML
  report (real product/batch/material names instead of raw IDs) → a real
  Excel `.xlsx` workbook (5 sheets, sortable/filterable) once the user
  pointed out a non-technical person can't make sense of a `.json` file.
- Added confirmation dialogs (neutral teal, not the red used for deletes)
  for **Sign Out** and **Export My Data** after the user flagged both as
  firing with no confirmation.
- Ran the **wireframe-vs-build comparison audit** — a separate concurrent
  session asked to check every real screen against the original Penpot
  designs (and, for the screens built directly in code with no Penpot
  design at all, judge them on their own merits) and write findings into
  a shared comparison doc. Took a live review pass against the running
  app too, not just static comparison, after being told the first pass
  "didn't actually do what was asked." Confirmed one flagged item wasn't
  a bug at all — the single remaining Notifications toggle (Low Stock
  Alerts only) was a deliberate choice, not an oversight. By early
  afternoon, every real bug the audit turned up was confirmed fixed.
- Off the back of that audit, closed the loop the other direction too:
  went back into Penpot and designed every screen that had been built
  straight in code without ever having a wireframe, so the design file
  now actually reflects the real app instead of stopping at the original
  23 screens. **Done and verified.** 13 new screens: the 3 onboarding
  slides, Sign Up, Sign In, Forgot Password, Reset Password, Email
  Confirmed, Business Setup, Add Stock, FAQ, Privacy Policy, and Terms of
  Service — plus the existing Settings board retrofitted in place with
  the "Businesses" switcher section (Add button + active/inactive
  business rows) sitting above Business Profile, matching the real
  multi-business feature from the 19th that never made it back into the
  design file until now.
- Cleaned up every leftover test account and business from the day's
  testing, leaving only the real account.
- Deployed to `batchkeeper.vercel.app` repeatedly through the day as each
  fix landed.

**Encountered:**
- The comparison audit flagged that `expiryDate` had no real input path
  anywhere in the app. Checking it turned up a **worse, related bug the
  audit missed**: `cureReadyDate` had the identical problem — and that's
  the exact field the "Mark as Ready" reminder text is built around, so
  that reminder could never show a real date for any batch logged through
  the actual app. Both fixed, and verified live end-to-end with a real
  test batch (auto-suggested ready date, manually set expiry date, both
  saved and displayed correctly).
- Reports were **silently drifting**: a batch's material cost was computed
  from the material's *current* price, not the price at the time the
  batch was actually made — so a batch's cost figure would quietly change
  every time that material got restocked at a new price. Fixed with a
  real frozen-cost snapshot taken at the moment a batch is logged, and
  proved live: restocked a material at a higher price, confirmed the
  already-logged batch's cost stayed frozen at the old price.
- A genuinely serious one, found during the same audit pass: **Reset
  Password could be reached by any already-logged-in session directly**,
  not only via a real emailed recovery link — meaning the reset form's
  no-current-password-required flow was an accidental second way to
  change an account's password, bypassing Change Password's
  re-authentication requirement entirely. Fixed by gating on Supabase's
  actual `PASSWORD_RECOVERY` auth event; verified live that visiting the
  route while normally signed in now correctly shows "Link expired."
- Three missing empty states (Production's recent batches, the Products
  list, Reports' by-product breakdown) — real, but low-stakes.
- The `xlsx` library (used for the Excel export) had a flagged
  high-severity npm vulnerability with "no fix available." Investigated
  rather than shrugging it off — the exploit path is *reading* untrusted
  files, and this feature only ever *writes*, so it was already safe in
  practice, but pulled SheetJS's own properly-patched build from their CDN
  anyway for real defense-in-depth. Also caught that the PWA's service
  worker would've silently precached the ~490KB library for every install
  even though most users would never click Export — excluded it so it
  only loads on demand.
- A worthwhile correction from the user: the app's even-numbers-only font
  scale had been logged earlier as a possible design inconsistency —
  turned out it was the user's own deliberate call from day one, not a
  gap. Recorded as intentional now, won't be re-flagged.

**Social angle:** One audit pass, three real bugs closed same day — a
security hole in password reset, a cost figure that was quietly drifting
every time you restocked, and a date field that never actually saved
anything since the app was built. That's the kind of thing a demo never
shows you.

---

## 2026-08-20 — Renamed to Batchkeeper and went live
**Progress:**
- **Late-night tail from the 19th (00:45–02:50):** expanded the FAQ from 3
  to 13 questions aimed at what a non-technical shop owner actually gets
  stuck on (what "waiting to sync" means, what Curing/Ready/Selling/Sold
  Out mean, whether a NAFDAC number is required). Ran a genuine mechanical
  audit — grepped every `handleSubmit`/`onClick` in `src/screens` for
  forms that render fine but never call anything real — instead of
  spot-checking, after being called out for claiming an earlier "full
  audit" that wasn't. Built real Privacy Policy and Terms of Service
  in-app screens to replace two dead `href="#"` links left since the
  wireframe phase.
- **The app got a real name: Batchkeeper.** "Production Log" was always a
  placeholder. Searched and ruled out several names that were already
  taken or actively conflicting (a "-wise" suffix lane turned out
  saturated — Wise is a whole fintech; "Stockcraft" turned out to be a
  real competing app). Landed on Batchkeeper with a teal book-mark icon,
  renamed across the manifest, tab title, sign-in screen, About screen,
  and feedback email subject — then, fresh in a new session that same
  morning, reconsidered the icon again as not matching what the app is
  for and picked a different option.
- Fixed a real bug: Delete Account wasn't showing up in its own list.
  Decided against auto-opening a parallel session to fix a related
  `needsBusinessSetup` timing issue and built a manual repair button
  instead, after asking to actually understand the tradeoff first.
  Cleaned up the Notifications screen — removed toggles for alerts that
  don't send anything yet (only Low Stock Alerts is real).
- Ran a full **silent-no-op sweep** — the same "does this actually call
  something real" grep audit as before, applied across the rest of the
  app — and deployed.
- Renamed the exposed access link to the real product name instead of an
  autogenerated one, applied input-type restrictions across form fields,
  added more coach-mark hints on first-time page visits, and did a
  security pass (reviewed session-token storage, discussed the tradeoffs
  of moving off `localStorage`).
- Enabled Supabase's email confirmation requirement (previously off, for
  faster testing).
- Cleaned up test data and an oversized JS chunk, including a SQL script
  to remove all test data in one pass.
- Fixed the **Log a Batch flow's undocumented prerequisites** and removed
  remaining client-facing em dashes.
- Fixed both **auth-redirect links pointing at `localhost`** instead of
  the deployed app — email confirmation and password-reset links were
  technically working but landed on a broken "this site can't be reached"
  page instead of the real app.
- **Deployed live for the first time** — `batchkeeper.vercel.app`.
- Looked into custom SMTP to raise Supabase's low default email rate
  limit; blocked on not owning a domain yet, so deferred and logged as a
  follow-up rather than worked around.

**Encountered:**
- The silent-no-op sweep found three forms that looked wired but weren't:
  **Change Password**, **Change Email**, and **Send Feedback** all
  rendered fine and "succeeded" without ever calling anything real.
- A pluralization bug ("1 materials") showing up on the Materials screen
  and in Delete Account's summary.
- **A real self-inflicted time sink**: burned roughly an hour and 98k
  tokens building a PNG-rasterization pipeline for the new app icon when
  the existing SVG setup already covered it — called out directly by the
  user, stopped mid-detour, and fixed in one line once actually scoped.
  Worth remembering: check scope before building infrastructure for what
  turns out to be a one-file swap.

**Social angle:** The app finally has a name — and by the end of the same
day it was live at batchkeeper.vercel.app. Naming day and launch day, same
day.

---

## 2026-08-19 — Multi-business, offline resilience, and starting this log
**Progress:**
- Finished polishing the onboarding illustrations (fixed a missing leg,
  recolored the trouser/legs, centered the illustration + text block
  vertically) and signed off on all three onboarding pages as consistent.
- A simple question — "what does Business Profile actually *do*?" — turned
  up a real gap (name/phone/address weren't used anywhere, currency wasn't
  even wired in) and reshaped the day: business setup moved from a Settings
  afterthought into the signup flow itself, and **multi-business support**
  (one login owning several businesses) got built *now* rather than
  deferred, since there was no real user data yet to migrate.
- New `BusinessSetup` screen, `businesses.id` decoupled from `auth.uid()`,
  every RLS policy rewritten to an ownership subquery, new `addBusiness`
  and `switchBusiness` store actions, a business switcher in Settings.
- Fixed currency formatting (was hardcoded to ₦ regardless of the business's
  actual currency) and added GBP/EUR to the picker (5 currencies total).
- Added real `online`/`offline` browser-event listeners so the sync badge
  updates the instant connectivity changes, not just on the next edit —
  plus a brief toast both ways ("You're offline…" / "Back online…").
- Set up this dev log.

**Encountered:**
- While fixing currency, found a genuinely deeper bug: every `update*`
  store action (business/material/product/batch/notification settings) was
  upserting only the *changed* fields. Postgres validates NOT NULL/RLS
  against the full proposed row *before* resolving the upsert conflict, so
  a partial payload missing a required column could fail outright even
  though the row already existed. Fixed by merging with the existing row
  before every upsert.
- Verified offline write-resilience properly for the first time (previous
  sessions never actually simulated a disconnect) — intercepted `fetch`
  calls to Supabase, created a material while "offline," confirmed it
  queued locally and auto-flushed on reconnect, then checked the database
  directly to be sure. A raw `offline` event dispatch turned out to also
  trip Vite's own dev-server HMR reconnect logic — a dev-mode-only red
  herring, not an app bug.

**Social angle:** "One login, many businesses" shipped the same day someone
asked what the Business Profile screen was even for — sometimes the best
features come from a user just poking at something that looks unfinished.

---

## 2026-08-17 — Wireframe closes out, real app build begins (biggest day yet)
**Progress:**
- Resumed the wireframe after the weekend gap, ran the full visual review
  pass across all 23 Penpot screens, and wrote the developer handoff doc.
- Talked through a sharp list of gaps the user raised (restocking
  materials, missing auth screens, no empty states, no batch expiry
  field) — all four got agreed as real, would-block-use issues.
- Then: **"We'll start with the building now."** Scaffolded the real app —
  React + Vite + TypeScript + Tailwind v4 + React Router + Zustand + PWA —
  and by the end of the day had built and wired **all 23 wireframe screens
  plus the 3 new auth screens**, type-checked, linted, and built clean.
- Fixed a buggy Notifications toggle, a batch-size alignment issue (caught
  via an annotated screenshot), a missing delete-product confirmation
  dialog, and swapped "BOM" jargon + em dashes out of client-facing copy.
- Wired up the real Supabase backend end-to-end (schema, RLS, auth) —
  verified signing in and logging a real sale, with Reports P&L
  recomputing live.
- Designed and iterated on the app's onboarding illustrations
  (undraw.co-style), with several rounds of feedback on pose/transparency.

**Encountered:**
- A scare mid-review: 12 of 23 Penpot screens appeared to vanish. Confirmed
  twice it was real, not a stale read — turned out to be an over-extended
  **undo** in Penpot itself; a redo brought everything back intact.
- The Delete Account confirmation textbox came pre-filled with the word
  "DELETE" — defeats the entire point of a type-to-confirm safety check.
- RLS policies alone weren't enough to unblock Supabase writes — needed an
  explicit table-level `GRANT` too; PostgREST checks that before RLS ever
  runs.
- React 18 StrictMode double-invoked the auth-listener setup effect,
  causing duplicate data loads — fixed with a module-level guard flag
  instead of store state.
- `.single()` on a just-signed-up user's business row threw a loud 406 for
  the completely normal "trigger hasn't landed yet" case — switched to
  `.maybeSingle()`.

**Social angle:** Wireframe to a fully wired, working, Supabase-backed app —
in one day. That's the kind of before/after a build-in-public post is made
for.

---

## 2026-08-14 — The whole wireframe, almost
**Progress:**
- The marathon day: built the bulk of the entire 23-screen Penpot
  wireframe in a single session — Materials tab, More tab, Add/Edit
  Material, Products & Recipes list, Product/Recipe detail (BOM + NAFDAC
  fields), Reports (including a dedicated loss-state reference screen),
  Settings, and all six Settings sub-screens (Business Profile, Sync &
  Offline Data, Notifications, Account, Help & Support, About) plus Change
  Email, Change Password, and All Batches.
- Locked in two lasting design rules that held for the rest of the build:
  font sizes must be even multiples of 2px, and every container must be a
  real frame, never a background rectangle.
- Turned Save button, Add button, and Delete link into reusable components
  after noticing they were being hand-aligned the same way repeatedly.
- Established destructive-red for delete actions, and the boxed/tinted
  visual treatment that distinguishes editable fields from read-only ones.

**Encountered:**
- Font weight was wrong (extra-light) across a finished screen — caught by
  the user, not self-caught.
- Editable fields on Add/Edit Material looked identical to read-only
  display cards — no visual cue they were tappable inputs. Same gap found
  lurking on Log a Batch and Log a Sale once flagged once.
- Text-character arrows ("→" as literal glyphs) were being used instead of
  real chevron/arrow icon instances — swept and replaced everywhere.
- Reports originally only showed the "always profitable" happy path — user
  asked directly whether losses were considered; they weren't yet.
- Save-type buttons had arrows implying navigation when they just persist
  data and stay put — fixed at the component level once flagged.

**Social angle:** Two rules — "even font sizes only" and "frames, not
rectangles" — set in the first hour of the day, then held for the rest of
a 23-screen build without a single exception. Small constraints, real
consistency payoff.

---

## 2026-08-13 — Wireframe kickoff
**Progress:**
- Started the Penpot wireframe from the handoff doc: built the Production
  tab (home screen) and began Batch Detail.
- Turned the sync status badge into a reusable component early, since it
  was clearly going to repeat across every screen.

**Encountered:**
- Nothing notable yet — first session, mostly setup and establishing the
  starting screens.

**Social angle:** Day one of building a production tracker for a cosmetics
business, starting exactly where you'd expect: the home screen and the
"is my data synced" badge.
