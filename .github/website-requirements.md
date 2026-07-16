# Duraforge UK Ltd — Website Requirements Document
**Version**: 1.0  
**Date**: 2026-06-04  
**Owner**: Duraforge UK Ltd, Swanscombe, Kent DA10 1BZ  
**Audience**: AI agents, developers, designers building the Duraforge e-commerce platform

---

## 1. Executive Summary

Duraforge UK Ltd requires a **B2B e-commerce website** for the UK trade market, selling hydraulic seal kits to hydraulic repair specialists, plant hire companies, agricultural dealers, and construction plant teams. The site must:

- **Undercut FPE Seals and Hallite by 25–30%** and make that pricing advantage viscerally obvious
- **Serve the Kent → Surrey → Essex corridor** as its primary geography, with same-day delivery as a headline feature
- **Feel local and human** — not a faceless distributor — while being fully transactional and self-service
- **Use a flirtatious, confident, slightly cheeky British tone** — think a knowledgeable mate at the trade counter who happens to know every seal dimension in his head
- **Gamify the buying experience** so repeat trade customers feel rewarded, recognised, and loyal

Reference competitor sites studied:
- **FPE Seals** (fpeseals.com) — 35,000+ products, Seal Kit Finder, same-day dispatch, trade counter, ISO accredited, Darlington-based — strong product depth but no local Kent presence and 1–2 day delivery to SE England
- **MaxSpare** (maxspare.com) — Indian manufacturer, 70,000+ stock sizes, mobile app, B2B + B2C, Max Express 4-hour delivery, ISO 9001 — Duraforge's Indian supply chain benchmark; not a UK competitor but shows what a digitally-mature seal supplier looks like

Duraforge's decisive advantages over FPE Seals to emphasise throughout:
1. Based in Swanscombe — same-day delivery within 30 miles covers most of Kent, parts of Surrey/Essex
2. 25–30% cheaper on equivalent kits
3. Real person answers the phone — not a call centre in the North
4. No MOQ — one seal kit is fine
5. Machine-specific kits cross-referenced to JCB OEM, FPE, Hallite part numbers

---

## 2. Competitive Gap Analysis

| Feature | FPE Seals | MaxSpare | Duraforge Target |
|---|---|---|---|
| Seal Kit Finder (by brand/model) | ✅ | Partial | ✅ Must-have |
| Quick Order / CSV upload | ✅ | ❌ | ✅ Must-have |
| Account / login | ✅ | ✅ | ✅ Must-have |
| Online payment | ✅ Card/GPay | ✅ Bank/card | ✅ Stripe/card/BACS |
| Invoicing & credit accounts | Unclear | Unclear | ✅ Must-have |
| Delivery tracking | Basic | ❌ | ✅ Full track |
| Pick-pack-ship status | ❌ | ❌ | ✅ Differentiator |
| Mobile app | ❌ | ✅ iOS/Android | 🔜 Phase 2 |
| WhatsApp integration | ❌ | ✅ | ✅ Must-have |
| Gamification / loyalty | ❌ | ❌ | ✅ Differentiator |
| Marketing campaigns / mailer | Newsletter only | Newsletter | ✅ Campaigns |
| Same-day delivery indicator | Yes (national) | 4-hr (India) | ✅ Local 30-mile badge |
| Cross-reference lookup | Partial | ❌ | ✅ FPE/JCB/Hallite refs |
| Tone of voice | Corporate/dry | Corporate/dry | 🔥 Confident, flirtatious |
| Industry filters | ✅ | Partial | ✅ Must-have |

---

## 3. Site Goals & KPIs

| Goal | Target (Year 1) |
|---|---|
| Online revenue | £60,000+ (33% of £184k plan) |
| Registered trade accounts | 50+ |
| Repeat order rate | 60%+ |
| Average order value | £85+ |
| Same-day orders placed before 11am | 40%+ of local orders |
| Newsletter / campaign subscribers | 200+ |
| Seal Kit Finder searches converted to order | 30%+ |

---

## 4. Information Architecture

```
duraforge.co.uk
│
├── / (Home)
├── /shop
│   ├── /seal-kits                  # Machine-specific rebuild kits
│   │   ├── /jcb
│   │   ├── /caterpillar
│   │   ├── /hyva
│   │   ├── /kubota
│   │   ├── /takeuchi
│   │   ├── /hyundai
│   │   ├── /bobcat
│   │   └── /[brand]
│   ├── /individual-seals           # Rod, wiper, piston, O-rings by dimension
│   │   ├── /rod-seals
│   │   ├── /wiper-seals
│   │   ├── /piston-seals
│   │   ├── /o-rings
│   │   └── /guide-rings
│   └── /assortment-boxes
│
├── /finder                         # Seal Kit Finder (brand → model → position → kit)
├── /cross-reference                # FPE / Hallite / JCB OEM part number lookup
│
├── /industries
│   ├── /plant-hire
│   ├── /hydraulic-repair
│   ├── /agriculture
│   ├── /construction
│   └── /forklift
│
├── /account
│   ├── /dashboard
│   ├── /orders
│   ├── /invoices
│   ├── /track                      # Delivery + pick-pack-ship tracker
│   ├── /addresses
│   ├── /credit                     # Trade credit account status
│   ├── /rewards                    # Gamification / loyalty dashboard
│   └── /quick-order
│
├── /checkout
│   ├── /basket
│   ├── /delivery
│   └── /payment
│
├── /campaigns                      # Current offers, seasonal deals
├── /brochure                       # Digital marketing brochure / download
├── /blog                           # Technical articles, machine guides
├── /faq
├── /contact
├── /about
└── /delivery-info
```

