"""
Skill: Read DOCX files and extract text content using python-docx.
Usage: read_docx(filepath) -> str
"""
from docx import Document
from docx.oxml.ns import qn


def read_docx(filepath: str) -> str:
    """Extract all text from a DOCX file including tables."""
    doc = Document(filepath)
    parts = []

    for block in doc.element.body:
        tag = block.tag.split("}")[-1]
        if tag == "p":
            text = "".join(n.text or "" for n in block.iter()
                           if n.tag.endswith("}t"))
            if text.strip():
                parts.append(text.strip())
        elif tag == "tbl":
            rows = block.findall(".//" + qn("w:tr"))
            for row in rows:
                cells = row.findall(".//" + qn("w:tc"))
                cell_texts = []
                for cell in cells:
                    cell_text = "".join(
                        n.text or ""
                        for n in cell.iter()
                        if n.tag.endswith("}t")
                    )
                    cell_texts.append(cell_text.strip())
                row_text = " | ".join(cell_texts)
                if row_text.strip():
                    parts.append(row_text)

    return "\n".join(parts) if parts else "[No extractable text found]"


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python read_docx.py <filepath>")
        sys.exit(1)
    print(read_docx(sys.argv[1]))
