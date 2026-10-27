"""Create a browser-only standalone preview. Never use this file for Builder Hub."""
import base64
import re
import argparse
from pathlib import Path
from themes import THEMES, entry_html

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--theme', choices=THEMES, default='blue')
theme = parser.parse_args().theme
OUT = ROOT / 'release/mobile-preview'
OUT.mkdir(parents=True, exist_ok=True)
html = entry_html(ROOT, theme)
assets = {}
for path in (ROOT / 'assets').glob('*.svg'):
    assets['./assets/' + path.name] = 'data:image/svg+xml;base64,' + base64.b64encode(path.read_bytes()).decode('ascii')

def embed_style(match):
    content = (ROOT / match[1][2:]).read_text(encoding='utf-8')
    return '<style>\n' + content + '\n</style>'

def embed_script(match):
    content = (ROOT / match[1][2:]).read_text(encoding='utf-8')
    for path, uri in assets.items():
        content = content.replace(path, uri)
    content = re.sub(r'</script', r'<\\/script', content, flags=re.I)
    return '<script>\n' + content + '\n</script>'

html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', embed_style, html)
html = re.sub(r'<script src="([^"]+)"></script>', embed_script, html)
for path, uri in assets.items():
    html = html.replace(path, uri)
html = html.replace('<main id="app" class="app"></main>', '<main id="app" class="app"><p>正在打开心动人格测试。如果停留在这里，请使用支持 JavaScript 的本地 HTML 查看器打开本文件。</p></main>')
html = html.replace('<!DOCTYPE html>', '<!DOCTYPE html>\n<!-- Browser-only single-file offline preview. Builder Hub must use the separate ZIP with external scripts. -->')
target = OUT / ('AI心动人格测试-浅蓝版.html' if theme == 'blue' else 'AI心动人格测试-浅粉版.html')
target.write_text(html, encoding='utf-8')
assert not re.search(r'<(?:script|link|img)[^>]+(?:src|href)="\./', html)
assert './assets/' not in html
if theme == 'blue':
    (OUT / 'AI心动人格测试-手机离线预览.html').write_text(html, encoding='utf-8')
print('Standalone offline preview generated:', target.stat().st_size, 'bytes')
