"""
Skill: Read Excel (xlsx/xls) files and extract content using pandas.
Usage: read_excel(filepath) -> str
"""
import pandas as pd


def read_excel(filepath: str) -> str:
    """Extract all sheets and rows from an Excel file."""
    xl = pd.ExcelFile(filepath)
    parts = []

    for sheet_name in xl.sheet_names:
        df = xl.parse(sheet_name, header=None, dtype=str)
        df = df.fillna("")
        # Drop fully empty rows
        df = df[df.apply(lambda r: r.str.strip().any(), axis=1)]
        if df.empty:
            continue
        parts.append(f"=== Sheet: {sheet_name} ===")
        for _, row in df.iterrows():
            row_text = " | ".join(str(v).strip()
                                  for v in row if str(v).strip())
            if row_text:
                parts.append(row_text)

    return "\n".join(parts) if parts else "[No extractable content found]"


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python read_excel.py <filepath>")
        sys.exit(1)
    print(read_excel(sys.argv[1]))
