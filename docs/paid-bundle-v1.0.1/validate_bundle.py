#!/usr/bin/env python3
"""Validate internal consistency of the AI persona paid questionnaire bundle.
This script does NOT replace validation against the real project JSON Schema.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def load(name):
    with (ROOT / name).open("r", encoding="utf-8") as f:
        return json.load(f)

def fail(msg):
    print(f"FAIL: {msg}")
    sys.exit(1)

qobj = load("paid-questionnaire-v1.json")
mapping = load("paid-scoring-mapping-v1.json")
clarification = load("paid-clarification-bank-v1.json")
sample = load("sample-valid-profile-v1.json")

questions = qobj.get("questions", [])
if len(questions) != qobj.get("totalQuestions"):
    fail("totalQuestions does not match the number of question objects")

root_ids = [q.get("questionId") for q in questions]
if len(root_ids) != len(set(root_ids)):
    fail("duplicate questionId")

all_ids = set(root_ids)
for q in questions:
    if q.get("required") == q.get("allowSkip"):
        fail(f"{q.get('questionId')}: required and allowSkip are inconsistent")
    opts = q.get("options", [])
    option_ids = [o.get("id") for o in opts]
    if len(option_ids) != len(set(option_ids)):
        fail(f"{q.get('questionId')}: duplicate option IDs")
    for sub in q.get("subQuestions", []):
        sub_id = sub.get("subId")
        all_ids.add(sub_id)
        sub_option_ids = [o.get("id") for o in sub.get("options", [])]
        if len(sub_option_ids) != len(set(sub_option_ids)):
            fail(f"{sub_id}: duplicate sub-question option IDs")

q12 = next((q for q in questions if q.get("questionId") == "Q12"), None)
if q12 is None or q12.get("minSelections") != 2 or q12.get("maxSelections") != 3:
    fail("Q12 must require 2–3 selections")
if any(o.get("mapping", {}).get("unselectedDefault") != "MEDIUM" for o in q12.get("options", [])):
    fail("Q12 unselected importance defaults are inconsistent")

q19 = next((q for q in questions if q.get("questionId") == "Q19"), None)
if q19 is None:
    fail("Q19 is missing")
q19_ids = {o.get("id") for o in q19.get("options", [])}
if "HC_OPT_00" not in q19_ids:
    fail("Q19 is missing HC_OPT_00 (no fixed constraints)")
if q19.get("maxSelections") != len(q19.get("options", [])):
    fail("Q19 maxSelections does not match its option count")
if q19.get("selectionRules", {}).get("exclusiveOptionIds") != ["HC_OPT_00"]:
    fail("Q19 HC_OPT_00 mutual-exclusion rule is missing")

q13 = next((q for q in questions if q.get("questionId") == "Q13"), None)
codes = {
    option.get("mapping", {}).get("tradeoffRule")
    for sub in (q13 or {}).get("subQuestions", [])
    for option in sub.get("options", [])
}
if codes != set(mapping.get("tradeoffRules", {}).keys()):
    fail("Q13 tradeoff codes do not match mapping rules")

for dimension, rule in mapping.get("dimensionSynthesisRules", {}).items():
    for ref in rule.get("primaryQuestions", []):
        if ref.get("questionId") not in all_ids:
            fail(f"{dimension} references missing question/sub-question {ref.get('questionId')}")

for q in questions:
    for option in q.get("options", []):
        for override in option.get("mapping", {}).get("overrides", []):
            if override.get("target") == "/behaviors/unsolicitedAdvice":
                fail(f"{q.get('questionId')} writes to an unsupported behavior path")

for policy in sample.get("contextualPolicies", []):
    for override in policy.get("overrides", []):
        if override.get("target") == "/behaviors/unsolicitedAdvice":
            fail(f"{policy.get('policyId')} writes to an unsupported behavior path")

if sample.get("schemaVersion") != qobj.get("targetSchemaVersion"):
    fail("sample profile schemaVersion does not match questionnaire targetSchemaVersion")

required_count = sum(1 for q in questions if q.get("required"))
optional_count = len(questions) - required_count
print("PASS: internal bundle consistency checks")
print(f"Questions: {len(questions)} total; {required_count} required; {optional_count} optional")
print(f"Q19 options: {len(q19.get('options', []))}, including mutually exclusive HC_OPT_00")
print(f"Q13 tradeoff rules: {len(codes)}")
print("NOTE: run the actual project's JSON Schema and Java ProfileRules validation separately.")
