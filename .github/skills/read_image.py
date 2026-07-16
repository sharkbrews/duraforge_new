"""
Skill: Read image files and extract metadata using Pillow.
         Attempts OCR via pytesseract if available.
Usage: read_image(filepath) -> str
"""
from PIL import Image
import os


def read_image(filepath: str) -> str:
    """Extract image metadata and attempt OCR if pytesseract is installed."""
    img = Image.open(filepath)
    info_lines = [
        f"Filename : {os.path.basename(filepath)}",
        f"Format   : {img.format}",
        f"Mode     : {img.mode}",
        f"Size     : {img.width} x {img.height} px",
    ]

    # Attempt OCR
    try:
        import pytesseract
        text = pytesseract.image_to_string(img).strip()
        if text:
            info_lines.append(f"OCR Text :\n{text}")
        else:
            info_lines.append("OCR Text : [No text detected]")
    except ImportError:
        info_lines.append(
            "OCR Text : [pytesseract not installed — install it for text extraction]")
    except Exception as e:
        info_lines.append(f"OCR Text : [OCR error: {e}]")

    return "\n".join(info_lines)


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python read_image.py <filepath>")
        sys.exit(1)
    print(read_image(sys.argv[1]))
