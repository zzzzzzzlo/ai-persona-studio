"""Apply the user's pale pink/blue/white visual revision without touching business data."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
styles = ROOT / 'src/styles'
for path in styles.glob('*.css'):
    text = path.read_text(encoding='utf-8').replace('var(--wine)', 'var(--accent)')
    replacements = {'#9a8793':'#8698b7', '#665e65':'#667187', '#a39ca3':'#9aa6bb', '#d7c6cc':'#dce5f4', '#e5dbdc':'#e6edf8', '#29232a18':'#34405b12', '#29232a20':'#34405b18', 'rgba(41,35,42,.52)':'rgba(41,55,82,.38)'}
    for old,new in replacements.items(): text = text.replace(old,new)
    path.write_text(text,encoding='utf-8')

path = styles / 'base.css'
text = path.read_text(encoding='utf-8')
text = text.replace('background:radial-gradient(ellipse at 100% 45%,rgba(222,214,228,.16),transparent 65%)', 'background:radial-gradient(ellipse at 95% 18%,rgba(255,226,239,.65),transparent 58%),radial-gradient(ellipse at 0% 82%,rgba(222,238,255,.7),transparent 62%)')
text = text.replace('border:1px solid var(--accent);border-radius:8px;background:var(--accent);color:var(--surface)', 'border:1px solid #dae4f5;border-radius:29px;background:linear-gradient(110deg,#f6e9f2,#e4edff);color:var(--accent)')
text = text.replace('border-radius:8px;background:transparent;font-size:14px', 'border-radius:26px;background:rgba(255,255,255,.7);font-size:14px')
text = text.replace('border-radius:50%;background:transparent;font-size:24px', 'border-radius:50%;background:rgba(255,255,255,.85);font-size:24px')
path.write_text(text,encoding='utf-8')

path = styles / 'quiz.css'
text = path.read_text(encoding='utf-8')
text = text.replace('border-radius:8px;background:rgba(255,253,250,.65)', 'border-radius:22px;background:rgba(255,255,255,.88)')
text = text.replace('font-size:15px;color:var(--accent);width:25px;margin-right:12px', 'font-size:15px;color:var(--accent);width:32px;height:32px;line-height:32px;text-align:center;border-radius:11px;background:#edf3ff;margin-right:12px')
text = text.replace('background:#f1e6e9;border-color:var(--accent)', 'background:#edf4ff;border-color:#a9bfeb')
text = text.replace('width:25px;height:25px;border-radius:50%;background:var(--accent);color:#fff;text-align:center;line-height:25px', 'background:#d8e6ff;color:#38558c')
path.write_text(text,encoding='utf-8')

path = styles / 'result.css'
text = path.read_text(encoding='utf-8').replace('border-radius:3px;color:var(--accent)', 'border-radius:12px;background:rgba(255,255,255,.7);color:var(--accent)')
text = text.replace('border-radius:12px;box-shadow', 'border-radius:24px;box-shadow')
text = text.replace('height:3px;background:#e6edf8;', 'height:3px;background:#e6edf8;border-radius:3px;')
path.write_text(text,encoding='utf-8')

for filename in ['assets/encounter.svg', 'assets/mark.svg', 'src/ui/shareCanvas.js', 'index.html']:
    path = ROOT / filename
    text = path.read_text(encoding='utf-8')
    replacements = {'#85344D':'#5371B7', '#F8F5F0':'#FCFCFF', '#E5D8E0':'#FFE4F0', '#BEB3CC':'#E3AAC6', '#CCC1C5':'#D9E5F7', '#DDD5D3':'#E0E7F2', '#EAE1E8':'#FFEAF3', '#777077':'#717B90', '#C8B3C0':'#B6C9ED', '#D7C6CC':'#DCE5F4', '#29232A':'#2F354A'}
    for old,new in replacements.items(): text = text.replace(old,new)
    path.write_text(text,encoding='utf-8')
print('Updated visual colors and rounded controls; question and algorithm data unchanged.')
