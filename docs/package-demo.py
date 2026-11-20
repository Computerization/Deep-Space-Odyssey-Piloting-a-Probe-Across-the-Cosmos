"""Package the editable offline game without the historical QA archive."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import argparse
import hashlib
import json
import re
import posixpath

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--baseline', type=Path, help='Previous package-verification JSON')
args = parser.parse_args()

# The offline cache is the single source of truth for playable dependencies.
cache_list = (root / 'sw.js').read_text(encoding='utf-8').split('const FILES=')[1].split(';')[0]
runtime = [p for p in re.findall(r"'([^']+)'", cache_list) if p != './']
essentials = [
    'sw.js', 'README.md', 'AGENTS.md', 'package.json', 'server.py', 'cosmos_browser.py', 'server.mjs',
    'server-range.mjs', 'Start Cosmos.command', 'Start Cosmos.bat',
    'vendor/three/LICENSE', 'vendor/three/addons/libs/basis/LICENSE', 'assets/STAR-CATALOGUE-LICENSE.txt',
    'assets/audio/VSCO-CC0-LICENSE.txt', 'assets/fonts/BARLOW-LICENSE.txt',
    'assets/fonts/Sometype-Mono-LICENSE.txt',
    'docs/CREDITS.md', 'docs/ARCHITECTURE.md', 'docs/DEVELOPMENT.md',
    'docs/REPAIR-STATUS.md', 'docs/revisions/physical-v12.md',
    'tests/fixtures/chart-ephemeris-v28-checks.json',
]
files = set(runtime + essentials)
files.update(p.relative_to(root).as_posix() for p in (root / 'tests').glob('*.test.mjs'))
# Documentation may describe development-only tools, but its clickable local
# links must resolve inside the delivered archive.
documentation_links = 0
for name in files:
    if not name.endswith('.md'):
        continue
    for target in re.findall(r'\]\(([^)]+)\)', (root / name).read_text(encoding='utf-8')):
        if re.match(r'(?:[a-zA-Z][\w+.-]*:|#)', target):
            continue
        linked = posixpath.normpath(posixpath.join(posixpath.dirname(name), target.split('#')[0]))
        assert linked in files, f'Missing packaged documentation link: {name} -> {target}'
        documentation_links += 1
manifest = {name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in sorted(files)}
out = root / 'dist'
out.mkdir(exist_ok=True)
target = out / 'Cosmos-Voyager-Demo.zip'
with ZipFile(target, 'w', ZIP_DEFLATED, compresslevel=8) as archive:
    for name in sorted(files):
        archive.write(root / name, 'Cosmos/' + name)
    archive.writestr('Cosmos/MANIFEST.sha256.json', json.dumps(manifest, indent=2) + '\n')
with ZipFile(target) as archive:
    assert archive.testzip() is None
    assert set(archive.namelist()) == {'Cosmos/' + name for name in manifest} | {'Cosmos/MANIFEST.sha256.json'}
    for name, digest in manifest.items():
        assert hashlib.sha256(archive.read('Cosmos/' + name)).hexdigest() == digest, name

report = {
    'version': json.loads((root / 'package.json').read_text(encoding='utf-8'))['version'],
    'file': target.name, 'bytes': target.stat().st_size,
    'runtimeBytes': sum((root / name).stat().st_size for name in runtime),
    'runtimeFiles': len(runtime), 'files': len(manifest) + 1,
    'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
    'integrity': 'all entry hashes verified', 'documentationLinksVerified': documentation_links,
    'scope': 'Editable runtime, launchers, licenses, essential documentation and unit checks. Historical browser QA remains in the workspace.',
}
if args.baseline:
    previous = json.loads(args.baseline.read_text(encoding='utf-8'))
    report.update(previousVersion=previous['version'], previousVersionBytes=previous['bytes'],
                  bytesSavedSincePreviousVersion=previous['bytes'] - report['bytes'])
(out / 'package-verification.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
