import re
from pathlib import Path


def parse_md_table(path):
    text = path.read_text(encoding='utf-8', errors='replace')
    lines = [line for line in text.splitlines() if line.strip()]
    header_idx = None
    for i, line in enumerate(lines):
        if line.strip().startswith('|') and i + 1 < len(lines) and '---' in lines[i + 1]:
            header_idx = i
            break
    if header_idx is None:
        raise ValueError('No markdown table found in %s' % path)
    header = [cell.strip() for cell in lines[header_idx].strip('|').split('|')]
    rows = []
    for line in lines[header_idx + 2:]:
        if not line.strip().startswith('|'):
            break
        cells = [cell.strip() for cell in line.strip('|').split('|')]
        while len(cells) < len(header):
            cells.append('')
        rows.append(dict(zip(header, cells)))
    return rows


def norm(text):
    return re.sub(r'[^A-Z0-9]', '', text.upper())


xref = parse_md_table(Path('docs/Durforge_UK-Market-xRef-Price_List_2026.md'))
source = parse_md_table(Path('docs/Deepkamal_Net_Price_List_010426.md'))

xref_skus = {norm(r.get('sku', '')) for r in xref}
xref_descs = {norm(r.get('description', '')) for r in xref}

matches = []
for row in source:
    part = row.get('PART NO & DESCRIPTION', '').strip().upper()
    if not part:
        continue
    n = norm(part)
    if n in xref_skus or any(n in x for x in xref_skus) or n in xref_descs or any(n in x for x in xref_descs):
        matches.append((part, n))
        if len(matches) >= 50:
            break
print('found', len(matches))
for m in matches:
    print(m)
