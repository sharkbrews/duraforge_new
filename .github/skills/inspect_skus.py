from pathlib import Path
import re

path = Path('docs/Durforge_UK-Market-xRef-Price_List_2026.md')
text = path.read_text(encoding='utf-8', errors='replace')
lines = [line for line in text.splitlines() if line.strip()]
header_idx = None
for i, line in enumerate(lines):
    if line.strip().startswith('|') and i + 1 < len(lines) and '---' in lines[i+1]:
        header_idx = i
        break
if header_idx is None:
    raise RuntimeError('Header not found')
header = [cell.strip() for cell in lines[header_idx].strip('|').split('|')]
rows = []
for line in lines[header_idx+2:]:
    if not line.strip().startswith('|'):
        break
    cells = [cell.strip() for cell in line.strip('|').split('|')]
    while len(cells) < len(header):
        cells.append('')
    rows.append(dict(zip(header, cells)))

keywords = ['332Y', '332/Y', '550', '41004', '333Y',
            '2011', '1100', '5090', '130/', '332/', '332Y', '336F']
for kw in keywords:
    matches = [r['sku'] for r in rows if kw in r.get('sku', '') or kw in r.get(
        'description', '') or kw in r.get('product_type', '')]
    print(kw, len(matches))
    if matches:
        print(matches[:20])
        print('---')
