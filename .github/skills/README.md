# Duraforge Skills Directory

This folder contains Python utilities and validator scripts that the Duraforge Builder Agent uses autonomously to:
- Extract and process source documents (PDFs, DOCX, XLSX, images)
- Validate implementation against requirements
- Generate seed data for testing
- Cross-reference products

---

## Validator Scripts (Run Post-Task)

### ✅ `check_best_matches.py`
**Purpose**: Validates product cross-reference accuracy (Duraforge → FPE/Hallite/OEM).  
**Triggers**: After product catalogue seeding; after cross-reference feature implementation.  
**Output**: `check_best_matches.out.txt` (match confidence scores).  
**Agent Use**: Run to verify cross-ref data matches expected kits from `website-requirements.md` section 13.

### ✅ `check_direct_matches.py`
**Purpose**: Validates exact part number matches across supplier data.  
**Triggers**: After seeding; if cross-ref lookup returns no results.  
**Output**: Match results + gap list.  
**Agent Use**: Run if Kit Finder returns empty results for known kits (e.g., JCB 3DX boom).

### ✅ `match_deepkamal_to_xref.py`
**Purpose**: Maps Indian supplier SKUs (Deepkamal) to Duraforge UK SKU format + FPE cross-refs.  
**Triggers**: During product seeding; if SKU mapping is broken.  
**Output**: Mapping CSV + validation report.  
**Agent Use**: Run to confirm all 40+ kits are mapped and priced correctly.

### ✅ `inspect_skus.py`
**Purpose**: Audits product SKU list for duplicates, gaps, or malformed entries.  
**Triggers**: Post-seeding; after bulk product imports.  
**Output**: `inspect_skus.out.txt` (SKU audit report).  
**Agent Use**: Run to catch data quality issues before launch.

---

## Data Processing Scripts (One-Time Setup)

### 📊 `read_pdf.py`
**Purpose**: Extract text + images from PDF documents.  
**Usage**: `python skills/read_pdf.py docs/Deepkamal_Net_Price_List_010426.pdf`  
**Agent Use**: Extract supplier price list for seeding.

### 📊 `read_excel.py`
**Purpose**: Convert XLSX to markdown or CSV.  
**Usage**: `python skills/read_excel.py docs/Deepkamal_Net_Price_List_010426.xlsx`  
**Agent Use**: Extract structured product data from Excel source files.

### 📊 `read_docx.py`
**Purpose**: Extract text + tables from DOCX documents.  
**Usage**: `python skills/read_docx.py docs/DURAFORGE_UK-Market-xRef-Price_List_2026.docx`  
**Agent Use**: Extract UK market pricing + cross-references for seeding.

### 📊 `read_image.py`
**Purpose**: Extract text (OCR) + metadata from images.  
**Usage**: `python skills/read_image.py docs/seals_v1.0/images/seal-kits/jcb-3dx-boom.jpg`  
**Agent Use**: Extract product specs from seal kit images if needed.

### 📊 `read_all_docs.py`
**Purpose**: Bulk-process all documents in `docs/` folder.  
**Usage**: `python skills/read_all_docs.py`  
**Agent Use**: One-time extract all source data for seeding.

### 🔄 `csv_to_markdown.py`
**Purpose**: Convert CSV files to markdown tables.  
**Usage**: `python skills/csv_to_markdown.py input.csv > output.md`  
**Agent Use**: Transform supplier price lists into seed data.

### 🔄 `excel_to_markdown.py`
**Purpose**: Convert XLSX sheets to markdown tables.  
**Usage**: `python skills/excel_to_markdown.py input.xlsx`  
**Agent Use**: Transform market price lists into readable format for validation.

### 🔄 `recover_excel_from_md.py`
**Purpose**: Regenerate XLSX from markdown tables (for backup/recovery).  
**Usage**: `python skills/recover_excel_from_md.py input.md`  
**Agent Use**: If seeding CSV is lost, recover from markdown backup.

---

## Analysis Scripts (Diagnostic)

### 🔍 `inspect_tokens.py`
**Purpose**: Analyzes document token usage (for cost estimation).  
**Usage**: `python skills/inspect_tokens.py docs/`  
**Agent Use**: Estimate AI token cost before processing large documents.

---

## Agent Execution Guide

### Setup (First Time Only)
```bash
# Activate virtual environment
.venv\Scripts\Activate.ps1

# Install dependencies (if needed)
pip install -r requirements.txt
```

### Typical Agent Flow

**1. Extract Source Data**
```bash
python skills/read_all_docs.py > docs_extracted.txt
python skills/excel_to_markdown.py docs/Deepkamal_Net_Price_List_010426.xlsx
```

**2. Seed Products**
```bash
cd web
npm run seed
```

**3. Validate Seeding**
```bash
cd ..
python skills/check_best_matches.py
python skills/inspect_skus.py
```

**4. Report Results**
→ Update `.github/memory/data-seeding-log.md` with row counts + any issues.

### Post-Feature Validation

After implementing a feature:
```bash
python skills/check_direct_matches.py
python skills/match_deepkamal_to_xref.py
```

→ Log any gaps in `.github/memory/validator-gaps.md`.

---

## Cost Optimization

- All scripts run locally (no API calls).
- Document extraction uses Python libraries (pdfplumber, python-docx, openpyxl) — no SaaS costs.
- Validators run fast (<10s per script) — minimal compute cost.

---

## Requirements

See `requirements.txt` at workspace root:
- `pdfplumber` — PDF text extraction
- `python-docx` — DOCX processing
- `openpyxl` — XLSX processing
- `pillow` — Image processing
- `pytesseract` (optional) — OCR for images
- `prisma` — Database seeding (Python client)

