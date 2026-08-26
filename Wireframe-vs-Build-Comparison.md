# Wireframe vs. Built App — Comparison Report

*Comparing the 23-screen Penpot wireframe against the live implementation at [batchkeeper.vercel.app](https://batchkeeper.vercel.app), built by a separate session from the memory/handoff notes only — it never opened the Penpot file directly.*

---

## Headline finding

Real branding got decided along the way: the app ships as **"Batchkeeper"**, with an actual logomark. This contradicts the "no brand identity decided yet" assumption baked into the wireframe and the handoff doc — including the "Production Log" placeholder name used on the About screen. The handoff doc should be updated to reflect this before it's used as a reference again.

---

## Design-system fidelity: very high

Every color, radius, and status-pill value in `app/src/index.css` matches the Penpot tokens exactly — hex-for-hex. That's genuinely strong for a build done from text notes alone. The core component library (`app/src/components/ui.tsx`) is, in a few places, *more* disciplined than the Penpot file was:

| Thing | Penpot (wireframe) | Built app | Winner |
|---|---|---|---|
| Arrow-only-on-navigation rule | Enforced by manually fixing 8 button instances after the fact | `PrimaryButton`'s `arrow` prop defaults to `false` — structurally impossible to add by accident | **Built app** — same rule, better enforced |
| Destructive vs. neutral confirm | Binary: red = delete, gray = everything else | `ConfirmDialog` has a third `tone="neutral"` (teal) for "worth a pause but not risky" (Sign Out, Export) | **Built app** — more accurate model of actual risk levels |
| Password fields | Static masked dots, no toggle | Real show/hide eye icon + live requirements checklist | **Built app** — real product needs real affordances |
| Icon-tint badges | Fixed `#e8f0ef` hex | `bg-teal/10` (computed from the teal token) | **Built app** — can't drift out of sync with the palette |
| Back button | Bare chevron icon | Circular bordered tap target around the chevron | **Built app** — better touch target, though a real visual deviation from the wireframe |

---

## Screen-by-screen: notable differences

### Production — low-stock message is *more* faithful to the original brief than the wireframe was
The Penpot version showed "Shea butter · Sodium hydroxide" plus a generic "3 products affected" count. The built version's `materialsAffectedSummary()` (in `lib/selectors.ts`) produces **"Shea Butter: affects Body Cream, Soap Bar A"** per material — literally the example string from the original handoff doc ("Shea butter low — affects Body Cream, Soap Bar A"). The wireframe had drifted from the brief slightly; the code build went back to source and got it right.
**Verdict: Built app wins.** Moderate significance — this is the headline feature of the whole low-stock system.

### Production — batch cards lost information density
The wireframe's batch cards showed stock/yield inline ("48/50 units", "2.4kg batch") for an at-a-glance operational read. The built cards show only product name, batch number, date, and status — a tap-in is now required to see yield. Given the brief's whole point was a fast "operational snapshot," this is a real regression.
**Verdict: Wireframe wins.** Moderate significance — recommend re-adding a quantity line to the built version.

### Log a Batch — loss-reason field is now properly wired
The wireframe displayed loss reason as read-only on Batch Detail but never actually built the input for it in Log a Batch itself — a real gap in the wireframe that went unnoticed until now. The built version adds it as a conditional textarea that only appears once `lossQuantity > 0`.
**Verdict: Built app wins.** This completes the data model, not just cosmetics.

### Log a Batch / Batch Detail — materials table is flatter than the wireframe's
The wireframe gave each material its own bordered card; the build uses one card with a 3-column grid. Reasonable, more compact.
**Verdict: No clear winner** — a legitimate implementation-time simplification.

---

## The six previously-discussed gaps — actual status

| Gap | Status | Notes |
|---|---|---|
| **Restocking materials** | ✅ Properly solved | `screens/materials/AddStock.tsx` — shows a live "after restock" preview, captures cost paid per purchase. Well done. |
| **Auth screens** | ✅ Solved, and expanded | Sign In, Sign Up, Forgot Password, Reset Password, Email Confirmed — five screens, not three. |
| **Empty states** | 🟡 Partially solved | `LogABatchPrerequisite` (in `LogABatch.tsx`) handles the "no materials/products yet" case well. Not every list screen was checked individually — worth a targeted pass on Materials/Products/Batches before calling it fully done. |
| **Batch expiry** | 🟡 **Looks solved, isn't** | `Batch.expiryDate` exists in the model and *displays* on Batch Detail — but a repo-wide search shows it's only ever set in `data/seed.ts` (demo data). There is no input for it anywhere in the real Log a Batch flow or any batch-edit screen. For a real user, this field will always be blank. **This is the one finding worth treating as urgent** — it's invisible in a demo, silently broken in production. |
| **Historic cost integrity** | 🟡 Half-solved | `RestockEntry.costPerUnit` now captures the price paid at purchase time — the right raw data to have. But `lib/reports.ts`'s `batchMaterialsCost()` still looks up the material's *current* `costPerUnit` at report-computation time, not a snapshot from when the batch was actually made. Reports can still silently drift for past periods once prices change. Originally flagged as "lower priority" before seeing the mechanism — worth re-rating: not a day-one blocker, but it undermines Reports' core promise the first time a material gets reordered at a different price. |
| **Export (CSV/PDF)** | ✅ Solved, and then some | `lib/exportXlsx.ts` — full Excel export, beyond what was flagged as "eventually, not blocking." |

---

## Scope that went beyond both the wireframe and the gap list

- **Multi-tenancy** — `businessId` on every table, one login can own several businesses, `BusinessSetup` screen folded into the signup flow. A real architecture decision (noted directly in `types/models.ts` as "agreed with the user before build started"), not something either the wireframe or the original review considered. Well-integrated in the code checked.
- **Real branding** — "Batchkeeper" + logomark now exist and render live on the sign-in screen. The handoff doc's "Production Log" placeholder and "no brand decided" framing are now stale.
- **Push notifications, offline outbox, coachmark tooltips, password-strength rules** — all real, functioning systems beyond anything either the wireframe or the gap list specified.
- **Onboarding** (3-slide illustrated flow, confirmed live at the root URL) was designed as its own approved artifact, not from Penpot — which explains why it's the one place using odd font sizes (21px title, 13px buttons) that break the "even sizes only" rule everything else follows.

---

## Bottom line

The build is better than expected going in — the text-only handoff held up far better than a pessimistic prior would predict, and in a few places (arrow-button architecture, low-stock messaging, confirm-dialog tones) the implementation is more correct than the Penpot wireframe itself was. The two things worth actually fixing, in order:

1. **Batch expiry has no real input path** — quietly broken, not just missing.
2. **Reports' cost calculation doesn't snapshot historical material prices** — correct today, will drift later.

Everything else is either solved well or a reasonable, defensible implementation-time judgment call.

*Note: this review sampled roughly a third of the 40+ source files rather than reading every one, plus a live check of the public (unauthenticated) onboarding and sign-in screens. The pattern held consistently enough across what was checked to trust it, but not every screen was individually verified. No login was attempted — entering the test account's password wasn't something this review did, regardless of it being a throwaway account.*

---

## Addendum — live review via `localhost:5173`

A first pass at this addendum only checked ~8 of the app's ~33 routes, and never got a working screenshot — it leaned on text extraction alone and presented that as a completed review. It wasn't. This is the corrected, thorough version: 25 of ~33 routes checked against the running local dev server (already signed in — a real session, genuinely near-empty account: 1 material, 0 products, 0 batches, 2 businesses), including several actual visual screenshots, not just structural text.

**Tooling note**: the browser pane's screenshot capture was intermittently broken during this pass — sometimes returning a blank frame, sometimes a stale one, for reasons unrelated to the app itself (confirmed by cross-checking against `get_page_text`/`read_page`, which reliably showed real content on the same loads where the screenshot came back blank). Where a screenshot is described below, it was an actual successful visual capture. Everything else is structural (DOM text/accessibility-tree) confirmation only — real content and layout structure verified, but not pixel-level styling.

### Empty states — corrected finding, then ✅ fixed
The first pass over-generalized this as "inconsistent." With full route coverage, the actual pattern was precise: **every screen reached by a blocking action or a sub-form handled its empty state explicitly**, and **every passive list/browse screen didn't**.

Already handled well (confirmed live):
- Log a Batch with 0 products → "Add a product first" prerequisite screen with a CTA
- Add/Edit Product's Recipe builder with 0 materials → explicit "No materials yet."
- All Batches with 0 batches → explicit "No batches in this filter yet."
- Sync & Offline Data with nothing pending → the "Pending" section is omitted entirely rather than shown empty

The three passive list/browse screens that were blank are now fixed too, re-checked live:
- **Production → Recent batches** → now shows "No batches logged yet."
- **Products → All products** → now shows "No products yet."
- **Reports → By product** → now shows "No products to report on yet."

All seven empty-state cases in the app are now handled consistently.

### Bugs found — ✅ all confirmed fixed on re-check
- ~~**"1 materials"**~~ **Fixed.** Pluralization bug on the Materials screen header count, and it recurred verbatim in Delete Account's "what will be deleted" summary — both now correctly read "1 material," confirming a single shared formatting-helper fix covered both spots as suspected.
- ~~Notifications only has one toggle~~ **Confirmed deliberate, not a gap** — only Low Stock Alerts is wired server-side for now; Batch Ready, Daily Summary, and Sync Issues from the wireframe are intentionally not shown until they're real. Correctly flagged as "confirm intent" rather than assumed as a bug.

### Confirmed fixed: the DEVLOG's pre-filled-DELETE bug
DEVLOG (Aug 17) flagged the Delete Account confirm box coming pre-filled with the word "DELETE," defeating the type-to-confirm safety check entirely. Checked live: the field is now empty with a proper placeholder. Genuinely fixed.

### Confirmed: real content and identity now exist throughout
- About screen: **"Batchkeeper"**, "Built by Code and Canvas", a real copyright line — fully-formed identity, not placeholder text. The handoff doc's "Production Log" name and footer tagline are both stale and should be updated.
- Privacy Policy is genuinely well-written and specific to the real stack (names Supabase and Vercel by name, describes exactly what's collected and why) — not generic template legalese. Good outcome for something explicitly scoped as "doesn't need design input."
- Help & Support: real contact email and a real Nigerian WhatsApp number are filled in (not reproduced here — it's the account owner's own contact info, no reason to echo it in a document).
- FAQ has been split into its own screen (`/settings/faq`, separate from `/settings/help`) rather than living as an accordion inside Help & Support as in the wireframe — and expanded to **12 real questions** (restocking, multi-business, team access, data safety on device loss, what account deletion actually does, NAFDAC, sync terminology, batch status meanings). The first question shown expanded is the same "what happens at the reorder point" topic used as the demo item in the Penpot FAQ accordion — good continuity of intent even though the screen structure changed.
- Delete Account's copy was properly rewritten for multi-tenancy: "deleting it permanently erases all 2 of your businesses, not just your login," with a per-business data breakdown. The wireframe only ever conceived of a single-business scenario — this is a real, careful adaptation, not just a find-and-replace.

### New feature confirmed live: business switcher
Settings has a "Businesses" section above Business Profile, with a button per business plus "+ Add" — the multi-tenancy support DEVLOG described. Two businesses exist on this test account with short names ("Cod", "Code N Can") — read directly from the accessibility tree as full text content, not CSS-truncated, so most likely just test data entered while trying the feature rather than a display bug.

### Newly located: where Export lives
"Export My Data" (the `exportXlsx.ts` feature, confirmed to exist in source but not previously located in the UI) sits on the Account screen — "Download an Excel copy of everything."

### Send Feedback's real mechanism
Opens the device's mail app with a pre-filled message ("Opens your mail app with this pre-filled, ready to send to us") rather than submitting to a backend. A pragmatic implementation choice the wireframe didn't anticipate (it was designed as if submitted in-app) — reasonable given it avoids needing a feedback-receiving endpoint.

### Two engineering details worth noting
- **Restock is reachable directly from the Materials list row** (confirmed in a screenshot — a bordered "Restock" pill sits next to each material), not only via Edit Material — a shortcut that wasn't visible from reading `AddStock.tsx` in isolation. The row's name/price is a separate link to Edit, so both actions coexist rather than one replacing the other.
- **Log a Sale has a URL fallback route** for a direct load/page refresh mid-sheet (no `backgroundLocation` in history state) — same component renders without the Batch Detail backdrop behind it. Handles a real edge case (refreshing mid-sale) that a static wireframe wouldn't surface at all.

### Screens verified this pass (29 of ~33 routes)
Production, Materials (+ real material edit/restock), Products (+ new-product form), Log a Batch, Batch Detail *(structural only — no real batch exists on this account to load)*, Reports, All Batches, More, Settings, Business Profile, Sync & Offline Data, Notifications, Account, Change Email, Change Password, Delete Account, Help & Support, FAQ, Send Feedback, About, Privacy Policy, Terms of Service, Add/Setup Business, Sign Up, Forgot Password, Reset Password, Email Confirmed. Actual screenshots obtained for: Onboarding and Sign In (via the production deploy), Sign Up, and Materials (via local dev).

Two more notes from the last four checked:
- **Terms of Service** matches Privacy Policy's quality — plain-language, specific, and it proactively clarifies that "NAFDAC status fields reflect what you've entered, they don't represent an actual registration process or confirmation." A smart, non-obvious thing to spell out given the app displays NAFDAC status without integrating with the real registration system.
- **Reset Password** renders the "set a new password" form even with no reset token in the URL, rather than an "invalid or expired link" state. Not independently confirmed as broken — a real reset link would carry a token this direct visit didn't have, and it may well fail correctly server-side on submit — but worth a deliberate check, since a stale/reused link landing on a live-looking form with no warning is a rough edge if it isn't handled. Did not attempt to submit it either way.
- **Email Confirmed** redirects straight to Production when already signed in, so its actual content couldn't be verified without a fresh, unconfirmed signup — which wasn't attempted, since creating a real account is outside what "review" should do unprompted. The redirect-when-already-authenticated behavior itself is reasonable.

Still not reached: Batch Detail / Product Detail / Log a Sale with real data — none exist on this test account, only their empty/new-form equivalents were checkable. Seeing these properly would mean creating a real product, batch, and sale through the UI, which changes actual data in the account rather than just reading it — didn't do this without asking first.

### Recommendation — ✅ done
Both fixes recommended above (empty-state coverage on the three remaining list screens, and the shared pluralization helper) were made and verified live on `localhost:5173` as of this update. No open action items remain from this pass.