---

## 5. Functional Requirements

### 5.1 Product Catalogue

#### 5.1.1 Seal Kit Finder (HIGHEST PRIORITY)
- Three-step progressive filter: **Brand → Machine Model → Cylinder Position**
- Brands in scope (Phase 1): JCB, CAT/Caterpillar, Hyva, Kubota, Takeuchi, Hyundai, Bobcat, John Deere, Massey Ferguson
- Each kit card shows:
  - Duraforge part number (DRG- format)
  - Cross-reference: FPE part no., OEM part no. (JCB/CAT ref), Hallite part no. where known
  - Cylinder dimensions: Rod Ø × Bore Ø × Stroke (mm)
  - Kit contents breakdown (rod seal, wiper, piston seal, guide rings, O-rings — counts and material)
  - Material grade (NBR / PU / PTFE / FKM)
  - Price (ex-VAT, inc-VAT toggle)
  - Stock availability badge ("In Stock", "Ships today if ordered before 11am", "Low Stock — X left")
  - Add to basket / Quick Order
- Finder must be accessible from homepage hero with minimal clicks

#### 5.1.2 Individual Seal Search
- Search by dimension: ID × OD × Height (mm) — three numeric inputs with tolerance matching (±0.5mm)
- Material filter: NBR / PU / PTFE / FKM
- Seal type filter: Rod, Wiper, Piston, O-ring, Guide Ring
- Results show DRG part number, cross-reference to FPE/Hallite, price, stock

#### 5.1.3 Cross-Reference Lookup
- Input a competitor or OEM part number → returns Duraforge equivalent
- Pre-loaded cross-reference data: FPE Seals refs, Hallite refs, JCB OEM (332Y-series), CAT OEM (340-, 454-series)
- CTA after match: "Ours is [X]% cheaper. Add to basket?"

#### 5.1.4 Product Detail Page
- Full spec table (all dimensions, material, hardness Shore A, temp range °C, pressure bar rating)
- Kit contents diagram or icon set
- Application machine list (which machines/cylinders this kit fits)
- Batch number / country of origin ("Made in India" — honest and upfront)
- Related kits for same machine
- Downloadable specification sheet (PDF)
- Customer reviews (trade only; no anonymous reviews)

### 5.2 Account Management

#### 5.2.1 Registration & Login
- Registration requires: Company name, VAT number (optional at start), delivery address, phone number, email
- Guest checkout allowed but registration nudged at confirmation stage
- Returning user: email + password; social login NOT required (B2B only)
- Forgotten password: secure reset flow

#### 5.2.2 Trade Account Dashboard
- Summary widgets: last order status, outstanding invoices, account balance (if credit), loyalty points
- Order history: searchable and filterable; repeat-order button on every line
- Saved baskets (up to 5 named baskets — e.g. "FGS Plant Monthly", "JCB Fleet Kit")
- Quick Order: enter DRG part number + quantity directly
- CSV/spreadsheet upload for bulk orders (Part No., Qty columns)

#### 5.2.3 Credit Account (Phase 2 — post-launch)
- 30-day net terms for approved trade accounts
- Credit limit displayed in dashboard
- Invoice download (PDF) — Duraforge-branded, VAT invoice compliant
- Payment of invoices online (card or BACS reference)

### 5.3 Payment Gateway

- **Primary**: Stripe (card, Google Pay, Apple Pay)
- **Secondary**: BACS bank transfer option at checkout (generates reference; order held until cleared)
- **Future**: Stripe Invoicing for net-30 trade accounts
- VAT handling: all prices shown ex-VAT with VAT calculated at checkout; VAT invoice issued automatically
- Currencies: GBP only
- PCI-DSS: Stripe handles all card data — Duraforge never stores card numbers
- 3D Secure (SCA) compliant — required under UK PSD2

### 5.4 Invoicing

- Every order generates a PDF VAT invoice:
  - Duraforge UK Ltd, Company No. 16679838, VAT No. (once registered)
  - Customer company name, delivery address, billing address
  - Line items: DRG part no., description, qty, unit price (ex-VAT), line total
  - VAT subtotal, grand total
  - Payment reference, bank details (for BACS)
  - Invoice number format: `DRG-INV-YYYY-NNNNN`
