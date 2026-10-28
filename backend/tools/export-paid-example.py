"""Export a real persisted browser submission through the development read APIs."""
import argparse
import json
from pathlib import Path
from urllib.request import Request, urlopen

parser = argparse.ArgumentParser()
parser.add_argument('--base-url', default='http://127.0.0.1:8080/api/v1')
parser.add_argument('--profile-id', required=True)
parser.add_argument('--submission-id', required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[2]

def call(path, body=None):
    request = Request(args.base_url + path, data=None if body is None else json.dumps(body).encode('utf-8'), headers={'Content-Type':'application/json'})
    with urlopen(request, timeout=15) as response:
        return json.load(response)

profile = call('/profiles/' + args.profile_id)
evidence = call('/profiles/' + args.profile_id + '/evidence')
receipt = call('/questionnaire-submissions/' + args.submission_id)
validation = call('/profiles/validate', {'profile':profile['current']['profile']})
assert validation['valid'] and receipt['profileId'] == profile['profileId']
known = {item['evidenceId'] for item in evidence}

def references(node):
    if isinstance(node, dict):
        for ref in node.get('evidenceRefs', []):
            assert ref in known, ref
        for value in node.values(): references(value)
    elif isinstance(node, list):
        for value in node: references(value)

references(profile['current']['profile'])
for name, content in [('paid-browser-profile.json',profile['current']['profile']),('paid-browser-evidence.json',evidence),('paid-browser-receipt.json',receipt),('paid-browser-validation.json',validation)]:
    (root / 'docs' / 'examples' / name).write_text(json.dumps(content, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'profileId':args.profile_id,'version':profile['currentVersion'],'evidenceRecords':len(evidence),'schemaAndRulesValid':validation['valid'],'allReferencesExist':True}, ensure_ascii=False))
