"""Import frozen questionnaire, centers, weights and copy directly from the brief."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
text = (ROOT / 'docs/requirements.txt').read_text(encoding='utf-8-sig')

def section(start, end):
    return text.split(start, 1)[1].split(end, 1)[0]

def write(name, data):
    p = ROOT / 'src/data' / (name + '.js')
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text('(function (A) {\n  "use strict";\n  A.' + name + ' = ' + json.dumps(data, ensure_ascii=False, indent=2) + ';\n})(window.HeartTest);\n', encoding='utf-8')

qtext = section('七、正式问卷和评分', '八、基础评分算法')
blocks = re.findall(r'Q(\d+) / ([^\n]+)\n(.*?)(?=\nQ\d+ /|\Z)', qtext, re.S)
questions = []
for n, dim, body in blocks:
    n = int(n)
    before = re.split(r'\nA\n', body, maxsplit=1)[0]
    if n == 15:
        prompt = before.split('题目：', 1)[1].strip()
    else:
        prompt = before.replace('题目：', '').strip()
    options = []
    for letter, raw in re.findall(r'\n([A-G])\n(.*?)(?=\n[A-G]\n|\Z)', body, re.S):
        if n == 15:
            content, score = raw.split('校准：', 1)
            delta = {d: float(v) for d, v in re.findall(r'([IEDCSBT]) ([+-][\d.]+)', score)}
            options.append(dict(id=letter, text=content.strip(), calibration=delta))
        else:
            match = re.search(r'\n([IEDCSBT]) ([+-]\d)', raw)
            options.append(dict(id=letter, text=raw[:match.start()].strip(), score=int(match[2])))
    questions.append(dict(id=n, dimension=None if n == 15 else dim.strip(), kind='calibration' if n == 15 else 'scenario', prompt=prompt, options=options))
assert len(questions) == 15
assert all(len(q['options']) == (7 if q['id'] == 15 else 4) for q in questions)
write('questions', questions)

centers = re.findall(r'([^\n]+型)\n([\d., -]+)', section('九、12个人格原型中心', '十、人格维度权重'))
weights = re.findall(r'([^\n]+)\n([\d., -]+)', section('十、人格维度权重', '十一、人格匹配算法'))
weight_map = {name.strip(): [float(x) for x in v.split(',')] for name, v in weights}
copy_blocks = re.findall(r'\n\d+\. ([^\n]+)\n(.*?)(?=\n\d+\. |\Z)', section('十二、12种结果文案', '十三、结果页两种视觉模板'), re.S)
copies = {}
personas = []
metrics = {
    '直球小狗型': [('爱意直球', 'E', 70, 100), ('主动浓度', 'I', 65, 100), ('亲密黏度', 'C', 60, 95)],
    '毒舌竹马型': [('毒舌浓度', 'B', 70, 100), ('亲密黏度', 'C', 40, 90), ('关系张力', 'T', 30, 85)],
    '腹黑钓系型': [('暧昧张力', 'T', 70, 100), ('钓系浓度', 'E', 60, 95), ('主见浓度', 'S', 50, 95)],
    '黏人醋精型': [('亲密黏度', 'C', 70, 100), ('吃醋浓度', 'T', 65, 95), ('主动浓度', 'I', 65, 100)]
}
subs = ['你尤其容易对温柔、稳定的回应产生依赖。', '明确的喜欢，会让你忍不住再靠近一点。', '你容易被藏在细节里的克制偏爱打动。', '关键时刻给出方向的人，也很戳你。', '能接梗、敢互损的熟悉感，让你放下距离。', '有自己的世界，却对你特别，也是你的心动点。', '留半步的暧昧，让你愿意继续靠近。', '你尤其容易对“嘴比心硬”的反差感上头。', '被坚定选择，会让你特别有心动感。', '越相处越安心，是你舍不得的关系感。', '能接住你的脑回路，本身就很有吸引力。', '会惦记你、又懂分寸的在意，也能打动你。']
for i, (name, body) in enumerate(copy_blocks):
    tags = body.split('标签：', 1)[1].split('正文：', 1)[0].strip().split(' / ')
    paragraphs, insight = body.split('正文：', 1)[1].split('重点句：', 1)
    insight = insight.strip().split('\n===', 1)[0].strip()
    copies[str(i + 1)] = dict(paragraphs=[p.strip() for p in re.split(r'\n\s*\n', paragraphs.strip()) if p.strip()], insight=insight, secondary=subs[i])
    cname, center = centers[i]
    assert name == cname.strip()
    mc = [dict(label=l, dimension=d, min=lo, max=hi, direction=-1 if name == '腹黑钓系型' and d == 'E' else 1) for l, d, lo, hi in metrics.get(name, [])]
    personas.append(dict(id=str(i + 1), name=name, shortName=name[:-1], center=[float(x) for x in center.split(',')], weights=weight_map[name[:-1]], keywords=tags, template='metrics' if mc else 'insight', metrics=mc))
assert len(personas) == len(copies) == 12
assert all(len(p['center']) == len(p['weights']) == 7 for p in personas)
write('personas', personas)
write('resultCopy', copies)
print('Imported 15 frozen questions, 12 centers, weights, and result copies.')
