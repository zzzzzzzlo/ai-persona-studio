"""Copy only offline runtime files, audit, and zip at the root entry."""
import hashlib
import json
import shutil
import subprocess
import sys
import zipfile
import argparse
from pathlib import Path
from themes import THEMES, entry_html

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--theme', choices=THEMES, default='blue')
theme = parser.parse_args().theme
DIST = ROOT / ('dist' if theme == 'blue' else 'dist-pink')
RELEASE = ROOT / 'release' if theme == 'blue' else ROOT / 'release/pink'
DIST.mkdir(exist_ok=True)
RELEASE.mkdir(parents=True, exist_ok=True)
if theme == 'pink':
    (ROOT / 'pink.html').write_text(entry_html(ROOT, theme), encoding='utf-8')
sources = [ROOT / 'index.html'] + sorted((ROOT / 'src').rglob('*')) + sorted((ROOT / 'assets').rglob('*'))
allowed = {'.html','.css','.js','.svg','.png','.jpg','.jpeg','.gif','.webp','.woff','.woff2','.json'}
manifest = []
for source in sources:
    if source.is_file() and source.suffix in allowed:
        relative = source.relative_to(ROOT)
        if theme == 'blue' and relative.as_posix() in {'src/styles/pink.css', 'assets/mark-pink.svg'}:
            continue
        target = DIST / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
        if relative.as_posix() == 'index.html':
            target.write_text(entry_html(ROOT, theme), encoding='utf-8')
        manifest.append(relative.as_posix())
unexpected = [p.relative_to(DIST).as_posix() for p in DIST.rglob('*') if p.is_file() and p.relative_to(DIST).as_posix() not in manifest]
if unexpected:
    raise SystemExit('Unexpected dist files; review before packaging: ' + ', '.join(unexpected))
for name in manifest:
    if name.endswith('.js'): subprocess.run(['node','--check',str(DIST / name)],check=True)
def run_report(command, filename):
    result = subprocess.run(command,cwd=ROOT,capture_output=True,text=True,encoding='utf-8',env=dict(__import__('os').environ,PYTHONIOENCODING='utf-8'))
    (RELEASE / filename).write_text(result.stdout + result.stderr,encoding='utf-8')
    print(result.stdout)
    if result.returncode: raise SystemExit('Validation failed; see release/' + filename)
run_report([sys.executable, str(ROOT / 'tools/validate.py'), str(DIST)],'static-audit.json')
official = ROOT / 'vendor/official-skill/minitool-zip-builder/scripts/audit_artifact.py'
run_report([sys.executable,str(official),str(DIST)],'official-directory-audit.txt')
archive = RELEASE / ('ai-heart-personality-v2.0.0.zip' if theme == 'blue' else 'ai-heart-personality-pink-v2.0.0.zip')
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for name in manifest: z.write(DIST / name,name)
run_report([sys.executable,str(ROOT / 'tools/validate.py'),str(archive)],'zip-static-audit.json')
run_report([sys.executable,str(official),str(archive)],'official-zip-audit.txt')
info = {'name':archive.name,'theme':theme,'files':manifest,'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'officialSkillPackageVersion':'1.7.0','officialSkillFrontmatterVersion':'1.6.0','platformSimulator':'pending','androidDevice':'pending','iosDevice':'pending','chrome61Runtime':'pending'}
(RELEASE/'manifest.json').write_text(json.dumps(info,ensure_ascii=False,indent=2),encoding='utf-8')
print('READY:',str(archive),'|',info['bytes'],'bytes | SHA256',info['sha256'])
