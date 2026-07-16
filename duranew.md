# DURANEW — Master Build & Handoff Document

> **What is this file?**
> This is the single shared "brain" for building the Duraforge UK website. ANY AI model
> (Claude, Gemini, GPT, etc.) that works on this project MUST read this file first, then
> continue from the current task list. This file solves the "model forgets everything when
> you switch models" problem. Keep it updated as work progresses.
>
> **Golden rule for every model:** Read this file top-to-bottom → find the "LIVE TASK LIST"
> → do the next task → update the task list and the "SESSION LOG" → hand off cleanly.

**Owner:** Tushar (non-coder — do ALL technical work, explain in plain English)
**Repo:** https://github.com/sharkbrews/duraforge_new  (branch: `main`)
**Local folder:** /Users/tushar/Documents/duraforge
**Created:** 2026-07-16
**Last updated:** 2026-07-16 (Stage 2.5 — DB + auth built, awaiting commit approval)

---

## 0. HOW WE WORK (read this every time)

1. **Tushar is not a coder.** Never ask him to write code or run git. Do it all. Explain
   choices in plain, friendly English. Avoid jargon; when you must use a term, define it.
2. **Build in visible stages.** After each stage, tell him exactly how to open it in his
   browser, wait for his "OK", then commit + push.
3. **Fresh project.** Ignore `.github/memory/` and any "progress" notes in `.github/` —
   those belong to a *different, competing* project. We are building a brand-new version
   from scratch so the two can be compared. Nothing on our side is "already built."
4. **Source of truth for WHAT to build:** `.github/website-requirements.md`
   **Source of truth for BUSINESS context:** `.github/copilot-instructions.md`
   **Raw data (prices, cross-refs, images, logo):** `docs/`
5. **This file (`duranew.md`) is the source of truth for HOW FAR we've got and WHAT'S NEXT.**
6. Commit + push only when Tushar approves a stage. Use clear commit messages.

---

## 1. MODEL-SWITCHING PROTOCOL (the whole point of this file)

We deliberately use different models for their strengths:

- **Claude (Opus/Sonnet) = the "Builder/Conductor."** Architecture, database, logic,
  payments, wiring, bug-fixing, project setup, and coordinating everything. Claude also
  writes/updates THIS file.
- **Gemini = the "Designer."** Called in specifically for visual polish / UI beauty on
  pages Claude has already built and wired up.

**Handoff ritual (do this exactly):**

- **Claude → Gemini:** When a stage's logic/structure is done and it's time to make a
  screen beautiful, Claude writes a section under "DESIGN HANDOFF (for Gemini)" below with:
  the file(s) to edit, what the page does, the brand rules, and precise design goals.
  Then Claude tells Tushar: *"Switch the model dropdown to Gemini and say: 'read duranew.md
  and do the design handoff.'"*
- **Gemini:** On arrival, read this whole file, then do ONLY what's in "DESIGN HANDOFF".
  Do not change logic, data, or wiring. When done, write what you changed in the
  "SESSION LOG" and clear the design handoff section. Then tell Tushar: *"Switch back to
  Claude and say: 'read duranew.md and continue.'"*
- **Claude (back):** Re-read this file, verify Gemini's changes didn't break anything,
  continue the task list.

> NOTE ON "AUTOMATIC" SWITCHING: There is no reliable automatic task-based model router in
> Cursor (the "Auto" setting just picks an available model; it does NOT route design→Gemini,
> logic→Claude). Also, background helper agents in Cursor cannot use Gemini at all. So the
> manual handoff above (via this file) is the robust solution. It takes ~10 seconds and is
> far more reliable than any "auto" mode.

---

## 2. WHAT WE'RE BUILDING (plain English)

A **trade-only (B2B) online shop** for **Duraforge UK Ltd**, a Swanscombe (Kent) company
that imports and sells **hydraulic seal kits** for heavy machinery (diggers, tippers,
telehandlers, tractors, forklifts).

The sales angle running through the whole site:
- **25–30% cheaper** than big competitors (FPE Seals, Hallite)
- **Same-day delivery** within 30 miles of Swanscombe
- **No minimum order**, real local phone support
- **Confident, cheeky, knowledgeable British trade tone** (like a sharp mate at the trade
  counter). Never corporate waffle.

