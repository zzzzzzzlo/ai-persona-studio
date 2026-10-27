"""Shared build-time theme choices; runtime question and scoring files stay shared."""
THEMES = ('blue', 'pink')

def entry_html(root, theme):
    html = (root / 'index.html').read_text(encoding='utf-8')
    if theme == 'pink':
        html = html.replace('<html lang="zh-CN">', '<html lang="zh-CN" data-theme="pink">')
        html = html.replace('./assets/mark.svg', './assets/mark-pink.svg')
        html = html.replace('content="#F5F7FC"', 'content="#FFF3F7"')
        html = html.replace('<title>AI心动人格测试</title>', '<title>AI心动人格测试 · 浅粉版</title>')
        html = html.replace('</head>', '  <link rel="stylesheet" href="./src/styles/pink.css">\n</head>')
    return html
