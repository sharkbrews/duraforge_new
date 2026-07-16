import pandas as pd
from pathlib import Path

input_path = Path('docs/Deepkamal_Net_Price_List_010426.xlsx')
output_path = Path('docs/Deepkamal_Net_Price_List_010426.md')
xl = pd.ExcelFile(input_path)

for sheet in xl.sheet_names:
    df = xl.parse(sheet, header=None, dtype=str)
    df = df.fillna('')
    header = [str(x).strip() for x in df.iloc[0].tolist()]
    if 'CATEGORY / MACHINE' in header[0] or 'PART NO & DESCRIPTION' in header[1]:
        data = df.iloc[1:].copy()
    else:
        data = df.copy()

    rows = []
    for _, row in data.iterrows():
        row = [str(x).strip() for x in row.tolist()]
        if len(row) >= 1 and row[0] and all(not c for c in row[1:]):
            rows.append({'type': 'category', 'category': row[0]})
        elif any(row):
            rows.append({'type': 'row', 'row': row})

    md_lines = [f'# {input_path.stem}', '', f'## Sheet: {sheet}', '',
                '| CATEGORY / MACHINE | PART NO & DESCRIPTION | NET RATE (₹) | POPrice(£) | ImportCost(£) | Total Cost (£) |',
                '|---|---|---|---|---|---|']
    for item in rows:
        if item['type'] == 'category':
            cat = item['category'].replace('|', '\\|')
            md_lines.append(f'| **{cat}** |  |  |  |  |  |')
        else:
            r = item['row']
            while len(r) < 6:
                r.append('')
            r = [c.replace('|', '\\|') for c in r[:6]]
            md_lines.append('| ' + ' | '.join(r) + ' |')

    output_path.write_text('\n'.join(md_lines), encoding='utf-8')
    print(f'Wrote {output_path}')