Customers are businesses only: hydraulic repair shops, plant-hire firms, agricultural
dealers, construction teams, forklift services. Prices in **GBP**.

---

## 3. NON-NEGOTIABLE BUSINESS RULES

1. **NEVER show customers cost columns.** The price data has Purchase Price (INR),
   Purchase Price (GBP), and Landing Price (GBP) — these are **ADMIN ONLY**. Customers only
   ever see **Sale Price (GBP)**. This must be enforced in the data layer/API, not just hidden
   in the UI.
2. **Duraforge is the brand.** Suppliers (Royal Composite, Deepkamal, Max Spares) are never
   shown to customers.
3. **No false claims.** No "CE", "UKCA", "ISO 9001", "OEM", "Genuine", or "Approved" claims
   on product pages. "Made in India" is stated honestly.
4. **Cross-reference is a superpower.** Wherever possible, map Duraforge parts to FPE /
   Hallite / JCB OEM / CAT OEM part numbers and say how much cheaper we are.
5. **Dimensions always in mm**, format rod Ø × bore Ø × height.
6. **Part number format:** `DRG-[Material]-[ID]-[OD]-[Height]` e.g. `DRG-PU-040-052-010`.
7. **Mobile-first.** Primary user may be on a phone in a plant yard. Big tap targets.
8. **B2B only** — never consumer language.

---

## 4. BRAND & DESIGN DIRECTION

**Colours**
- Primary (navy): `#0D1B2A`
- Accent (hydraulic orange): `#E8630A`
- Secondary (slate grey): `#4A5568`
- Success (green): `#38A169`
- Background (off-white): `#F7F8FA`
- Text (near-black): `#1A202C`

**Type**
- Headings: `Plus Jakarta Sans` or `Inter`
- Body: `Inter`
- Part numbers (monospace): `JetBrains Mono`

**Logo:** `docs/Logo-colour.png` (white reverse version on navy for dark areas). Min 120px wide.

**Tone examples (microcopy):**
- Empty basket: *"Your basket's as empty as a Friday afternoon workshop. Fix that →"*
- Order confirmed: *"Sorted! Your seals are already being picked. We're quick like that."*
- Out of stock: *"That one's flown. Hit notify and we'll ping you the second it's back."*
- Price confidence: *"Yes, we're 25% cheaper. You're welcome."*

---

## 5. TECH STACK (decided)

Full, proper stack — but built in visible stages, sample data first, real services later.

- **Framework:** Next.js (App Router) + TypeScript — great for SEO (matters for a shop)
- **Styling:** Tailwind CSS + shadcn/ui components
- **Data:** Products still in a TypeScript file (`web/src/lib/products.ts`). Accounts + orders
  now in **PostgreSQL via Prisma** (done in Stage 2.5). Products move to the DB in Stage 3.
- **Auth:** **NextAuth (Auth.js v5)** with a credentials (email + password) provider and JWT
  sessions. Done in Stage 2.5.
- **Payments:** Mock checkout first; real Stripe later
- **Deploy target:** Vercel (later)

Rationale: Tushar sees a real, good-looking, working site fast (to compare against the other
project), without getting blocked on database/payment/legal setup on day one. Real services
get layered in once the shape is approved.

---

## 6. BUILD PLAN (stages)

- **Stage 0 — Foundation:** Scaffold Next.js + Tailwind, brand theme (colours/fonts), logo,
  global nav + footer, and the **Homepage** (hero, trust bar, Kit Finder widget, featured
  machine categories, tone). *Sample data only.*
- **Stage 1 — Catalogue + Finder:** Load real seal data from `docs/` price lists into sample
  data. Build shop listing, product detail page (with cross-reference tab), the **Seal Kit
  Finder** (Brand → Model → Position → Kit), and cross-reference lookup.
- **Stage 2 — Accounts + Basket + Checkout:** Register/login, basket, mock checkout, order
  confirmation. (Real DB + auth wired here.)
- **Stage 3 — Order tracking + Admin:** Pick-Pack-Ship 5-stage tracker, staff admin panel
  (orders, products, cost columns visible to admin only), enquiry inbox.