- Invoices emailed automatically on order confirmation
- Invoices downloadable from account portal at any time
- Credit notes supported for returns

### 5.5 Delivery Tracking

#### 5.5.1 Carrier Integration
- **Primary carrier**: DPD (preferred for Kent/SE England coverage and strong API)
- **Same-day local delivery** (within 30 miles of DA10): own-vehicle or local courier — manual update by Duraforge staff
- Each order shows current carrier + tracking number with click-through to carrier tracking page
- Estimated delivery date shown at checkout and in order confirmation email

#### 5.5.2 Pick-Pack-Ship Status (Key Differentiator)
Five order status stages — displayed as a visual progress timeline in account and via email/SMS:
1. **Order Received** — "We've got it, we're on it 💪"
2. **Picking** — "Rummaging through the shelves for your kit..."
3. **Packed & Quality Checked** — "Sealed, labelled, double-checked. It's a beauty."
4. **Despatched** — "It's gone! [Carrier] tracking: [link]"
5. **Delivered** — "Job done. Let us know how the rebuild goes."

- Status updated in real-time via Duraforge admin panel (simple mobile-friendly interface for warehouse staff)
- Status changes trigger: email notification + optional SMS (customer opt-in)
- WhatsApp notification option (Twilio WhatsApp Business API)

### 5.6 WhatsApp Integration
- "WhatsApp Us" floating button (bottom-right) on all pages
- Pre-filled message: "Hi Duraforge, I need a seal kit for [machine]..."
- Business number: Twilio WhatsApp Business (to be registered)
- Response time indicator: "Usually replies within the hour ⚡"

### 5.7 Marketing & Campaigns

#### 5.7.1 Campaign Pages
- Seasonal campaign landing pages: Spring Service Season (March/April), Harvest Season (July/Sept), Winter Prep (Oct/Nov)
- Campaign URL structure: `/campaigns/[slug]`
- Each campaign page: hero, featured products, special pricing (countdown timer optional), CTA
- Admin: create/publish/expire campaigns without developer

#### 5.7.2 Email Marketing
- Integration: **Mailchimp** or **Klaviyo** (Klaviyo preferred — better B2B segmentation)
- Automations required:
  - Welcome sequence (3 emails over 14 days) — introduce Duraforge, cross-reference offer, same-day delivery story
  - Abandoned basket (24h after, then 72h)
  - Post-order follow-up (7 days after delivery — "How did it go? Leave a review")
  - Re-engagement (90 days no order — "Your machines aren't going to fix themselves...")
  - Seasonal campaign broadcasts
- Segments: by customer type (repair shop / plant hire / agri / construction), by geography (Kent / Surrey / Essex / other), by machine brand preference

#### 5.7.3 Digital Marketing Brochure
- Downloadable PDF brochure — `/brochure` — generated from CMS content
- Contents: company story, product range overview, priority kit matrix (JCB, CAT, Hyva, Kubota), pricing vs FPE Seals comparison, delivery options, contact
- Gated download: enter email to receive (feeds Klaviyo list)
- Also available as interactive web version (scrollable one-pager)

### 5.8 Gamification & Loyalty Programme

#### 5.8.1 DuraCoin Rewards (working title)
- Every £1 spent = 1 DuraCoin
- Milestone rewards:
  - 500 coins = 5% off next order
  - 1,000 coins = £15 credit
  - 2,500 coins = free same-day delivery for 30 days
  - 5,000 coins = "DuraForge Pro" status (permanent 10% trade discount tier)
- Coins displayed in account dashboard with a progress bar to next milestone
- Coin balance shown in site header when logged in

#### 5.8.2 Badges & Achievements
Trade-appropriate achievements (shown in account, shareable):
- **First Seal** — placed first order
- **Speed Demon** — ordered same-day delivery 5 times
- **Machine Whisperer** — ordered kits for 5+ different machine brands
- **Big Rig** — single order value over £500
- **Loyal Spanner** — 12 consecutive months with at least one order
- **Referral King** — referred 3 trade accounts who placed orders

#### 5.8.3 Spin-the-Wheel (Seasonal / Campaign)
- On first login of the month OR after an order > £200:
  - "Give it a spin, go on..." — wheel with prizes: 5% off, free delivery, £10 credit, DuraCoins bonus, "Try again next time"
- Fully optional — dismissible — does not interrupt checkout flow

#### 5.8.4 Leaderboard (Trade Community)
- Regional leaderboard by monthly spend (anonymised to company type if preferred)
- "Top Wrench in Kent this month" — lighthearted recognition, no pressure
- Optional: top accounts get a physical gift (branded Duraforge merchandise — Phase 2)

### 5.9 Tone of Voice & Copywriting Rules

