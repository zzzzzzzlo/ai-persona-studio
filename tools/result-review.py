"""Generate an offline review gallery from the current production renderer and copy."""
import base64
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
marks = {theme: 'data:image/svg+xml;base64,' + base64.b64encode((ROOT / 'assets' / name).read_bytes()).decode('ascii') for theme, name in [('blue', 'mark.svg'), ('pink', 'mark-pink.svg')]}

def script(path):
    text = (ROOT / path).read_text(encoding='utf-8')
    for theme, name in [('blue', 'mark.svg'), ('pink', 'mark-pink.svg')]:
        text = text.replace('./assets/' + name, marks[theme])
    return '<script>\n' + re.sub('</script', r'<\\/script', text, flags=re.I) + '\n</script>'

styles = ''.join('<style>\n' + (ROOT / ('src/styles/' + name + '.css')).read_text(encoding='utf-8') + '\n</style>' for name in ['tokens', 'base', 'quiz', 'result'])
styles += '<style id="pink-theme">\n' + (ROOT / 'src/styles/pink.css').read_text(encoding='utf-8') + '\n</style>'
styles += '<style>\n' + (ROOT / 'tools/result-review.css').read_text(encoding='utf-8') + '\n</style>'
scripts = ''.join(script(path) for path in ['src/data/config.js', 'src/data/personas.js', 'src/data/resultCopy.js', 'src/data/aiConfig.js', 'src/data/aiConfigCopy.js', 'src/logic/scoring.js', 'src/logic/aiProfile.js', 'src/logic/displayMetrics.js', 'src/ui/common.js', 'src/ui/result.js', 'src/ui/shareCanvas.js'])
scripts += '<script>window.reviewMarks={blue:"' + marks['blue'] + '",pink:"' + marks['pink'] + '"};</script>' + script('tools/result-review.js')
html = '''<!DOCTYPE html>
<html lang="zh-CN" data-theme="pink"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="theme-color" content="#fff3f7"><title>AI心动人格测试 · 全部结果审查</title><link rel="icon" href="''' + marks['pink'] + '''">''' + styles + '''</head><body>
<main class="review-shell" id="review-top"><header class="review-header"><p class="review-kicker">AI 心动人格测试 · 页面审查</p><h1>把每一种心动，都仔细看一遍。</h1><p class="review-description">全部 12 种人格，每种均可查看单人格、隐藏副型和双核心页面，共 36 个审查页。页面沿用当前产品的完整文案与布局，点击「预览结果卡」可检查对应分享图。</p><p class="review-description">指标为人格原型的示例数值，实际数值会随答题变化。双核心与副型可切换搭配；这些搭配用于审查展示，不代表实际答题一定会产生该组合。</p></header>
<div class="review-layout"><aside class="review-sidebar" aria-label="审查筛选"><div class="review-controls"><div class="review-field"><span class="review-control-label">页面配色</span><div class="review-theme-buttons"><button class="review-theme" data-review-theme="pink" aria-pressed="true">浅粉版</button><button class="review-theme" data-review-theme="blue" aria-pressed="false">浅蓝版</button></div></div><div class="review-field"><label class="review-control-label" for="review-mode">展示形式</label><select class="review-select" id="review-mode"><option value="single">单人格 · 12 页</option><option value="secondary">隐藏副型 · 12 页</option><option value="dual">双核心 · 12 页</option><option value="all">全部形式 · 36 页</option></select></div><div class="review-field"><label class="review-control-label" for="review-ai">AI 配置示例</label><select class="review-select" id="review-ai"><option value="0">重点记忆 / 适应 / 轻剧情 / 低调</option><option value="-1">轻量记忆 / 稳定 / 日常 / 安静</option><option value="1">深度记忆 / 成长 / 沉浸 / 独立</option></select></div><div class="review-field"><label class="review-control-label" for="review-persona">人格筛选</label><select class="review-select" id="review-persona"></select></div></div><nav class="review-nav" id="review-nav" aria-label="人格页面目录"></nav><a class="review-back-top" href="#review-top">返回顶部 ↑</a></aside>
<div class="review-content"><p class="review-summary" id="review-count" role="status" aria-live="polite"></p><div class="review-grid" id="review-grid"></div><p class="review-bottom">所有结果文案均保留原文。结果内的返回与重测按钮在这里用于回到审查导航；保存与预览按钮用于查看、下载分享卡。</p></div></div></main>
<div id="toast" class="toast" role="status" aria-live="polite" hidden></div><div id="modal-root"></div><noscript>请用支持 JavaScript 的浏览器或本地 HTML 查看器打开。</noscript>''' + scripts + '''</body></html>'''
assert not re.search(r'<(?:script|link|img)[^>]+(?:src|href)="(?:https?:|\./)', html)
for target in [ROOT / 'result-review.html', ROOT / 'release' / 'AI心动人格测试-全部结果审查.html']:
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(html, encoding='utf-8')
print('Generated offline result review:', len(html.encode('utf-8')), 'bytes')