- **Stage 4 — Loyalty + Marketing:** DuraCoins, badges, spin-the-wheel, campaign pages,
  email hooks. Then real Stripe + real database hardening.

Each stage: build → show how to view → get OK → commit + push.

---

## 7. LIVE TASK LIST (the current to-do — keep this updated!)

Legend: [ ] todo · [~] in progress · [x] done · [!] blocked/needs Tushar

### Stage 0 — Foundation
- [x] Scaffold Next.js 16 + TypeScript + Tailwind v4 in `/web`
- [x] Add brand colours + fonts (Inter / Plus Jakarta Sans / JetBrains Mono) to theme
- [x] Copy logo into `web/public/logo-colour.png`
- [x] Build global header (nav + basket + sign-in) and footer + floating WhatsApp button
- [x] Build Homepage: hero, Kit Finder widget (working dropdowns), trust bar, featured
      categories, cross-reference strip, local-pride cards
- [x] Build passes (`npm run build` clean); dev server verified (HTTP 200)
- [x] Committed + pushed Stage 0 (3815f46)

**How to view:** dev server runs at **http://localhost:3001** (`cd web && npm run dev`).

### Stage 1 — Catalogue + Finder
- [x] Load 24 real seal kits into `web/src/lib/products.ts` (sale price only — no cost columns)
- [x] Shop listing with filters + sort (`/shop`, `/shop/[brand]`)
- [x] Product detail page with tabs (`/product/[sku]`)
- [x] Seal Kit Finder (`/finder`) and cross-reference lookup (`/cross-reference`)
- [x] Build clean (38 static pages); live-tested on :3001
- [x] Committed + pushed Stage 1 (a5156b6)

### Stage 2 — Accounts + Basket + Checkout
- [x] Types + file-based JSON store (`web/src/lib/types.ts`, `store.ts`) in `web/data/`
- [x] Auth helpers: scrypt password hashing + signed session cookies (`auth.ts`)
- [x] Cart context + localStorage persistence + basket page (`/basket`)
- [x] Header cart badge + company name when logged in
- [x] Register/login/logout/me API routes + account pages (`/account`, `/account/login`,
      `/account/register`, `/account/orders`)
- [x] Add to basket wired on product detail pages
- [x] Mock checkout (`/checkout`) + order confirmation (`/checkout/confirmation`)
- [x] Orders API (create + list for signed-in user)
- [x] `web/data/users.json` + `orders.json` added to `.gitignore` (runtime data, not committed)
- [x] Build clean (50 routes); API smoke-test passed (register → login → order → DRG-ORD-2026-0001)
- [x] Tushar reviewed + approved
- [x] Committed + pushed Stage 2 (1ba5363)

### Stage 2.5 — Database + Real Auth (Opus) ✅ built, awaiting commit approval
- [x] Local PostgreSQL installed (Homebrew `postgresql@16`) + `duraforge` database created
- [x] Prisma added (v6) — schema: `User`, `Order`, `OrderLineItem`, NextAuth models, enums
      (`Role`, `OrderStatus`, `PaymentMethod`). Migration `init` applied.
- [x] `web/src/lib/prisma.ts` (client singleton) + `web/src/lib/store.ts` rewritten to use Prisma
- [x] NextAuth (Auth.js v5) — credentials provider + JWT sessions (`web/src/auth.ts`,
      `web/src/app/api/auth/[...nextauth]/route.ts`); password hashing in `web/src/lib/password.ts`
- [x] Migrated API routes/pages/components off the file-store + custom cookie to NextAuth
- [x] Existing JSON accounts/orders migrated into Postgres (`web/scripts/migrate-json-to-db.mjs`)
- [x] `web/.env` (gitignored) + `web/.env.example` for other machines/deploys
- [x] `build` script runs `prisma generate`; build clean; full flow smoke-tested (register →
      NextAuth login → order `DRG-ORD-2026-0002`); wrong password correctly rejected
- [x] Tushar approves → commit + push Stage 2.5

**Local DB notes (important):**
- Postgres runs via `brew services start postgresql@16`. Binaries live at
  `/opt/homebrew/opt/postgresql@16/bin` (keg-only — add to PATH when running prisma/psql).