The Duraforge brand voice is **confident, knowledgeable, cheeky, and direct** — like a brilliant trade rep who knows every part number but also makes you laugh. Rules:

1. **Never use corporate waffle** — no "synergistic", "leverage", "solutions"
2. **Use industry vocabulary correctly** — "rod seal", "wiper", "bore", "rod Ø" — trade customers smell nonsense
3. **Light flirtation** — confident, slightly playful, never crass — "Go on, you know you need it" / "That kit's looking very good on your excavator" 
4. **Urgency without aggression** — "Order before 11am, it'll be with you today" — not "BUY NOW!!!"
5. **Empathy for breakdowns** — machines breaking = lost revenue for the customer — acknowledge that: "We know a busted cylinder means a stopped machine. Let's fix that."
6. **Local pride** — Kent-based, SE England focus, proud of fast local delivery — lean into it
7. **Price confidence** — never apologise for being cheaper: "Yes, we're 25% cheaper. You're welcome."
8. **Error messages / empty states** — keep the voice: "Hmm, nothing matched that — try the part number instead?" not "No results found."

Example microcopy:
- Basket empty: *"Your basket's as empty as a Friday afternoon workshop. Fix that →"*
- Order confirmed: *"Sorted! Your seals are already being picked. We're quick like that."*
- Out of stock: *"That one's flown. Hit notify and we'll ping you the second it's back."*
- After 11am cutoff: *"Just missed same-day — but it'll be with you first thing tomorrow. Promise."*

---

## 6. Non-Functional Requirements

### 6.1 Performance
- Page load < 2 seconds (LCP) on 4G mobile — critical for engineers checking parts on-site
- Core Web Vitals: all green — LCP < 2.5s, CLS < 0.1, INP < 200ms
- Product search results < 500ms
- Uptime: 99.9% SLA target

### 6.2 Mobile-First Design
- The primary user is an engineer or buyer at a desk OR on their phone in a plant yard
- Mobile breakpoints: 320px, 375px, 390px, 768px, 1024px, 1280px, 1440px
- Touch-friendly: minimum 44×44px tap targets
- Sticky header with basket icon and "WhatsApp Us" always visible on mobile
- Kit Finder must be fully functional on mobile — 3-step flow, large buttons

### 6.3 Security (OWASP Top 10 compliance required)
- HTTPS everywhere (TLS 1.3 minimum)
- No customer card data stored — Stripe tokenisation only
- CSRF protection on all forms
- Rate limiting on login, registration, and contact forms
- SQL injection prevention — parameterised queries / ORM only
- XSS prevention — output encoding, Content Security Policy header
- Dependency scanning (Snyk or Dependabot) in CI/CD pipeline
- Admin panel access: IP allowlist + MFA required
- Audit log: all admin actions logged with timestamp and user
- GDPR: cookie consent (Cookiebot or equivalent), privacy policy, data retention policy, right-to-erasure flow

### 6.4 SEO
- Server-side rendering (Next.js or similar) — product pages and kit pages must be crawlable
- Structured data: `Product` schema with price, availability, brand
- Canonical URLs on all pages
- Sitemap.xml auto-generated
- Meta titles follow pattern: `[Kit Name] Seal Kit | [Machine] | Duraforge UK`
- H1 / H2 hierarchy respected
- Core target keywords: "JCB 3DX seal kit", "Hyva tipper cylinder seal", "hydraulic seal kit Kent", "CAT 424B seal kit", "same day hydraulic seals UK"

### 6.5 Accessibility
- WCAG 2.1 Level AA minimum
- Colour contrast ratios met (brand colours must be checked)
- All images have descriptive alt text (seal type, machine, dimensions)
- Keyboard-navigable throughout
- Screen reader tested (axe-core in CI)

### 6.6 Legal & Compliance
- VAT invoices compliant with HMRC VAT Notice 700
- Cookie consent compliant with UK PECR
- Privacy policy: GDPR / UK GDPR compliant
- Terms & Conditions: B2B sale terms, returns policy (faulty goods only), delivery terms
- Modern Slavery Statement (required once turnover > £36M but good practice from day one)
- No CE/UKCA marks on product pages (Duraforge does not hold these)
- No "OEM", "Genuine", "Approved" claims on product pages

---

## 7. Tech Stack Recommendation

