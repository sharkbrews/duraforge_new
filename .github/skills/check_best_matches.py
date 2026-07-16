import re
from pathlib import Path
from difflib import SequenceMatcher


def parse_md_table(path):
    text = path.read_text(encoding='utf-8', errors='replace')
    lines = [line for line in text.splitlines() if line.strip()]
    header_idx = None
    for i, line in enumerate(lines):
        if line.strip().startswith('|') and i + 1 < len(lines) and '---' in lines[i + 1]:
            header_idx = i
            break
    if header_idx is None:
        raise ValueError(f'No markdown table in {path}')
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


def normalize(text):
    return re.sub(r'[^A-Z0-9]', '', str(text).upper())


def score(a, b):
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


def numeric_tokens(text):
    return re.findall(r'\d{4,}', text)


source = parse_md_table(Path('docs/Deepkamal_Net_Price_List_010426.md'))
target = parse_md_table(
    Path('docs/Durforge_UK-Market-xRef-Price_List_2026.md'))

print('source rows', len(source), 'target rows', len(target))

target_norms = []
for row in target:
    sku = normalize(row.get('sku', ''))
    desc = normalize(row.get('description', ''))
    prod = normalize(row.get('product_type', ''))
    target_norms.append((row, sku, desc, prod))

results = []
for i, row in enumerate(source):
    part = row.get('PART NO & DESCRIPTION', '').strip()
    if not part:
        continue
    src_norm = normalize(part)
    src_nums = numeric_tokens(src_norm)
    best = None
    best_score = 0.0
    for tro, sku, desc, prod in target_norms:
        # require numeric overlap if possible
        if src_nums:
            if not any(num in sku or num in desc or num in prod for num in src_nums):
                continue
        s = max(score(src_norm, sku), score(
            src_norm, desc), score(src_norm, prod))
        if s > best_score:
            best_score = s
            best = (tro, sku, desc, prod)
    if best and best_score >= 0.7:
        results.append((part, best_score, best[0].get('sku'), best[0].get(
            'description'), best[0].get('price_per_unit')))

print('matches above 0.7', len(results))
for item in results[:50]:
    print(item)
