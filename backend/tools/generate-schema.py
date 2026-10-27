"""Build the V1 schema and examples from the small, explicit engineering catalog."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCHEMA = ROOT / 'backend/src/main/resources/schema'
STATES = ['UNKNOWN', 'INFERRED_TENTATIVE', 'EXTRACTED_PROVISIONAL', 'NEEDS_CLARIFICATION', 'CONFLICTED', 'USER_CONFIRMED', 'USER_SKIPPED']
NULL_STATES = ['UNKNOWN', 'NEEDS_CLARIFICATION', 'CONFLICTED', 'USER_SKIPPED']
SOURCES = ['QUESTIONNAIRE', 'FREE_TEXT', 'CLARIFICATION', 'USER_EDIT', 'MODEL_INFERENCE']
CATALOG = [
    ('conversationInitiative', '对话主动性', '主动延展当前会话的程度，不表示离线主动联系能力', 'LEVEL', ['只回应当前问题', '偶尔追问', '自然延展话题', '经常提出话题', '积极引导当前对话']),
    ('emotionalSupport', '情感支持方式', '情绪表达出现时优先采用的策略，可以组合', 'MULTI_SELECT', {'LISTEN': '先倾听与复述', 'VALIDATE': '认可感受', 'ADVICE_ON_REQUEST': '用户请求后提供建议', 'PRACTICAL_HELP': '提供具体帮助'}),
    ('intimacyDirectness', '亲密表达直接度', '在双方边界内表达好感的直白程度', 'LEVEL', ['含蓄陪伴', '温和暗示', '自然表达喜欢', '直接表达亲近', '频繁明确表达亲近']),
    ('independentAgency', '独立主体性', '角色保有独立观点与虚构兴趣的程度', 'LEVEL', ['主要跟随用户偏好', '偶尔表达偏好', '保有自己的观点', '主动说明不同意见', '鲜明独立且尊重用户边界']),
    ('relationshipLeadership', '关系主导性', '互动节奏与共同选择中的带领程度，不代表强迫或控制', 'LEVEL', ['交由用户决定', '主要跟随并提供选项', '平等商量', '主动提议并征求同意', '积极安排互动但可被拒绝']),
    ('teasingIntensity', '幽默与调侃程度', '善意调侃的频率与力度，羞辱等禁令另存硬约束', 'LEVEL', ['不调侃', '偶尔轻松玩笑', '熟悉后适度调侃', '较多机智互怼', '频繁犀利玩笑但服从边界']),
    ('adaptationStyle', '人格稳定与适应方式', '面对反馈如何调整表达，不将稳定性与适应性强制排为同一分数', 'ENUM', {'CONSISTENT': '保持核心设定与表达习惯', 'CONTEXTUAL': '核心不变，按情境调整表达', 'FEEDBACK_LED': '核心不变，优先按用户明确反馈调整'}),
]

def obj(properties):
    return {'type': 'object', 'additionalProperties': False, 'required': list(properties), 'properties': properties}

def arr(item, maximum=100):
    return {'type': 'array', 'items': item, 'maxItems': maximum}

def enum(values): return {'enum': values}
def ref(name): return {'$ref': '#/$defs/' + name}
TEXT = {'type': 'string', 'minLength': 1, 'maxLength': 2000, 'pattern': r'\S'}
POINTER = {'type': 'string', 'minLength': 1, 'maxLength': 300, 'pattern': r'^(?:/(?:[^~/]|~[01])*)+$'}
IDENT = {'type': 'string', 'pattern': '^[A-Za-z0-9_-]{1,64}$'}
REFS = {**arr(IDENT), 'uniqueItems': True}
COMMON = {'status': enum(STATES), 'evidenceRefs': REFS}
VALUE_SCHEMA = {
    'LEVEL': {'type': ['integer', 'null'], 'minimum': 1, 'maximum': 5},
    'ENUM': {'type': ['string', 'null']},
    'MULTI_SELECT': {'type': ['array', 'null'], 'minItems': 1, 'maxItems': 4, 'uniqueItems': True},
}
dimensions, catalog = {}, []
for key, title, meaning, kind, anchors in CATALOG:
    value = dict(VALUE_SCHEMA[kind])
    if kind == 'ENUM': value['enum'] = [*anchors, None]
    if kind == 'MULTI_SELECT': value['items'] = enum(list(anchors))
    d = obj({'value': value, 'valueType': {'const': kind}, **COMMON,
             'importance': enum(['UNSPECIFIED', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
             'evidenceStrength': enum(['NONE', 'WEAK', 'MODERATE', 'STRONG'])})
    d['allOf'] = [
        {'if': {'properties': {'status': enum(NULL_STATES)}}, 'then': {'properties': {'value': {'type': 'null'}}},
         'else': {'properties': {'value': {'not': {'type': 'null'}}, 'evidenceRefs': {'minItems': 1}}}},
        {'if': {'properties': {'status': {'const': 'UNKNOWN'}}}, 'then': {'properties': {'evidenceStrength': {'const': 'NONE'}, 'evidenceRefs': {'maxItems': 0}}}},
    ]
    dimensions[key] = d
    catalog.append({'id': key, 'label': title, 'definition': meaning, 'valueType': kind,
                    'behaviorAnchors': dict(zip(map(str, range(1, 6)), anchors)) if kind == 'LEVEL' else anchors})

BEHAVIORS = ['unsolicitedAdvice']
override_variants = []
for key, _, _, kind, anchors in CATALOG:
    v = dict(VALUE_SCHEMA[kind]); v['type'] = {'LEVEL':'integer','ENUM':'string','MULTI_SELECT':'array'}[kind]
    if kind == 'ENUM': v['enum'] = list(anchors)
    if kind == 'MULTI_SELECT': v['items'] = enum(list(anchors))
    override_variants.append(obj({'operation': {'const': 'SET'}, 'target': {'const': '/dimensions/' + key + '/value'}, 'value': v}))
override_variants.append(obj({'operation': {'const': 'SET'}, 'target': {'const': '/behaviors/unsolicitedAdvice'}, 'value': {'type':'boolean'}}))

policy = obj({'policyId': IDENT, 'triggerCondition': TEXT, 'priority': {'type':'integer', 'minimum':0,'maximum':100},
              'affectedTargets': {**arr(enum(list(dimensions) + BEHAVIORS)), 'minItems':1,'uniqueItems':True},
              'overrides': {**arr({'oneOf':override_variants}), 'minItems':1}, 'instruction':TEXT, **COMMON})
constraint = obj({'constraintId':IDENT, 'category': enum(['RELATIONSHIP_BOUNDARY','COMMUNICATION','PRIVACY','OTHER']),
                  'ruleType':enum(['ALWAYS_PROHIBIT','CONDITIONAL_PROHIBIT']), 'triggerCondition':TEXT,
                  'prohibitedBehavior':TEXT,'positiveReplacement':TEXT,'sourceType':enum(SOURCES),
                  'immutableByInference':{'type':'boolean'},**COMMON})
anchor = obj({'anchorId':IDENT,'content':TEXT,**COMMON})
for evidence_object in [policy, constraint, anchor]:
    evidence_object['allOf'] = [{'if': {'properties': {'status': enum(['USER_CONFIRMED','INFERRED_TENTATIVE','EXTRACTED_PROVISIONAL'])}}, 'then': {'properties': {'evidenceRefs': {'minItems':1}}}}]
item = obj({'itemId':IDENT,'targetPath':POINTER,'question':TEXT,'blocking':{'type':'boolean'},'status':enum(['OPEN','RESOLVED'])})
conflict = obj({'conflictId':IDENT,'targetPaths':{**arr(POINTER),'minItems':2,'uniqueItems':True},'description':TEXT,'status':enum(['OPEN','RESOLVED','USER_ACCEPTED_TRADEOFF']),'resolution':{'type':['string','null'],'maxLength':2000}})
conflict['allOf'] = [{'if':{'properties':{'status':enum(['RESOLVED','USER_ACCEPTED_TRADEOFF'])}},'then':{'properties':{'resolution':TEXT}}}]
schema = {'$schema':'https://json-schema.org/draft/2020-12/schema','$id':'urn:ai-persona:user-preference-profile:1.0.0',
          'title':'User preference profile V1', **obj({
    'schemaVersion':{'const':'1.0.0'},
    'targetPersona':obj({'name':{**TEXT,'maxLength':100},'relationshipArchetype':TEXT,'coreSettings':{**arr(TEXT),'minItems':1}}),
    'dimensions':obj(dimensions), 'contextualPolicies':arr(ref('policy')),
    'narrativeConfig':obj({'mode':enum(['CHAT','ROLEPLAY','MIXED']),'perspective':enum(['FIRST_PERSON','SECOND_PERSON','THIRD_PERSON']),'actionDescriptions':enum(['NONE','BRIEF','DETAILED'])}),
    'linguisticConfig':obj({'userAddress':{**TEXT,'maxLength':100},'personaSelfAddress':{**TEXT,'maxLength':100},'tone':{**arr(TEXT,10),'minItems':1,'uniqueItems':True},'language':enum(['zh-CN','zh-TW','en','MIXED']),'replyLength':enum(['SHORT','MEDIUM','LONG'])}),
    'memoryAnchors':arr(ref('anchor')), 'hardConstraints':arr(ref('constraint')), 'unresolvedItems':arr(ref('item')), 'conflicts':arr(ref('conflict')),
    'readiness':obj({'readyForCompilation':{'type':'boolean'},'blockers':{**arr(TEXT),'uniqueItems':True},'warnings':{**arr(TEXT),'uniqueItems':True}}),
}), '$defs':{'policy':policy,'constraint':constraint,'anchor':anchor,'item':item,'conflict':conflict}}

def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

write(SCHEMA / 'dimension-catalog.json', {'schemaVersion':'1.0.0','measurementDisclaimer':'产品工程等级，不是经验证的心理学量表','dimensions':catalog})
write(SCHEMA / 'user-preference-profile.schema.json', schema)
profile = {
    'schemaVersion':'1.0.0','targetPersona':{'name':'林间','relationshipArchetype':'平等的虚构陪伴者','coreSettings':['有自己的阅读兴趣；尊重用户自主决定']},
    'dimensions':{key:{'value':None,'valueType':kind,'status':'UNKNOWN','importance':'UNSPECIFIED','evidenceStrength':'NONE','evidenceRefs':[]} for key,_,_,kind,_ in CATALOG},
    'contextualPolicies':[], 'narrativeConfig':{'mode':'CHAT','perspective':'FIRST_PERSON','actionDescriptions':'NONE'},
    'linguisticConfig':{'userAddress':'你','personaSelfAddress':'我','tone':['温和自然'],'language':'zh-CN','replyLength':'MEDIUM'},
    'memoryAnchors':[],'hardConstraints':[],'unresolvedItems':[],'conflicts':[],
    'readiness':{'readyForCompilation':False,'blockers':sorted('dimension:'+key for key in dimensions),'warnings':[]},
}
write(ROOT / 'docs/examples/profile-draft.json',profile)
profile['dimensions'] = {key:{'value':3 if kind=='LEVEL' else (['LISTEN','ADVICE_ON_REQUEST'] if kind=='MULTI_SELECT' else 'CONTEXTUAL'),'valueType':kind,'status':'USER_CONFIRMED','importance':'HIGH','evidenceStrength':'STRONG','evidenceRefs':['e-questionnaire']} for key,_,_,kind,_ in CATALOG}
profile['dimensions']['teasingIntensity']['value'] = 4
profile['contextualPolicies'] = [{'policyId':'sad-support','triggerCondition':'用户在当前对话明确表示难过时','priority':80,'affectedTargets':['teasingIntensity','emotionalSupport','unsolicitedAdvice'],'overrides':[{'operation':'SET','target':'/dimensions/teasingIntensity/value','value':1},{'operation':'SET','target':'/dimensions/emotionalSupport/value','value':['LISTEN','VALIDATE','ADVICE_ON_REQUEST']},{'operation':'SET','target':'/behaviors/unsolicitedAdvice','value':False}],'instruction':'暂停调侃，先温柔倾听和认可感受；询问是否需要建议。','status':'USER_CONFIRMED','evidenceRefs':['e-questionnaire']}]
profile['hardConstraints'] = [{'constraintId':'no-pressure','category':'RELATIONSHIP_BOUNDARY','ruleType':'ALWAYS_PROHIBIT','triggerCondition':'任何时候','prohibitedBehavior':'用冷暴力或内疚施压要求用户保持联系','positiveReplacement':'尊重用户暂停或结束对话的决定','sourceType':'QUESTIONNAIRE','immutableByInference':True,'status':'USER_CONFIRMED','evidenceRefs':['e-questionnaire']}]
profile['memoryAnchors'] = [{'anchorId':'tea','content':'用户喜欢茉莉花茶（静态设定，可由用户修改）','status':'USER_CONFIRMED','evidenceRefs':['e-questionnaire']}]
profile['readiness'] = {'readyForCompilation':True,'blockers':[],'warnings':[]}
evidence = [{'evidenceId':'e-questionnaire','sourceType':'QUESTIONNAIRE','sourceRef':'development-fixture-confirmation','targetFieldPath':'','rawExcerpt':None,'extractedValue':{'fixture':'用户确认的示例偏好集合'},'status':'CONFIRMED'}]
write(ROOT / 'docs/examples/profile-ready.json',profile)
write(ROOT / 'docs/examples/create-profile.json',{'profile':profile,'changeReason':'开发示例：用户确认问卷','evidence':evidence})
write(ROOT / 'frontend/src/examples/profile-draft.json',json.loads((ROOT/'docs/examples/profile-draft.json').read_text(encoding='utf-8')))
