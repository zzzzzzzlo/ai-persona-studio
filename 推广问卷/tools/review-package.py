"""Bundle a self-contained source review handoff, not a Builder Hub upload."""
import hashlib
import json
import posixpath
import zipfile
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STAMP = '20261026'
PREFIX = 'AI-heart-personality-V2/'
OUT = ROOT / 'release' / 'review'
OUT.mkdir(parents=True, exist_ok=True)
target = OUT / ('AI心动人格测试-V2-审查包-' + STAMP + '-修正版.zip')

selected = set()
for folder in ['src', 'assets', 'tests', 'tools', 'docs', 'vendor', 'output/playwright', 'release/mobile-preview', 'release/archive/v1-20261008']:
    for path in (ROOT / folder).rglob('*'):
        if path.is_file() and '__pycache__' not in path.parts and path.suffix not in {'.pyc', '.log'}:
            selected.add(path.relative_to(ROOT).as_posix())
for name in ['index.html', 'pink.html', 'result-review.html', 'package.json', 'README.md', 'design.md', '.gitignore', 'output/algorithm-witnesses.json']:
    assert (ROOT / name).is_file(), name
    selected.add(name)
for folder in ['release', 'release/pink']:
    for path in (ROOT / folder).iterdir():
        if path.is_file() and (path.suffix in {'.json', '.txt'} or path.name.endswith('v2.0.0.zip') or path.name == 'AI心动人格测试-全部结果审查.html'):
            selected.add(path.relative_to(ROOT).as_posix())

intro = '''# AI心动人格测试 V2 · 审查包

整理日期：2026-10-26。解压后进入 AI-heart-personality-V2 文件夹。

## 先看页面

- 电脑浅粉版：双击 `pink.html`，相邻的 `src` 和 `assets` 文件夹一起保留。
- 电脑浅蓝版：双击 `index.html`。
- 全部结果：双击 `result-review.html`，可筛选 12 种人格、三种展示形式、两套配色和三档 AI 配置示例，亦可查看分享卡。
- 单文件：`release/mobile-preview/AI心动人格测试-浅粉版.html` 或浅蓝版。样式、脚本和图标全部内嵌，可复制到支持 JavaScript 的本地 HTML 查看器。

以上文件均可离线工作，不需要访问原作者电脑的 127.0.0.1 链接。收到此 ZIP 的审查工具可以直接解压读取源码，无需联网。

## 审查重点

1. 完整 V2 需求：`docs/requirements-v2.txt`。
2. 修改清单、冲突处理及已知问题：`docs/v2-upgrade.md`。
3. 18 题、72 个多维计分选项：`src/data/questions.js`。
4. 人格七维评分：`src/logic/scoring.js`；12 人格配置和原长文：`src/data/personas.js`、`resultCopy.js`；匹配器：`src/logic/matcher.js`。
5. AI 四维权重与标签：`src/data/aiConfig.js`；评分和映射：`src/logic/aiScoring.js`、`aiProfile.js`；配置说明文案：`src/data/aiConfigCopy.js`。
6. 三段答题、Q14 过渡与恢复：`src/main.js`、`src/ui/quiz.js`、`src/logic/state.js`。
7. 结果与分享卡：`src/ui/result.js`、`shareCanvas.js`；页面样式：`src/styles/`。
8. 验证记录与截图：`docs/validation.md`、`output/playwright/`。
9. V1 对照归档：`release/archive/v1-20261008/`；原人格/文案/匹配器校验和：`docs/v1-baseline.json`。

2026-10-26 修正：G/R 的低档上限已按明确要求改为 −0.75，Q16/Q17 的 B 选项均可产生中档。Q2 D 仅计 I +2；定制按钮显示评论『想定制』的内测邀请；两主题分享卡增大四项配置标签。详情和验证见 `docs/v2-corrections-20261026.md`。

## 在接收者自己的环境验证

有 Node.js 时运行 `npm test`；有 Node.js 和 Python 3 时运行 `npm run build`。无需 npm install。构建会创建 dist 与 dist-pink，使用包内保留版本的审计器；不代表最新平台或真机验收。

需要服务器调试时运行 `npm run dev`，然后访问接收者自己电脑的 `http://127.0.0.1:5173/pink.html?debug=1`。产品运行不调用外部 API。`tests/browser-*.js` 是现有 Playwright CLI 脚本，部分 file URL 保留原 Windows 项目路径，在其他位置运行浏览器脚本前需适配路径。

此 ZIP 用于源码审查，包含需求、测试与截图。平台上传包分别在 `release/ai-heart-personality-v2.0.0.zip` 和 `release/pink/ai-heart-personality-pink-v2.0.0.zip`，请勿把整个审查包当作平台上传包。

`FILE-MANIFEST.json` 列出原始文件路径、体积与 SHA256；浏览器缓存、npm 工具依赖和自动化会话未打包。
'''

payload = {name: (ROOT / name).read_bytes() for name in sorted(selected)}
manifest = {
    'purpose': 'V2 offline source review handoff',
    'createdDate': '2026-10-26',
    'projectVersion': '2.0.0',
    'sourceFiles': len(payload),
    'files': [{'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()} for name, data in payload.items()]
}
payload['00-先读我.md'] = intro.encode('utf-8')
payload['FILE-MANIFEST.json'] = json.dumps(manifest, ensure_ascii=False, indent=2).encode('utf-8')

class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = []
    def handle_starttag(self, tag, attrs):
        if tag not in {'script', 'link', 'img'}:
            return
        attributes = dict(attrs)
        value = attributes.get('src') or attributes.get('href', '')
        if value.startswith('./'):
            self.paths.append(value)

for entry in ['index.html', 'pink.html']:
    parser = References()
    parser.feed(payload[entry].decode('utf-8'))
    for reference in parser.paths:
        resolved = posixpath.normpath(posixpath.join(posixpath.dirname(entry), reference))
        assert resolved in payload, (entry, reference)

with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for name, data in payload.items():
        assert not name.startswith('/') and '..' not in name.split('/')
        info = zipfile.ZipInfo(PREFIX + name, (2026, 10, 26, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        archive.writestr(info, data)

with zipfile.ZipFile(target) as archive:
    assert archive.testzip() is None
    assert len(archive.infolist()) == len(payload)
    for item in manifest['files']:
        assert hashlib.sha256(archive.read(PREFIX + item['path'])).hexdigest() == item['sha256']

checksum = hashlib.sha256(target.read_bytes()).hexdigest()
target.with_suffix('.sha256.txt').write_text(checksum + '  ' + target.name + '\n', encoding='utf-8')
print(json.dumps({'archive': str(target), 'fileCount': len(payload), 'bytes': target.stat().st_size, 'sha256': checksum, 'crcVerified': True, 'sourceHashesVerified': True, 'entryReferencesVerified': True}, ensure_ascii=False, indent=2))
