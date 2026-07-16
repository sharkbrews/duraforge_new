import re
from pathlib import Path

xref_path = Path('docs/Durforge_UK-Market-xRef-Price_List_2026.md')
text = xref_path.read_text(encoding='utf-8', errors='replace')
tokens = ['3519', '5090', '0417', '7302', '8130',
          '30033', '50012', '5476', '9020', '5092', '5094']
for token in tokens:
    print('TOKEN', token)
    count = 0
    for i, line in enumerate(text.splitlines(), 1):
        if token in line:
            print(i, line)
            count += 1
            if count >= 20:
                break
    print('---')