| Layer | Recommendation | Rationale |
|---|---|---|
| **Frontend** | Next.js 14+ (App Router) | SSR for SEO, React ecosystem, Vercel deployment |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid B2B UI, accessible components |
| **Backend / API** | Next.js API Routes or separate Node.js (Express/Fastify) | Keep stack minimal; scale to separate service later |
| **Database** | PostgreSQL (via Supabase or Railway) | Relational — products, orders, accounts, cross-refs |
| **ORM** | Prisma | Type-safe, excellent migration tooling |
| **Auth** | NextAuth.js (credentials + magic link) | No social login needed; magic link improves B2B UX |
| **Payments** | Stripe (Elements + Stripe Invoicing) | PCI-DSS, UK-compliant, Google/Apple Pay |
| **Email** | Resend + React Email (transactional) | Modern, reliable, developer-friendly |
| **Email Marketing** | Klaviyo | Best B2B segmentation; Stripe/Shopify integrations |
| **SMS / WhatsApp** | Twilio | Industry standard; WhatsApp Business API |
| **Search** | Algolia (products) or Postgres full-text | Algolia for instant Kit Finder; fallback to pg_trgm |
| **File Storage** | Cloudflare R2 or AWS S3 | Product images, spec PDFs, invoices |
| **PDF Generation** | Puppeteer or @react-pdf/renderer | Invoices, spec sheets, brochure |
| **Deployment** | Vercel (frontend) + Railway/Render (backend/DB) | Zero-config, Kent-edge CDN points |
| **CMS** | Sanity.io or Contentful | Campaign pages, blog, brochure content — no-code editable |
| **Analytics** | PostHog (self-hosted or cloud) | GDPR-friendly, session recording, funnels |
| **Monitoring** | Sentry | Error tracking, performance monitoring |
| **CI/CD** | GitHub Actions | Already using GitHub; Dependabot for security |

---

## 8. Data Models (Core)

### Product (Seal Kit)
Source: `docs/DF_PriceList_UK.xlsx` (PriceList sheet, 12 columns)

```
id, 
sku (DRG-xxx),                          # Col A: Product Code
part_code (⚠️ CRITICAL),                # Col B: Part Code — used for PO/SO, Pick/Pack/Ship, Invoicing, VAT, Import, Customs
name,
brand_id, 
type_of_seal,                           # Col C: Type of Seal (rod, wiper, piston, O-ring, guide)
series,                                 # Col D: Series
material (NBR|PU|PTFE|FKM),             # Col E: Material
inner_measurement_mm,                   # Col F: Inner Measurement (mm)
outer_measurement_mm,                   # Col G: Outer Measurement (mm)
depth_mm,                               # Col H: Depth of Seal (mm)
purchase_price_inr (⚠️ ADMIN ONLY),     # Col I: Purchase Price (INR) — NEVER show customers
purchase_price_gbp (⚠️ ADMIN ONLY),     # Col J: Purchase Price (GBP) — NEVER show customers
landing_price_gbp (⚠️ ADMIN ONLY),      # Col K: Landing Price (GBP) — NEVER show customers
sale_price_gbp (✅ CUSTOMER VISIBLE),   # Col L: Sale Price (GBP) — display on product pages
stock_qty,
oem_part_refs (JSON: [{source, part_no}]), 
is_active, 
created_at, 
updated_at
```

**⚠️ Cost Column Visibility Rules**:
- **Purchase Price INR, Purchase Price GBP, Landing Price GBP** columns are admin-only
- API: Filter these fields from customer-facing product endpoints (`/api/products`, `/api/products/:id`)
- Admin UI: Show all cost columns for margin analysis and pricing decisions
- Product detail page (customer): Display sale_price_gbp only (no cost breakdown visible)

### Customer Account
```
id, company_name, vat_number, email, phone, status (guest|registered|trade|credit),
credit_limit, credit_balance, duracoins, tier (standard|pro),
addresses (JSON), created_at
```

### Order
```
id, order_number (DRG-ORD-YYYY-NNNNN), customer_id, status (enum),
pick_pack_status (received|picking|packed|despatched|delivered),
carrier, tracking_number, shipping_address (JSON), billing_address (JSON),
line_items (JSON), subtotal_ex_vat, vat_amount, total_inc_vat,
payment_method, stripe_payment_intent_id, invoice_number, notes,
created_at, despatched_at, delivered_at
```

### Cross Reference
```
id, duraforge_sku, source (FPE|Hallite|JCB_OEM|CAT_OEM|other),
external_part_no, notes
```

---

## 9. Page-by-Page Content Specifications

### 9.1 Homepage
**Hero section**:
- Headline: *"Kent's fastest hydraulic seal kits. 25% cheaper than FPE. Same day if you're close."*
- Sub-headline: *"Trade-only. No nonsense. Swanscombe-based. Order before 11am, it's with you today."*
- Primary CTA: **Find My Seal Kit →** (opens Kit Finder)
- Secondary CTA: **Browse the Catalogue**
- Hero visual: split — left side fast motion montage (excavator, tipper truck, telehandler), right side clean product shot of a complete seal kit laid out

**Trust bar** (below hero):
- "✓ 25–30% below FPE & Hallite prices"
- "✓ Same-day delivery within 30 miles of Swanscombe"
- "✓ No minimum order quantity"
- "✓ Cross-referenced to JCB, CAT, FPE, Hallite part numbers"
- "✓ Real person, real phone number"

**Kit Finder widget**: Inline on homepage — Brand → Model → Position — 3 dropdowns, "Find Kit" button

