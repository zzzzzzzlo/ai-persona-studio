import {spawnSync} from 'node:child_process'
import {createRequire} from 'node:module'
import {readFileSync,mkdirSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {join,dirname} from 'node:path'
import assert from 'node:assert/strict'
const root=join(dirname(fileURLToPath(import.meta.url)),'..'),output=join(root,'../output/paid-model')
mkdirSync(output,{recursive:true})
const built=spawnSync(process.execPath,[join(root,'node_modules/typescript/bin/tsc'),'src/questionnaire/model.ts','--outDir',output,'--target','ES2022','--module','commonjs','--skipLibCheck','--types','node','--noEmit','false'],{cwd:root,stdio:'inherit'})
if(built.status)process.exit(built.status)
const require=createRequire(import.meta.url),M=require(join(output,'model.js'))
const config=JSON.parse(readFileSync(join(root,'../backend/src/main/resources/questionnaire/paid-questionnaire-v1.json'),'utf8'))
const fixture=JSON.parse(readFileSync(join(root,'../docs/examples/paid-submission.json'),'utf8'))
let count=0
function test(label,fn){fn();count++;console.log('PASS '+label)}
test('All 26 real configured question types accept the complete fixture',()=>{for(const q of config.questions)assert.deepEqual(M.validateAnswer(q,fixture.answers[q.questionId]),[],q.questionId)})
test('Required, selection counts, duplicate and foreign IDs are rejected',()=>{
 assert.ok(M.validateAnswer(config.questions[3],{}).length)
 assert.ok(M.validateAnswer(config.questions[11],{selectedOptionIds:['IMP_SUPPORT']}).length)
 assert.ok(M.validateAnswer(config.questions[5],{selectedOptionIds:['LISTEN','LISTEN']}).length)
 assert.ok(M.validateAnswer(config.questions[3],{selectedOptionIds:['IMP_SUPPORT']}).length)
 assert.ok(M.validateAnswer(config.questions[18],{selectedOptionIds:['HC_OPT_00','HC_OPT_03']}).length)
})
test('Versioned local draft restores single, multi, structured, free text and position',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)}
 const draft=M.blankDraft(config);draft.currentIndex=24;draft.stage='question';draft.answers=fixture.answers;draft.answers.Q25={text:'尚未提交的输入'}
 storage.setItem(M.draftKey(config),JSON.stringify(draft));assert.deepEqual(M.loadDraft(config,storage),draft)
 assert.ok(M.draftKey(config).endsWith(config.questionnaireId+':1.0.1'))
})
test('Corrupt and cross-version drafts cannot be restored',()=>{
 const draft=M.blankDraft(config);draft.answers.Q06={selectedOptionIds:'not-an-array'}
 assert.throws(()=>M.loadDraft(config,{getItem:()=>JSON.stringify(draft)}))
 draft.answers={};draft.questionnaireVersion='old';assert.throws(()=>M.loadDraft(config,{getItem:()=>JSON.stringify(draft)}))
})
test('Skipped optional questions are valid and required skips fail',()=>{
 assert.deepEqual(M.validateAnswer(config.questions[24],{skipped:true}),[])
 assert.ok(M.validateAnswer(config.questions[3],{skipped:true}).length)
})
test('Custom archetype and tone bounds are validated',()=>{
 const a=structuredClone(fixture.answers.Q01);a.fields.archetypePreset='ARC_CUSTOM';assert.ok(M.validateAnswer(config.questions[0],a).length)
 a.customTexts={archetypePreset:'同行的虚构伴侣'};assert.deepEqual(M.validateAnswer(config.questions[0],a),[])
 const language=structuredClone(fixture.answers.Q22);language.selections.toneTags=['TONE_01','TONE_02','TONE_03','TONE_04'];language.customTexts={toneTags:'额外描述'};assert.ok(M.validateAnswer(config.questions[21],language).length)
})
console.log(`${count} questionnaire test groups passed.`)
