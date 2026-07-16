# Data Seeding & Test Environment Log

**Last Updated**: 2026-07-01  
**Status**: Ready for one-time execution

---

## Task 1: Product Catalogue Seeding

### Objective
Parse the DF_PriceList_UK.xlsx workbook (PriceList sheet) and bulk-insert all 12 columns of product data into the Prisma `Product` table.

### Source File
- **Path**: `docs/DF_PriceList_UK.xlsx`
- **Sheet**: PriceList
- **Columns** (A–L):
  - A: Product Code
  - B: Part Code (⚠️ CRITICAL for PO/SO, Pick/Pack/Ship, Invoicing, VAT, Import, Customs)
  - C: Type of Seal
  - D: Series
  - E: Material
  - F: Inner Measurement (mm)
  - G: Outer Measurement (mm)
  - H: Depth of Seal (mm)
  - I: Purchase Price (INR) — Admin only, never surface to customers
  - J: Purchase Price (GBP) — Admin only, never surface to customers
  - K: Landing Price (GBP) — Admin only, never surface to customers
  - L: Sale Price (GBP) — Customer visible

### Expected Kit Count
Target: 40+ products with all 12 columns populated

### Execution Plan
1. Extract PriceList sheet from XLSX using `skills/read_excel.py` or direct Prisma import script.
2. Map columns to Prisma `Product` schema fields (including new cost columns).
3. Generate Prisma seed script (`web/prisma/seed.js`) to bulk-insert all products.
4. Add visibility flag (`adminOnly: true`) to purchase/landing price fields.
5. Run `npm run seed` in `/web` directory.
6. Validate row count via `prisma client` query.
7. Verify cost columns are NOT exposed in customer API endpoints.

### Status: ⏳ Pending Execution

| Step | Status | Date | Notes |
|------|--------|------|-------|
| Extract source data | ⏳ | — | — |
| Generate seed script | ⏳ | — | — |
| Run seed | ⏳ | — | — |
| Validate row count | ⏳ | — | — |
| Document results | ⏳ | — | — |

---

## Task 2: Mock Customer Creation

### Objective
Generate 25+ B2B test customers across 5 industry segments to validate account, checkout, and order tracking flows.

### Customer Segments & Distribution

| Segment | Count | Characteristics | Cities |
|---------|-------|---|---|
| Hydraulic Repair Specialists | 6 | High order frequency (weekly), avg £1,500/month | Canterbury, Belvedere, Harlow, Maidstone |
| Plant Hire Companies | 5 | Large fleet, seasonal peaks, avg £2,000/month | Strood, Ashford, Paddock Wood, Basildon |
| Agricultural Dealers | 4 | Seasonal (Aug–Oct harvest), avg £800/month | Canterbury, Maidstone, Ashford |
| Construction Plant Teams | 4 | Steady orders, avg £1,200/month | Dartford, Medway, Ebbsfleet Valley |
| Forklift Service Companies | 6 | Recurring maintenance, avg £600/month | Thurrock, Waltham Abbey, Heathrow |

### Customer Account Setup
Each test customer needs:
- **Business name** (real-sounding, Kent/Surrey/Essex region)
- **Address** (within 30-mile radius of Swanscombe; Postcode: DA10 1BZ)
- **Email** (test+[segment]@duraforge.co.uk)
- **Phone** (07xxx XXXXXX format)
- **Account Balance**:
  - 5 accounts: £0 (new, COD/prepay)
  - 8 accounts: £50–200 (small credit)
  - 7 accounts: £500–2000 (active credit account)
  - 5 accounts: -£100 to -£500 (unpaid invoices / overdue)
- **Loyalty Balance (DuraCoin)**:
  - New customers: 0 coins
  - Repeat customers: 100–500 coins
- **Order History**:
  - 10 customers: 3–5 past orders (for order history testing)
  - 15 customers: 0 past orders (fresh accounts)

### Execution Plan
1. Generate customer data in CSV format (25 rows, 10 columns).
2. Write Prisma seed script to insert into `User` + `Account` tables.
3. Run seed; validate row count.
4. Create 15 sample orders for 10 of the customers (testing order tracking).

### Status: ⏳ Pending Execution

| Step | Status | Date | Notes |
|------|--------|------|-------|
| Generate customer CSV | ⏳ | — | — |
| Write Prisma seed | ⏳ | — | — |
| Run seed (customers) | ⏳ | — | — |
| Validate row count | ⏳ | — | — |
| Seed sample orders (15) | ⏳ | — | — |
| Document results | ⏳ | — | — |

---

## Post-Seeding Validation

Once both tasks complete:
1. ✅ Product count matches target (40+).
2. ✅ All 12 columns populated correctly (verify sample rows via SQL or Prisma Studio).
3. ✅ Part codes are unique and non-null (critical for PO/SO/invoicing).
4. ✅ Cost columns (purchase/landing prices) are NOT exposed in customer API endpoints.
5. ✅ Admin API endpoints DO include all cost columns for admin UI.
6. ✅ Sale price (Col L) displays correctly on product pages.
7. ✅ Customer count matches target (25+).
8. ✅ All customers can log in and see dashboard (cost columns NOT visible to customers).
9. ✅ Test a few orders end-to-end (select kit → checkout → confirm).
10. ✅ Admin can see orders in order detail page with all product cost data visible.
11. ✅ Manual status update (pick → pack → ship) appears in customer order history.

---

## Completion Status

**Overall**: ONE-TIME OPERATION  
**Next**: Skip this section if re-running agent after initial seed completion.  
**Flag**: Set to "COMPLETE" once seeding verified.

| Task | Status | Date | Result |
|------|--------|------|--------|
| Product Seeding | ⏳ | — | — |
| Customer Seeding | ⏳ | — | — |
| End-to-End Validation | ⏳ | — | — |
| **FINAL STATUS** | **⏳** | — | — |