- Connection string is in `web/.env` (`postgresql://tushar@localhost:5432/duraforge`).
- To inspect data: `cd web && npm run db:studio` (Prisma Studio) or `psql duraforge`.
- **At deploy time (Stage 4):** swap `DATABASE_URL` for a hosted Postgres (Supabase/Neon) —
  no code changes needed. Set `AUTH_SECRET` in the host's env vars too.

**How to test Stage 2:**
1. Open **http://localhost:3001**
2. Go to **Account → Register** (or `/account/register`) — create a trade account
3. Browse **Shop**, open any kit, click **Add to basket**
4. Open **Basket** (header icon), proceed to **Checkout**
5. Complete mock payment → see confirmation with order number (e.g. `DRG-ORD-2026-0001`)
6. Check **Account → Orders** for order history

*(Stage 3 tasks will be expanded when we reach them.)*

---

## 8. DESIGN HANDOFF (for Gemini) — currently EMPTY

> Claude fills this in when a screen is ready for visual polish. Gemini does ONLY this,
> then clears it. If this says EMPTY, there is nothing for the designer to do yet.

_(empty)_

---

## 9. SESSION LOG (newest first)

- **2026-07-16 (Claude/Opus) — Stage 2.5: Database + real auth:** Replaced the temporary
  file-based JSON store with a proper database and real authentication. Installed local
  PostgreSQL 16 (Homebrew), added Prisma (v6) with a full schema (User/Order/OrderLineItem +
  NextAuth models + enums) and ran the `init` migration. Rewired `store.ts` onto Prisma and
  swapped the custom session cookie for **NextAuth (Auth.js v5)** — credentials provider, JWT
  sessions, password hashing kept as scrypt in `lib/password.ts`. Removed the custom
  `/api/auth/login` + `/logout` routes (NextAuth handles those via `[...nextauth]`); kept
  `/api/auth/register` (creates the DB user, client then calls `signIn`) and `/api/auth/me`.
  Migrated the existing JSON accounts/orders into Postgres via a one-off script; deleted the
  now-obsolete `web/data/*.json`. Added `web/.env` (gitignored) + `web/.env.example`. Build is
  clean and the full flow was smoke-tested end-to-end (register → login → order 0002; wrong
  password rejected; data confirmed in Postgres). AWAITING Tushar approval to commit + push
  Stage 2.5. NEXT UP: **Stage 3 with Composer** (order tracking + admin panel) — Tushar will
  switch the model. Any model continuing: Postgres must be running
  (`brew services start postgresql@16`) and PATH must include
  `/opt/homebrew/opt/postgresql@16/bin` for prisma/psql; dev server on :3001 outside sandbox.
- **2026-07-16 (Composer) — Stage 2 committed + pushed:** Commit `1ba5363` on `main`.
  Accounts, basket, mock checkout, order confirmation, and orders API. Runtime user/order
  data gitignored in `web/data/`. NEXT UP: Stage 3 (Pick-Pack-Ship tracker + admin panel).
- **2026-07-16 (Composer) — Stage 2 built:** Accounts, basket, and mock checkout complete.
  Added file-based JSON storage (`web/data/` — gitignored at runtime), auth (scrypt + session
  cookies), cart context (localStorage), register/login/logout/me API routes, account pages,
  basket page, checkout with mock card/BACS payment, order confirmation, and orders API.
  Header now shows cart count + company name when signed in. Add to basket wired on product
  pages. Build clean (50 routes). Smoke-tested: register → add order → `DRG-ORD-2026-0001`.
  AWAITING Tushar approval to commit + push Stage 2. Dev server on :3001 (must run outside
  sandbox). NEXT UP: Stage 3 (order tracking + admin panel).
- **2026-07-16 (Claude/Opus) — Stage 1 committed + pushed:** Stage 1 committed (a5156b6) and
  pushed to GitHub `main`. Both Stage 0 and Stage 1 are now safely on the remote. NEXT UP:
  Stage 2 (accounts + basket + checkout) — Tushar plans to switch to **Composer** for the bulk
  of implementation and reserve Opus for the DB/auth foundation, Stripe/payments, and hard
  debugging. Any model continuing: read this file, then start Stage 2 (see plan in section 6 +
  expand the LIVE TASK LIST). Reminder: dev server runs OUTSIDE the sandbox on :3001.
  PUSH NOTE: pushes need the sharkbrews fine-grained token via the inline credential-helper
  method (origin defaults to a different GitHub account otherwise).
