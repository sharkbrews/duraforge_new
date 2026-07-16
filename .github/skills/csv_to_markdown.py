import csv
from pathlib import Path

input_path = Path('docs/seals_v1.0/csv/fpeseals_products_20260423.csv')
output_path = Path('docs/Durforge_UK-Market-xRef-Price_List_2026.md')

with input_path.open('r', encoding='utf-8', errors='replace', newline='') as f:
    reader = csv.reader(f)
    rows = [row for row in reader if any(cell.strip() for cell in row)]

if not rows:
    raise SystemExit('No rows found in CSV')

header = rows[0]
num_cols = len(header)

escaped_header = [h.replace('|', '\\|') for h in header]
md_lines = [f'# Duraforge UK Market xRef Price List 2026', '', '| ' +
            ' | '.join(escaped_header) + ' |', '| ' + ' | '.join(['---'] * num_cols) + ' |']

for row in rows[1:]:
    cells = [cell.replace('|', '\\|').strip() for cell in row]
    while len(cells) < num_cols:
        cells.append('')
    cells = cells[:num_cols]
    md_lines.append('| ' + ' | '.join(cells) + ' |')

output_path.write_text('\n'.join(md_lines), encoding='utf-8')
print(f'Wrote {output_path}')