**Featured machine categories**: JCB · CAT · Hyva · Kubota · Takeuchi · Hyundai — icon cards

**Social proof**: Testimonials from trade customers (initially 3 hand-picked; grow via post-order reviews)

**Urgency ticker** (if applicable): *"Order in the next 2h 14m for same-day dispatch from Swanscombe"* (count down to 11am cutoff, Kent delivery zone only)

**CTA strip**: *"Got a part number? Drop it in and we'll find your equivalent →"* (cross-reference input inline)

### 9.2 Product Listing Page
- Filter panel: Brand, Machine Model, Material, Cylinder Position, Price range, In Stock only
- Sort: Relevance, Price (low→high), Popularity, Newest
- Product card: DRG SKU, name, machine fit, price ex-VAT, material badge, stock indicator, "Add to Basket" / "Quick View"
- Pagination: 24 per page, infinite scroll option
- Active filter tags (removable)

### 9.3 Product Detail Page
- Above fold: name, brand/model breadcrumb, price (ex-VAT, +VAT toggle), stock status, Add to Basket, WhatsApp enquiry
- Spec tab: full dimension table, material, hardness, temp/pressure range
- Contents tab: kit contents listed with icons (rod seal icon, wiper icon, etc.)
- Fits tab: list of all compatible machines and cylinder positions
- Cross-ref tab: "This replaces FPE [X], Hallite [Y], JCB OEM [Z]"
- Reviews tab: trade customer reviews only
- Related products: other positions on same machine

### 9.4 Account Dashboard
- Welcome: *"Morning, [Company Name]. Ready to keep the machines moving?"*
- Last order widget with pick-pack-ship status
- DuraCoin balance + progress bar to next reward
- Shortcuts: Repeat Last Order, Quick Order, Saved Baskets
- Outstanding invoices alert (if credit account)

### 9.5 Pick-Pack-Ship Tracker Page
- Full-width visual timeline — 5 stages
- Stage icon + timestamp + message (see §5.5.2)
- Carrier tracking iframe / deep-link below timeline
- "Need it faster? Call us: 01474 XXXXXX"

---

## 10. Integration Specifications

### 10.1 Stripe
- Stripe Checkout (hosted) OR Stripe Elements (embedded) — Elements preferred for brand continuity
- Webhook handling: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
- Stripe Tax: auto-calculate UK VAT (20%) — configure from day one
- Stripe Invoicing: enable for credit account customers (net 30)

### 10.2 DPD API
- Label generation on despatch
- Tracking status webhook → updates pick-pack-ship status in Duraforge DB
- DPD cut-off time: typically 4pm — Duraforge admin gets alert at 3pm for any unpacked orders

### 10.3 Klaviyo
- Event tracking: `Viewed Product`, `Added to Basket`, `Placed Order`, `Order Fulfilled`, `Earned DuraCoins`
- Segment sync: customer type, region, machine brand preferences (from order history)
- Campaign creation via Klaviyo dashboard — no developer needed for email sends

### 10.4 Twilio (WhatsApp + SMS)
- Inbound WhatsApp messages → admin panel notification + optional staff mobile forward
- Outbound WhatsApp: order status updates (opt-in only, GDPR compliant)
- SMS fallback: order confirmation, despatch notification

### 10.5 Algolia (Search)
- Index: all active products with: sku, name, brand, model, dimensions, material, cross_refs, tags
- Instant search on `/finder` and site-wide search bar
- Cross-reference field searchable — FPE part no. typed in → Duraforge result returned
- Faceted search: brand, material, in-stock flag

---

## 11. Admin Panel Requirements

Accessible at `/admin` — Duraforge staff only — MFA + IP allowlist

### 11.1 Order Management
- List all orders with status filter
- Update pick-pack-ship status (5 buttons per order)
- Mark as despatched: enter carrier + tracking number → triggers email/SMS/WhatsApp automatically
- Print pick list (grouped by SKU, then by order)
- Print despatch labels (DPD API or manual)

### 11.2 Product Management
- Add / edit / deactivate products
- Bulk stock update (CSV upload)
- Price update (individual or percentage across brand/category)
- Cross-reference management (add FPE/Hallite/OEM refs)

### 11.3 Customer Management
- View all registered accounts
- Approve trade credit accounts
- Adjust DuraCoin balances (manual goodwill)
- View customer order history

### 11.4 Campaign Management
- Create/edit/expire campaign pages (no-code — via CMS or built-in campaign builder)
- Schedule email campaigns via Klaviyo (linked)

### 11.5 Analytics Dashboard
- Daily/weekly/monthly revenue (ex-VAT)
- Top 10 products by revenue and by units
- Conversion rate (Kit Finder searches → orders)
- New vs. returning customer split
- Geographic revenue map (county level)

---

## 12. Phase Roadmap

