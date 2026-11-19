"""Normalize current findings and import new IDs from the evidence ledger.

The current list owns ongoing status; historical entries supply new findings.
"""
from pathlib import Path
import json,re
root=Path(__file__).resolve().parents[1]
source=root/'docs/revisions/experience-audit-v13.md'
def read_rows(path):
 rows={}
 for line in path.read_text().splitlines() if path.exists() else []:
  if not re.match(r'^\| [EUVACD]\d{2} \|',line):continue
  row=[s.strip() for s in line.strip('|').split('|')]
  assert len(row)==4 and row[0] not in rows,(path,row)
  rows[row[0]]=row
 return rows
current=root/'docs/REPAIR-STATUS.md'
rows=list((read_rows(source)|read_rows(current)).values())
version=json.loads((root/'package.json').read_text())['version']
open_ids={'U03','V02','V03','V18','A01','D03'}
text=f'''# Cosmos — current repair status

Revision {version}. {len(rows)} observed findings are tracked below. Each row pairs the issue with the implemented improvement or remaining action. Five broader areas remain open: interface refinement, material realism, sustained/hardware performance, subjective listening, and physical-controller validation. This is a growing audit of observed issues.

The complete measurement history remains in the development workspace at `docs/revisions/experience-audit-v13.md`; the playable package carries this current issue list.

'''
for prefix,title in [('E','Exploration and control'),('U','Interface'),('V','Visuals and performance'),('A','Audio'),('C','Implementation and resource use'),('D','Delivery and reliability')]:
 text+=f'## {title}\n\n| ID | Issue | Improvement / remaining action | Status |\n|---|---|---|---|\n'
 for row in sorted((r for r in rows if r[0].startswith(prefix)),key=lambda r:r[0]):
  id,issue,action,state=row
  status=('Open — ' if id in open_ids else '')+state.removeprefix('Open — ')
  text+='| '+' | '.join([id,issue,action,status])+' |\n'
 text+='\n'
current.write_text(text)
print(f'Updated {len(rows)} findings; {len(open_ids)} findings remain open across five broader areas.')
