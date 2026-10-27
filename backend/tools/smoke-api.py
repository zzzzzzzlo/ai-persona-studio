"""Real HTTP acceptance, against an explicitly enabled local development instance."""
import json
import sys
import uuid
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ROOT = Path(__file__).resolve().parents[2]
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8080'
results = []

def call(method, path, body, expected, label):
    data = None if body is None else json.dumps(body, ensure_ascii=False).encode('utf-8')
    request = Request(BASE + path, data=data, method=method, headers={'Content-Type':'application/json; charset=utf-8'})
    try:
        with urlopen(request, timeout=20) as response:
            status, result = response.status, json.load(response)
    except HTTPError as error:
        status, result = error.code, json.load(error)
    assert status == expected, (label, status, result)
    results.append({'check':label, 'httpStatus':status, 'passed':True})
    return result

draft = json.loads((ROOT/'docs/examples/profile-draft.json').read_text(encoding='utf-8'))
body = json.loads((ROOT/'docs/examples/create-profile.json').read_text(encoding='utf-8').replace('e-questionnaire',str(uuid.uuid4())))
valid = call('POST','/api/v1/profiles/validate',{'profile':draft},200,'合法草稿可校验但不就绪')
assert valid['valid'] and not valid['readiness']['readyForCompilation']
invalid = json.loads(json.dumps(draft))
invalid['dimensions']['teasingIntensity']['value'] = 6
error = call('POST','/api/v1/profiles/validate',{'profile':invalid},400,'非法等级及 UNKNOWN 非空值被拒绝')
assert any('/dimensions/teasingIntensity' in e['path'] for e in error['errors'])
created = call('POST','/api/v1/profiles',body,201,'创建画像、版本和证据')
profile_id = created['profileId']
loaded = call('GET','/api/v1/profiles/'+profile_id,None,200,'读取完整快照')
assert loaded['current']['profile'] == body['profile']
version = {'expectedCurrentVersion':1,'profile':body['profile'],'changeReason':'HTTP 验收第二版','evidence':[]}
updated = call('POST',f'/api/v1/profiles/{profile_id}/versions',version,201,'创建第二版并复用同画像证据')
assert updated['currentVersion'] == 2
conflict = call('POST',f'/api/v1/profiles/{profile_id}/versions',version,409,'过期版本冲突')
assert conflict['code'] == 'VERSION_CONFLICT'
version['expectedCurrentVersion'] = 2
version['origin'] = 'MODEL_INFERENCE'
version['profile'] = json.loads(json.dumps(body['profile']))
version['profile']['hardConstraints'] = []
call('POST',f'/api/v1/profiles/{profile_id}/versions',version,400,'模型删除用户边界被后端拒绝')
unchanged = call('GET','/api/v1/profiles/'+profile_id,None,200,'失败写入后版本仍为二')
assert unchanged['currentVersion'] == 2 and unchanged['current']['profile']['hardConstraints']
spec = call('GET','/v3/api-docs',None,200,'运行时 OpenAPI 可访问')
assert len([p for p in spec['paths'] if p.startswith('/api/v1/profiles')]) == 4
output = ROOT/'output/persona-api-smoke.json'
output.write_text(json.dumps({'baseUrl':BASE,'profileId':profile_id,'checks':results},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'{len(results)} HTTP checks passed; {output}')