### Phase 1 — Launch (0–3 months)
- Core catalogue: JCB, CAT, Hyva, Kubota, Takeuchi kits from Deepkamal price list
- Kit Finder (brand → model → kit)
- Product detail pages with cross-reference
- Account registration + login
- Stripe checkout (card + Google Pay)
- VAT invoice generation (PDF, emailed)
- Basic order tracking (manual status updates by staff)
- Pick-Pack-Ship status (5-stage, email notifications)
- WhatsApp integration (Twilio)
- DuraCoin loyalty basics (earn on purchase, milestone rewards)
- Klaviyo: welcome sequence + abandoned basket
- Homepage, about, contact, FAQ, delivery info pages
- Mobile-responsive throughout
- SEO foundations (SSR, structured data, sitemap)

### Phase 2 — Growth (3–6 months)
- Credit account management (net-30, invoice payment)
- CSV/bulk order upload
- Saved baskets (named, up to 5)
- Gamification: badges, spin-the-wheel, leaderboard
- DPD API integration (auto-label, live tracking webhook)
- Expanded catalogue: Bobcat, John Deere, Massey Ferguson, Hyundai, forklift brands
- Blog / technical articles (SEO content marketing)
- Digital brochure (interactive web + PDF download)
- Campaign pages builder
- Klaviyo: post-delivery follow-up + re-engagement automations
- PostHog analytics + session recording

### Phase 3 — Scale (6–12 months)
- Mobile app (React Native — iOS + Android)
- Custom seal dimension builder (non-standard kits, request for quote flow)
- API for large trade accounts (EDI-light — submit orders programmatically)
- Affiliate / referral scheme
- Multi-address delivery (single order → multiple depots)
- Expanded marketing: Google Ads, Meta Ads integration

---

## 12.1 Implementation status (2026-07-01)
### Phase 1 — Launch
- [x] Core catalogue UI and product grid pages — implemented
- [x] Kit Finder (brand → model → kit) — implemented via `/finder` and `KitFinderWidget`
- [x] Product detail pages with cross-reference support — implemented
- [x] Account registration + login — implemented
- [x] Stripe checkout flow — implemented (`/checkout`, `/api/checkout/place-order`, Stripe payment intent support with mock fallback)
- [ ] VAT invoice generation (PDF, emailed) — pending
- [x] Basic order tracking (manual status updates by staff) — implemented in admin order detail page
- [x] Pick-Pack-Ship status (5-stage) — implemented in admin order detail and order history views
- [ ] WhatsApp integration (Twilio API) — partial: WhatsApp links exist across pages, but carrier/Twilio automation is not implemented
- [x] DuraCoin loyalty basics — implemented in customer dashboard and admin views
- [ ] Klaviyo automation (welcome/abandoned cart) — pending
- [x] Homepage, about, contact, FAQ, delivery info pages — implemented
- [x] Mobile-responsive UI — implemented
- [x] SEO foundations via Next.js App Router and SSR — implemented; sitemap generation not yet confirmed
- [x] Persisted web enquiry form + admin query inbox — implemented via `/contact`, `QueryForm`, `/api/queries`, and `/admin/queries`

### Phase 2 — Growth
- [ ] Credit account management (net-30, invoice payment) — pending
- [ ] Customer-facing CSV bulk order upload — pending
- [ ] Saved baskets — pending
- [ ] Gamification badges / leaderboard — pending
- [ ] DPD API integration / live tracking webhook — pending
- [ ] Expanded catalogue brands (Bobcat, John Deere, Massey Ferguson, Hyundai, forklift brands) — pending
- [ ] Blog / technical articles — pending
- [ ] Digital brochure / PDF download — pending
- [ ] Campaign builder — pending
- [ ] Klaviyo post-delivery / re-engagement automations — pending
- [ ] PostHog analytics — pending

### Phase 3 — Scale
- [ ] Mobile app — pending
- [ ] Custom seal dimension builder / RFQ flow — pending
- [ ] API for large trade accounts — pending
- [ ] Affiliate / referral scheme — pending
- [ ] Multi-address delivery — pending
- [ ] Expanded marketing integrations — pending

---

## 13. Content Seed Data (from Duraforge docs)

The following kits must be in the product catalogue at launch. Source: `Deepkamal_Net_Price_List_010426.xlsx` and `DURAFORGE_UK_Hydraulic_Machines_Master_Reference.docx`.

### JCB 3DX / 3CX Kits
| DRG SKU | OEM Ref | Position | Rod×Bore (mm) | Sell Price |
|---|---|---|---|---|
| DRG-NBR-3DX-BOOM | 332Y6440 | Boom 2010-11 | 80×140 | £18–25 |
| DRG-NBR-3DX-DIPPER | 332Y6462 | Dipper 2010-11 | 65×110 | £20–28 |
| DRG-NBR-3DX-BUCKET | 332Y6519 | Bucket 2010-11 | 55×95 | £14–20 |
| DRG-NBR-3DX-STAB | 332Y5599 | Stabiliser | 50×90 | £12–18 |
| DRG-NBR-3DX-STEER | 41002 | Steering ram | 45×80 | £12–18 |
| DRG-NBR-3DX-UNIV | — | Universal kit | — | £40–60 |