- **2026-07-16 (Claude/Opus) — Stage 0 pushed + Stage 1 built:** Committed & pushed Stage 0 to
  GitHub (commit 3815f46). Then built Stage 1: real product catalogue in
  `web/src/lib/products.ts` (24 kits across JCB/CAT/Hyva/Kubota/Takeuchi/Hyundai/Bobcat, real
  OEM refs + dims + cross-refs; NO cost columns — sale price only, per rules). New pages: `/shop`
  (filters + sort via `ShopBrowser`), `/shop/[brand]`, `/product/[sku]` (tabbed spec/contents/
  fits/cross-ref via `ProductDetail`), `/finder` (`FinderTool`), `/cross-reference` (`XrefTool`).
  Homepage Kit Finder widget + cross-ref strip now wired to real pages. Added `ProductCard`,
  `format.ts` (gbp). Build clean (38 static pages). Live-tested on :3001 — shop, product,
  finder, cross-ref all 200; cross-ref `332Y6440` correctly returns JCB 3DX Boom "29% cheaper".
  AWAITING Tushar approval to commit + push Stage 1.
- **2026-07-16 (Claude/Opus) — DECISION: keep Claude's build, drop Gemini's:** Tushar reviewed
  both and preferred the Claude/`web` version (localhost:3001). Deleted the `temp/` folder (the
  Gemini Vite build) and `gemini.md`, plus stray root artifacts (empty `package-lock.json`,
  empty `public/`). Project root is now clean: `.github`, `docs`, `duranew.md`, `web`. We now
  focus solely on `web/`. Dev server on :3001 confirmed 200.
- **2026-07-16 (Claude/Opus) — Comparison build set up:** Created `gemini.md` (a self-contained
  prompt) and an empty `temp/` folder. Tushar will switch the model to Gemini and say "let's go"
  so Gemini builds its OWN version of the site from scratch in `temp/` on **port 3002**, to
  compare against Claude's version in `web/` (port 3001). Gemini must NOT touch `web/`, `docs/`,
  `.github/`, or `duranew.md`. When Claude resumes: my version = `web/`; Gemini's = `temp/`.
- **2026-07-16 (Claude/Opus) — Stage 0 built:** Scaffolded Next.js 16 + Tailwind v4 in
  `/web`. Added brand theme + Google fonts. Built `SiteHeader`, `SiteFooter`,
  `WhatsAppButton`, interactive `KitFinderWidget` (client), and the homepage
  (`src/app/page.tsx`) with hero, trust bar, featured categories, cross-ref strip, and
  local-pride cards. Sample data in `src/lib/sample-data.ts`. Build clean; dev server on
  :3001 returns 200; homepage screenshot looks good. AWAITING Tushar's approval to commit +
  push. NOTE: dev server must run OUTSIDE the sandbox (sandbox blocks
  `uv_interface_addresses`); run with full permissions.
- **2026-07-16 (Claude/Opus):** Created this file. Confirmed folder, git `main` branch,
  Node v20.20.2 / npm 10.8.2 available. Decided stack (Next.js + Tailwind, sample-data-first).

---

## 10. KEY FACTS / QUICK REFERENCE

- Company: **Duraforge UK Ltd**, Company No. 16679838, Swanscombe, Kent DA10 1BZ
- Priority machine brands (Phase 1): JCB, CAT, Hyva, Kubota, Takeuchi, Hyundai, Bobcat,
  John Deere, Massey Ferguson
- Example kits: JCB 3DX Boom (OEM 332Y6440, 80×140mm, £18–25); Hyva FE-162-4 tipper
  (£85–120); CAT 424B Boom (OEM 340-4687, £20–30)
- Materials: NBR (standard), PU (abrasion), PTFE (piston), FKM/Viton (high temp)
- Price data files: `docs/DF_PriceList_UK.xlsx`, `docs/Deepkamal_Net_Price_List_010426.xlsx`,
  cross-ref: `docs/Durforge_UK-Market-xRef-Price_List_2026.md`
- Helper scripts to read the data files: `.github/skills/` (Python)
