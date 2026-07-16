"""
Skill: Read PDF files and extract text content using pdfplumber.
Usage: read_pdf(filepath) -> str
"""
import pdfplumber


def read_pdf(filepath: str) -> str:
    """Extract all text from a PDF file."""
    text_parts = []
    with pdfplumber.open(filepath) as pdf:
        for i, page in enumerate(pdf.pages, 1):
            page_text = page.extract_text()
            if page_text:
                text_parts.append(f"--- Page {i} ---\n{page_text.strip()}")
    return "\n\n".join(text_parts) if text_parts else "[No extractable text found]"


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python read_pdf.py <filepath>")
        sys.exit(1)
    print(read_pdf(sys.argv[1]))