### CAT 424B Kits
| DRG SKU | OEM Ref | Position | Sell Price |
|---|---|---|---|
| DRG-NBR-CAT424-BOOM | 340-4687 | Boom 2012 | £20–30 |
| DRG-NBR-CAT424-DIPPER | 454-0380 | Dipper | £22–32 |

### Hyva Tipper Kits
| DRG SKU | OEM Ref | Sell Price |
|---|---|---|
| DRG-NBR-HYVA-162-4 | FE-162-4 | £85–120 |
| DRG-NBR-HYVA-141-3 | FE-141-3 | £60–85 |
| DRG-NBR-HYVA-120-3 | FE-120-3 | £55–75 |

### Telehandler (JCB 531/532/535) Kits
| Position | Rod×Bore (mm) | Priority |
|---|---|---|
| Boom lift (531-70/532-70) | 70×130 | P1 |
| Boom lift (535-95/535-125) | 75×130 | P1 |
| Carriage tilt + sway | 50×110 | P1 |

### Mini-Excavator Kits
| Machine | Position | Rod×Bore (mm) |
|---|---|---|
| Takeuchi TB250 | Boom | 55×100 |
| Takeuchi TB230/TB325R | Boom | 45×85 |
| Kubota KX016-4 | Arm + Bucket | 35×60 |
| Hyundai R210LC-9 | Boom | 85×120 |
| Hyundai R210LC-9 | Arm | 100×140 |
| Bobcat E50Z/E55Z | Boom | 57×102 |

---

## 14. Brand & Design Direction

### Colour Palette
- **Primary**: Deep navy `#0D1B2A` — authority, trade heritage
- **Accent**: Hydraulic orange `#E8630A` — energy, action, urgency
- **Secondary**: Slate grey `#4A5568` — technical confidence
- **Success/positive**: `#38A169` (green)
- **Background**: Off-white `#F7F8FA` — clean, not clinical
- **Text**: `#1A202C` (near-black)

### Typography
- **Headings**: `Inter` or `Plus Jakarta Sans` — modern, legible at all sizes
- **Body**: `Inter` — clean, excellent for technical spec tables
- **Monospace** (part numbers): `JetBrains Mono` — makes DRG-NBR-3DX-BOOM scannable

### Logo Usage
- Use `Logo-colour.png` from docs/ as the source
- Dark mode: white reverse logo on `#0D1B2A`
- Minimum size: 120px wide

### Iconography
- Line icons for seal types (rod seal, wiper, piston, O-ring) — commission or use Lucide icons
- Machine category icons: excavator, telehandler, tipper truck, tractor, forklift
- Pick-pack-ship icons: inbox tray, magnifying glass, checkmark, truck, house

---

## 15. Glossary (for AI agents generating copy or code)

| Term | Definition |
|---|---|
| Rod seal / U-cup / Head seal | Seal around the piston rod preventing fluid escape; most commonly replaced |
| Wiper / Scraper seal | Outer seal that wipes contamination off the rod as it retracts |
| Piston seal / T-seal / Compact seal | Seals the piston inside the cylinder bore; prevents cross-leakage |
| Guide ring / Wear ring | Keeps piston/rod centred; prevents metal-to-metal contact |
| O-ring | Circular static seal; used at ports and end caps |
| NBR | Nitrile Butadiene Rubber — standard mineral oil compatibility |
| PU | Polyurethane — high wear resistance, tracked/wheeled plant preference |
| PTFE | Polytetrafluoroethylene — piston seals; low friction |
| FKM / Viton | Fluoroelastomer — high temperature, fire-resistant fluids |
| Shore A | Hardness measurement scale for rubber; typical seal is 70–92 Shore A |
| OEM ref | Original Equipment Manufacturer part number (JCB, CAT, etc.) |
| DRG SKU | Duraforge internal part number — format `DRG-[Material]-[ID]-[OD]-[Height]` |
| Rod Ø | Rod diameter in mm |
| Bore Ø | Cylinder bore (inside) diameter in mm |
| LCL | Less-than-Container Load — sea freight for small shipments |
| PVA | Postponed VAT Accounting — HMRC scheme for deferred import VAT |
| DuraCoin | Duraforge loyalty points currency |
| Kit Finder | Website tool to find correct seal kit by machine brand → model → cylinder |
| Cross-reference | Mapping between Duraforge SKU and FPE/Hallite/OEM part numbers |

---

*Document maintained by: Duraforge UK Ltd / AI agent — update as product catalogue expands.*  
*Next review: after Phase 1 launch or when catalogue exceeds 100 SKUs.*
