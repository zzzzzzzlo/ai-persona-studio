"""Import the supplied V2 questionnaire without touching personality definitions/copy."""
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
brief = (root / 'docs/requirements-v2.txt').read_text(encoding='utf-8')
section = brief.split('## 三、完整题目与评分', 1)[1].split('## 四、评分算法', 1)[0]
questions = []
for match in re.finditer(r'### Q(\d+)｜([^\n]+)\n(.*?)(?=\n### Q|\Z)', section, re.S):
    number, heading, content = int(match[1]), match[2], match[3]
    dimension = re.search(r'\b([IEDCSBTMGRL])\b', heading)[1]
    prompt = re.search(r'题目：(.*?)(?=\n\nA\.)', content, re.S)[1].strip().split('\n\n')
    options = []
    for option in re.finditer(r'^([A-D])\.\s*(.*?)——\s*([^\n]+)', content, re.M):
        scores = {d: int(value) for d, value in re.findall(r'([IEDCSBTMGRL])\s*([+-]?\d+)', option[3])}
        options.append({'id': option[1], 'text': option[2].strip(), 'scores': scores})
    assert len(options) == 4, number
    question = {'id': number, 'dimension': dimension, 'kind': 'scenario' if number <= 14 else 'configuration', 'prompt': prompt[0], 'options': options}
    if len(prompt) > 1:
        question['description'] = '\n\n'.join(prompt[1:])
    questions.append(question)
assert len(questions) == 18
text = '(function (A) {\n  "use strict";\n  A.questions = ' + json.dumps(questions, ensure_ascii=False, indent=2) + ';\n})(window.HeartTest);\n'
(root / 'src/data/questions.js').write_text(text, encoding='utf-8')
print('Imported 18 V2 questions and 72 multi-dimension options.')
