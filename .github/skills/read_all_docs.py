"""
Skill: Read all documents in a target folder using the appropriate reader skill.
Supported formats: .pdf, .docx, .xlsx, .xls, .png, .jpg, .jpeg, .gif, .webp

Usage:
    python read_all_docs.py [docs_folder]
    Default docs_folder: ../docs  (relative to this script)
"""
from read_image import read_image
from read_excel import read_excel
from read_docx import read_docx
from read_pdf import read_pdf
import os
import sys

# Allow running from any working directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)


READERS = {
    ".pdf":  read_pdf,
    ".docx": read_docx,
    ".xlsx": read_excel,
    ".xls":  read_excel,
    ".png":  read_image,
    ".jpg":  read_image,
    ".jpeg": read_image,
    ".gif":  read_image,
    ".webp": read_image,
}


def read_all(docs_folder: str) -> dict:
    """Return a dict of {filename: extracted_text} for all supported docs."""
    results = {}
    for fname in sorted(os.listdir(docs_folder)):
        ext = os.path.splitext(fname)[1].lower()
        if ext not in READERS:
            continue
        fpath = os.path.join(docs_folder, fname)
        print(f"  Reading: {fname}", flush=True)
        try:
            results[fname] = READERS[ext](fpath)
        except Exception as e:
            results[fname] = f"[ERROR reading file: {e}]"
    return results


if __name__ == "__main__":
    docs_folder = sys.argv[1] if len(
        sys.argv) > 1 else os.path.join(SCRIPT_DIR, "..", "docs")
    out_file = sys.argv[2] if len(sys.argv) > 2 else None
    docs_folder = os.path.abspath(docs_folder)

    if not os.path.isdir(docs_folder):
        print(f"Folder not found: {docs_folder}")
        sys.exit(1)

    # Force stdout to UTF-8 so special characters don't crash on Windows
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    print(f"Reading docs from: {docs_folder}\n", flush=True)
    results = read_all(docs_folder)

    lines = []
    for fname, content in results.items():
        separator = "=" * 70
        lines.append(f"\n{separator}")
        lines.append(f"FILE: {fname}")
        lines.append(separator)
        lines.append(content)
        lines.append("")

    output = "\n".join(lines)

    if out_file:
        with open(out_file, "w", encoding="utf-8") as f:
            f.write(output)
        print(f"\nOutput written to: {out_file}", flush=True)
    else:
        print(output)
