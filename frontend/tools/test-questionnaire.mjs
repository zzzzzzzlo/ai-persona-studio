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
test('Option labels include the eight value-based tone tags and ID fallback',()=>{
 const options=config.questions.find(q=>q.questionId==='Q22').fields.find(f=>f.fieldId==='toneTags').options
 assert.equal(options.length,8)
 for(const o of options){assert.equal(M.optionText(o),o.value);assert.ok(M.optionText(o).trim());assert.notEqual(M.optionText(o),o.id)}
 assert.equal(M.optionText({id:'test',label:'label',text:'text',value:'value'}),'label')
 assert.equal(M.optionText({id:'test',text:'text',value:'value'}),'text')
 assert.equal(M.optionText({id:'test'}),'test')
})
test('Optional text distinguishes unanswered, skipped, answered and invalid',()=>{
 const q=config.questions.find(q=>q.questionId==='Q25')
 for(const a of [undefined,{},M.initialAnswer(q),{text:''},{text:'  '}]){assert.equal(M.answerState(q,a),'UNANSWERED');assert.deepEqual(M.validateAnswer(q,a),[])}
 assert.equal(M.answerState(q,{skipped:true}),'SKIPPED')
 assert.equal(M.answerState(q,{text:' 有效内容 '}),'ANSWERED')
 assert.equal(M.answerState(q,{text:'x'.repeat(4001)}),'INVALID')
 assert.equal(M.answerState(q,{skipped:true,text:'仍有内容'}),'INVALID')
})
test('Blank anchors and untouched optional choices never count as answered',()=>{
 const memory=config.questions.find(q=>q.questionId==='Q24'),anchors=Object.fromEntries(memory.slots.map(s=>[s.slotId,'  ']))
 assert.equal(M.answerState(memory,{anchors}),'UNANSWERED')
 anchors[memory.slots[1].slotId]='喜欢一起散步'
 assert.equal(M.answerState(memory,{anchors}),'ANSWERED')
 const optional=config.questions.find(q=>q.questionId==='Q03');assert.equal(M.answerState(optional,M.initialAnswer(optional)),'UNANSWERED')
 const required=config.questions.find(q=>q.questionId==='Q04');assert.equal(M.answerState(required,{}),'INVALID');assert.equal(M.answerState(required,{skipped:true}),'INVALID')
 assert.equal(M.answerState(config.questions[0],{fields:{personaName:'只有名字'}}),'INVALID')
 assert.equal(M.answerState(config.questions[12],{subAnswers:{Q13_A:['A1']}}),'INVALID')
})
test('Review labels and overall processed progress share the same state definition',()=>{
 const answers={Q03:{skipped:true},Q04:fixture.answers.Q04,Q24:{anchors:{anc_rel_origin:''}},Q25:{text:' '},Q26:{text:'已填写'}}
 assert.equal(M.processedQuestionCount(config,answers),3)
 assert.equal(M.answerStateText[M.answerState(config.questions[2],answers.Q03)],'已跳过')
 assert.equal(M.answerStateText[M.answerState(config.questions[3],answers.Q04)],'已填写')
 assert.equal(M.answerStateText[M.answerState(config.questions[23],answers.Q24)],'未填写')
 assert.equal(M.answerStateText[M.answerState(config.questions[0],answers.Q01)],'待修正')
 assert.equal(M.processedQuestionCount(config,fixture.answers),26)
})
test('Pending receipt total supports both current and cached legacy receipts',()=>{
 const old={clarificationCount:25,blockers:['dimension:a','policy:b'],warnings:['unresolved:c']}
 assert.equal(M.receiptPendingItemCount(old),3)
 assert.equal(M.receiptPendingItemCount({...old,clarificationCount:1,pendingItemCount:3}),3)
 assert.equal(M.receiptPendingItemCount({...old,pendingItemCount:0}),0)
})
console.log(`${count} questionnaire test groups passed.`)
