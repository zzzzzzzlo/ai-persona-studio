"""Offline container checks, additional to the official size audit."""
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from zipfile import ZipFile

ALLOWED = {'.html','.css','.js','.png','.jpg','.jpeg','.gif','.webp','.svg','.woff','.woff2','.json'}
root = Path(sys.argv[1] if len(sys.argv) > 1 else 'dist')
if root.is_file():
    with ZipFile(root) as z:
        files = {p: z.read(p) for p in z.namelist() if not p.endswith('/')}
else:
    files = {p.relative_to(root).as_posix(): p.read_bytes() for p in root.rglob('*') if p.is_file()}
errors = []
if 'index.html' not in files: errors.append('index.html missing from root')
if sum(p.endswith('.html') for p in files) != 1: errors.append('Exactly one HTML entry required')
for name in files:
    if Path(name).suffix.lower() not in ALLOWED: errors.append('Unsupported file: ' + name)
    if any(x in name.split('/') for x in ['node_modules','.git','.DS_Store']): errors.append('Development artifact: ' + name)
    if name.startswith('/') or '..' in name.split('/'): errors.append('Unsafe archive path: ' + name)

class Markup(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_script = False
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in {'iframe','object','base'}: errors.append('Forbidden HTML element: ' + tag)
        if any(k.startswith('on') for k in attrs): errors.append('Inline event handler')
        if 'download' in attrs or attrs.get('target') == '_blank': errors.append('Forbidden navigation/download')
        if tag == 'meta' and attrs.get('http-equiv','').lower() == 'content-security-policy': errors.append('Container owns CSP')
        if tag == 'script':
            if not attrs.get('src'): errors.append('Inline script')
            if attrs.get('type') == 'module': errors.append('Module script')
            self.in_script = True
        for key in ['src','href']:
            if key in attrs:
                value = attrs[key]
                if not value.startswith('./'): errors.append('Non-relative resource: ' + value)
                elif value[2:] not in files: errors.append('Missing resource: ' + value)
    def handle_endtag(self, tag):
        if tag == 'script': self.in_script = False
    def handle_data(self, data):
        if self.in_script and data.strip(): errors.append('Script body must be external')

html = files.get('index.html', b'').decode('utf-8')
parser = Markup(); parser.feed(html)
for item in ['<!DOCTYPE html>', 'lang="zh-CN"', 'charset="UTF-8"', 'width=device-width', 'initial-scale=1.0', 'viewport-fit=cover']:
    if item not in html: errors.append('Missing entry metadata: ' + item)
patterns = {
    'network': r'\b(fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|RTCPeerConnection)',
    'dynamic execution': r'\beval\s*\(|new\s+Function\s*\(|\bWebAssembly\b',
    'worker': r'new\s+(?:Shared)?Worker\s*\(|navigator\.serviceWorker',
    'external resources': r'https?://|javascript:',
    'forbidden device capability': r'navigator\.(?:geolocation|clipboard|bluetooth|usb|hid|serial|connection|credentials|locks)|getBattery|getDisplayMedia|enumerateDevices|requestFullscreen|DeviceMotionEvent|DeviceOrientationEvent|Accelerometer|Gyroscope|Magnetometer',
    'forbidden navigation': r'window\.(?:open|prompt)\s*\(|location\.(?:assign|href)|\.download\s*=',
    'module syntax': r'^\s*(?:import\s|export\s)|\bimport\s*\(',
    'post-ES2017 syntax': r'\?\.|\?\?|\.\.\.',
    'post-ES2017 API': r'\.replaceAll\s*\(|\.at\s*\(|Object\.hasOwn|structuredClone',
}
for name, content in files.items():
    if Path(name).suffix in {'.js','.css'}:
        text = content.decode('utf-8')
        for label, pattern in patterns.items():
            if re.search(pattern,text,re.M): errors.append(label + ': ' + name)
        if name.endswith('.css'):
            if re.search(r'(?<!-)\bgap\s*:|\baspect-ratio\s*:|\b(?:clamp|min|max|color-mix)\s*\(|:has\(|\b(?:inset|margin-inline|padding-block)\s*:|@(?:layer|container|property)\b', text): errors.append('Unreviewed modern CSS: ' + name)
            for uri in re.findall(r'url\([\s\'"]*([^\)\s\'"]+)',text):
                if uri.startswith(('http','/')): errors.append('Invalid CSS resource: ' + uri)
report = {'target': str(root), 'passed': not errors, 'fileCount': len(files), 'uncompressedBytes': sum(map(len, files.values())), 'errors': errors, 'warnings': [], 'scope': 'Static source/container checks; excludes platform and real device acceptance'}
print(json.dumps(report, ensure_ascii=False, indent=2))
sys.exit(1 if errors else 0)
