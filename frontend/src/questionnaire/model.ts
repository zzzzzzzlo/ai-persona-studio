export interface Option { id:string; text?:string; label?:string; value?:string }
export const optionText=(o:Option)=>o.label||o.text||o.value||o.id
export interface Field { fieldId:string; label:string; placeholder?:string; type?:string; required?:boolean; maxLength?:number; minItems?:number;maxItems?:number;defaultValue?:string;options?:Option[] }
export interface SubQuestion { subId:string;prompt:string;options:Option[] }
export interface Question { questionId:string;moduleId:string;title:string;questionType:string;required:boolean;allowSkip:boolean;minSelections?:number;maxSelections?:number;maxTextLength?:number;placeholder?:string;options?:Option[];fields?:Field[];subQuestions?:SubQuestion[];slots?:{slotId:string;label:string;placeholder?:string}[];selectionRules?:{exclusiveOptionIds:string[];message:string} }
export interface Questionnaire {questionnaireId:string;version:string;title:string;estimatedMinutes:string;totalQuestions:number;modules:{moduleId:string;title:string;description:string;questionIds:string[]}[];questions:Question[]}
export interface Answer {selectedOptionIds?:string[];text?:string;fields?:Record<string,string>;selections?:Record<string,string[]>;subAnswers?:Record<string,string[]>;customTexts?:Record<string,string>;anchors?:Record<string,string>;skipped?:boolean}
export interface Draft {questionnaireId:string;questionnaireVersion:string;currentIndex:number;answers:Record<string,Answer>;updatedAt:string;submissionId:string;attempted:boolean;stage:'intro'|'question'|'review'}
export interface Receipt {submissionId:string;profileId:string;profileVersion:number;questionnaireVersion:string;processingStatus:string;profileStatus:string;readyForCompilation:boolean;clarificationCount:number;pendingItemCount?:number;blockers:string[];warnings:string[];processedAt:string}
export const receiptPendingItemCount=(r:Receipt)=>r.pendingItemCount??r.blockers.length+r.warnings.length
export const id=()=>crypto.randomUUID()
export const draftKey=(q:Questionnaire)=>`ai-persona:questionnaire-draft:${q.questionnaireId}:${q.version}`
export const receiptKey=(q:Questionnaire)=>`ai-persona:questionnaire-receipt:${q.questionnaireId}:${q.version}`
export function blankDraft(q:Questionnaire):Draft{return {questionnaireId:q.questionnaireId,questionnaireVersion:q.version,currentIndex:0,answers:{},updatedAt:new Date().toISOString(),submissionId:id(),attempted:false,stage:'intro'}}
export function initialAnswer(q:Question):Answer{return {fields:Object.fromEntries((q.fields||[]).filter(f=>f.defaultValue).map(f=>[f.fieldId,f.defaultValue!])),selectedOptionIds:[],selections:{},subAnswers:{},customTexts:{},anchors:{}}}
function hasAnswerInput(a:Answer):boolean{
  return !!(a.selectedOptionIds?.length||a.text?.trim()||Object.values(a.fields||{}).some(v=>v.trim())||Object.values(a.customTexts||{}).some(v=>v.trim())||Object.values(a.anchors||{}).some(v=>v.trim())||Object.values(a.selections||{}).some(v=>v.length)||Object.values(a.subAnswers||{}).some(v=>v.length))
}
export type AnswerState='UNANSWERED'|'ANSWERED'|'SKIPPED'|'INVALID'
export const answerStateText:Record<AnswerState,string>={UNANSWERED:'未填写',ANSWERED:'已填写',SKIPPED:'已跳过',INVALID:'待修正'}
export function answerState(q:Question,a?:Answer):AnswerState{
  if(validateAnswer(q,a).length)return 'INVALID'
  if(a?.skipped===true)return 'SKIPPED'
  return a&&hasAnswerInput(a)?'ANSWERED':'UNANSWERED'
}
export function processedQuestionCount(q:Questionnaire,answers:Record<string,Answer>):number{return q.questions.filter(question=>['ANSWERED','SKIPPED'].includes(answerState(question,answers[question.questionId]))).length}
export function validateAnswer(q:Question,a?:Answer):string[]{
  if(a?.skipped===true&&hasAnswerInput(a))return ['跳过不能同时包含答案']
  if(!a||a.skipped===true||!hasAnswerInput(a))return q.required||!q.allowSkip?['请完成此题']:[]
  const errors:string[]=[]
  const choices=(values:string[],options:Option[],min:number,max:number)=>{if(values.length<min||values.length>max)errors.push(`请选择 ${min===max?min:`${min}–${max}`} 项`);if(new Set(values).size!==values.length||values.some(v=>!options.some(o=>o.id===v)))errors.push('含无效或重复选项')}
  const text=(value:string|undefined,required:boolean,max:number,label='内容')=>{if(required&&!value?.trim())errors.push(`请填写${label}`);if(value&&value.length>max)errors.push(`${label}超过 ${max} 字符`)}
  if(q.options){const single=q.questionType.startsWith('SINGLE_');choices(a.selectedOptionIds||[],q.options,single?1:q.minSelections||1,single?1:q.maxSelections||1);if((q.selectionRules?.exclusiveOptionIds||[]).some(v=>a.selectedOptionIds?.includes(v))&&(a.selectedOptionIds?.length||0)>1)errors.push(q.selectionRules!.message)}
  else if(q.fields)for(const f of q.fields){
    if(f.type?.startsWith('MULTI_')){const selected=a.selections?.[f.fieldId]||[],custom=a.customTexts?.[f.fieldId]?.trim();choices(selected,f.options||[],0,f.maxItems||4);const count=selected.length+(custom?1:0);if(count<(f.minItems||1)||count>(f.maxItems||4))errors.push(`${f.label}请选择 ${f.minItems||1}–${f.maxItems||4} 项`);text(custom,false,400,f.label)}
    else {const value=a.fields?.[f.fieldId];text(value,f.required!==false,f.maxLength||400,f.label);if(value&&f.options)choices([value],f.options,1,1);if(value==='ARC_CUSTOM')text(a.customTexts?.[f.fieldId],true,400,'自定义关系设定')}
  }
  else if(q.subQuestions)for(const sub of q.subQuestions)choices(a.subAnswers?.[sub.subId]||[],sub.options,1,1)
  else if(q.slots)for(const slot of q.slots)text(a.anchors?.[slot.slotId],false,2000,slot.label)
  else text(a.text,q.required,q.maxTextLength||4000)
  return errors
}
export function loadDraft(q:Questionnaire,storage:Storage):Draft|null{
  const raw=storage.getItem(draftKey(q));if(!raw)return null
  const d=JSON.parse(raw) as Draft
  if(d.questionnaireId!==q.questionnaireId||d.questionnaireVersion!==q.version||!d.answers||typeof d.answers!=='object'||Array.isArray(d.answers)||!Number.isInteger(d.currentIndex)||d.currentIndex<0||d.currentIndex>=q.questions.length||typeof d.submissionId!=='string'||!['intro','question','review'].includes(d.stage))throw Error('草稿格式不正确')
  const strings=(x:unknown)=>Array.isArray(x)&&x.every(v=>typeof v==='string')
  const record=(x:unknown,check:(v:unknown)=>boolean)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.values(x).every(check)
  for(const [key,a] of Object.entries(d.answers)){
    if(!q.questions.some(x=>x.questionId===key)||!a||typeof a!=='object'||Array.isArray(a))throw Error('草稿答案格式不正确')
    if(a.selectedOptionIds!==undefined&&!strings(a.selectedOptionIds)||a.text!==undefined&&typeof a.text!=='string'||a.skipped!==undefined&&typeof a.skipped!=='boolean')throw Error('草稿答案类型不正确')
    for(const field of ['fields','customTexts','anchors'] as const)if(a[field]!==undefined&&!record(a[field],v=>typeof v==='string'))throw Error('草稿字段类型不正确')
    for(const field of ['selections','subAnswers'] as const)if(a[field]!==undefined&&!record(a[field],strings))throw Error('草稿选项类型不正确')
  }
  return d
}
