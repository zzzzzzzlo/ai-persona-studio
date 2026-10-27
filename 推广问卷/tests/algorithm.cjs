const { readFileSync, mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');
const assert = require('node:assert/strict');
const root = join(__dirname, '..');
const files = ['data/config', 'data/questions', 'data/personas', 'data/resultCopy', 'data/aiConfig', 'data/aiConfigCopy', 'logic/scoring', 'logic/matcher', 'logic/aiScoring', 'logic/aiProfile', 'logic/displayMetrics', 'logic/state', 'logic/insights', 'ui/xhsBridge', 'logic/storage'];
function environment(xhs) {
  const items = new Map();
  const window = { xhs, localStorage: { getItem: k => items.get(k) || null, setItem: (k, v) => items.set(k, v), removeItem: k => items.delete(k) } };
  const context = vm.createContext({ window, console });
  for (const file of files) vm.runInContext(readFileSync(join(root, 'src', file + '.js'), 'utf8'), context, { filename: file });
  window.HeartTest.notify = () => {};
  return { A: window.HeartTest, items, window, context };
}
const { A } = environment();
const plain = x => JSON.parse(JSON.stringify(x));
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-12, `${a} != ${b}`);
let passed = 0;
async function check(label, fn) { await fn(); passed++; console.log('PASS ' + label); }
let seed = 1729;
function next() { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }
const witnesses = {};

(async () => {
  await check('Exact V2 questions/scores and unchanged V1 personas, copy, matcher', () => {
    const expected = [[1,-2,2,-1],[-2,-1,1,2],[1,-2,2,-1],[-1,2,-2,1],[1,-2,2,-1],[-1,2,-2,1],[1,-2,2,-1],[-1,2,-2,1],[2,-1,-2,1],[1,-2,2,-1],[1,-2,2,-1],[1,2,-2,-1],[1,-2,2,-1],[-1,2,-2,1],[-2,-1,1,2],[-2,-1,1,2],[-2,-1,1,2],[-2,-1,1,2]];
    assert.equal(A.questions.length,18);
    assert.deepEqual(plain(A.questions.map(q => q.options.map(o => o.scores[q.dimension]))), expected);
    assert.deepEqual(plain(A.questions[3].options.map(o=>o.scores.M)),[1,2,-2,2]);
    assert.deepEqual(plain(A.questions[7].options.map(o=>o.scores.L)),[0,1,-1,2]);
    assert.deepEqual(plain(A.questions[9].options.map(o=>o.scores.L)),[1,-2,2,1]);
    assert.equal(A.questions[1].options[3].text,'TA已经留了几条消息，分享今天发生的小事，还问你什么时候有空聊聊。');
    assert.deepEqual(plain(A.questions[1].options[3].scores),{I:2});
    const brief = readFileSync(join(root, 'docs/requirements-v2.txt'), 'utf8').replace(/\r\n/g, '\n');
    for (const q of A.questions) { assert.ok(brief.includes(q.prompt)); if(q.description) assert.ok(brief.includes(q.description)); for (const o of q.options) assert.ok(brief.includes(o.text)); }
    const baseline=JSON.parse(readFileSync(join(root,'docs/v1-baseline.json'),'utf8').replace(/^\uFEFF/,''));
    for(const file of baseline) { const relative=file.Path.split('\\').slice(-3).join('/'); assert.equal(createHash('sha256').update(readFileSync(join(root,relative))).digest('hex').toUpperCase(),file.Hash); }
  });
  await check('Editing a previous answer recomputes without accumulation', () => {
    const answers = Array(18).fill(null); answers[0] = 'C'; answers[1] = 'D'; close(A.score(answers)[0],1);
    answers[0] = 'B'; close(A.score(answers)[0],0); answers[0]='A'; close(A.score(answers)[0],.75); close(A.score(answers)[0],.75);
  });
  await check('All 10,000 scored vectors stay inside [-1,1], P1 always minimal', () => {
    for (let n=0;n<10000;n++) {
      const answers=A.questions.map(q=>q.options[Math.floor(next()*q.options.length)].id);
      const v=A.score(answers), r=A.match(v);
      v.forEach((value,i)=>close(value,(A.questions[i*2].options.find(o=>o.id===answers[i*2]).scores[A.config.dimensions[i]]+A.questions[i*2+1].options.find(o=>o.id===answers[i*2+1]).scores[A.config.dimensions[i]])/4));
      Object.values(A.scoreAI(answers)).forEach(value=>assert.ok(Number.isFinite(value)&&value>=-1&&value<=1));
      v.forEach(x=>assert.ok(x>=-1&&x<=1));
      for(let i=1;i<12;i++) assert.ok(r.ranking[i-1].distance<=r.ranking[i].distance);
      assert.equal(r.primary.id,r.ranking[0].persona.id);
      if(!witnesses[r.mode]) witnesses[r.mode]={answers,vector:plain(v),primary:r.primary.id,secondary:r.secondary.id,margin:r.margin};
    }
    assert.ok(witnesses.single&&witnesses.secondary&&witnesses.dual);
  });
  await check('Q15–Q18 never affect personality matching; auxiliary scores stay separate', () => {
    const answers=A.questions.map(q=>q.options[0].id), before=plain(A.match(A.score(answers)));
    for(const a of ['A','B','C','D']) for(const b of ['A','B','C','D']) for(const c of ['A','B','C','D']) for(const d of ['A','B','C','D']) {
      answers.splice(14,4,a,b,c,d); const result=A.evaluateAnswers(answers); assert.deepEqual(plain(result.vector),before.vector); assert.equal(result.primary.id,before.primary.id); assert.equal(result.secondary.id,before.secondary.id); assert.equal(result.mode,before.mode);
    }
    for(const [index,dimension] of [[3,'M'],[7,'L'],[9,'L']]) { const option=A.questions[index].options[0], old=option.scores[dimension]; option.scores[dimension]=old===2?-2:2; assert.deepEqual(plain(A.score(answers)),before.vector); option.scores[dimension]=old; }
    const strong=A.questions.map(q=>q.kind==='scenario'?q.options.find(o=>o.scores[q.dimension]===2).id:'B'); A.score(strong).forEach(x=>close(x,1));
  });
  await check('All 12 prototypes rank first both at centers and reachable quiz answers', () => {
    for(const p of A.personas) {
      const r=A.match(p.center); assert.equal(r.primary.id,p.id); close(r.ranking[0].distance,0);
      let found=null;
      const answers=[];
      for(let d=0;d<7;d++) {
        const dimension=A.config.dimensions[d], target=p.center[d]; let best=null;
        for(const first of A.questions[d*2].options) for(const second of A.questions[d*2+1].options) {
          const error=Math.abs((first.scores[dimension]+second.scores[dimension])/4-target); if(!best||error<best.error) best={error,first,second};
        }
        answers.push(best.first.id,best.second.id);
      }
      answers.push('A','B','C','D');
      if(A.match(A.score(answers)).primary.id===p.id) found=answers;
      assert.ok(found,'Unreachable persona '+p.name); witnesses[p.id]={answers:found,vector:plain(A.score(found))};
    }
  });
  await check('Weighted RMS distance matches independent hand calculation', () => {
    close(A.weightedDistance([1,0],[0,1],[3,1]),1);
    close(A.weightedDistance([.5,-.25],[0,.25],[2,6]),.5);
    const p=A.personas[0], v=[1,-1,.5,-.5,1,0,.25]; const manual=Math.sqrt(v.reduce((s,x,i)=>s+p.weights[i]*(x-p.center[i])**2,0)/p.weights.reduce((s,x)=>s+x,0)); close(A.weightedDistance(v,p.center,p.weights),manual);
  });
  await check('single / secondary / dual boundaries are exact', () => {
    assert.equal(A.classifyMargin(0),'dual'); assert.equal(A.classifyMargin(.019999999),'dual'); assert.equal(A.classifyMargin(.02),'secondary'); assert.equal(A.classifyMargin(.059999999),'secondary'); assert.equal(A.classifyMargin(.06),'single');
  });
  await check('Metrics are deterministic, in configured range and rounded to 5%', () => {
    for(const p of A.personas) for(const value of [-1,0,1]) {
      const vector=Array(7).fill(value), metrics=A.displayMetrics(p,vector);
      assert.deepEqual(plain(metrics),plain(A.displayMetrics(p,vector)));
      metrics.forEach((m,i)=>{assert.equal(m.value%5,0);assert.ok(m.value>=p.metrics[i].min&&m.value<=p.metrics[i].max);});
    }
    const p=A.personas.find(p=>p.id==='5'); assert.ok(A.displayMetrics(p,Array(7).fill(-1))[0].value>=70);
  });
  await check('localStorage restores answers and recomputes identical results', async () => {
    const { A: B, items }=environment(); await B.storage.init(); const state=B.initialState(); state.answers=witnesses.dual.answers.slice(); state.result=B.evaluateAnswers(state.answers); state.view='result'; state.index=17;
    await B.storage.save(state); const raw=JSON.parse(items.get(B.config.storageKey)); raw.result.vector=Array(7).fill(999); raw.result.primaryId='fake';
    raw.result.aiScores={M:999,G:999,R:999,L:999};
    const restored=B.restoreState(raw); assert.deepEqual(plain(restored.result.vector),plain(state.result.vector)); assert.deepEqual(plain(restored.result.aiScores),plain(state.result.aiScores)); assert.equal(restored.result.primary.id,state.result.primary.id);
    const partial=B.initialState(); partial.answers[0]='A'; partial.index=1; partial.view='quiz'; await B.storage.save(partial); const resumed=B.restoreState(await B.storage.init()); assert.equal(resumed.index,1); assert.equal(resumed.answers[0],'A');
  });
  await check('Clear removes queued writes and restores initial state', async () => {
    const { A:B,items }=environment(); await B.storage.init(); const state=B.initialState(); state.answers[0]='B'; B.storage.save(state); B.storage.save(state); await B.storage.clear(); assert.equal(items.has(B.config.storageKey),false); assert.deepEqual(plain(B.restoreState(await B.storage.init())),plain(B.initialState()));
  });
  await check('Native Storage priority and low-version migration', async () => {
    const native=new Map(),calls=[]; const sdk={ getStorage:async({key})=>({data:native.get(key)||null}), setStorage:async({key,data})=>{calls.push('set');native.set(key,data);}, removeStorage:async({key})=>native.delete(key) };
    const {A:B,items}=environment({launchOptions:{miniToolEnv:{buildVersion:9462004}},miniTool:sdk}); const state=B.initialState();state.answers[0]='C';items.set(B.config.storageKey,JSON.stringify(state));
    const restored=await B.storage.init();assert.equal(restored.answers[0],'C');assert.equal(B.storage.backend(),'xhs-storage');assert.ok(native.has(B.config.storageKey));assert.equal(items.has(B.config.storageKey),false);
    await B.storage.save(state);await B.storage.clear();assert.equal(native.size,0);assert.ok(calls.length>=2);
    const {A:C}=environment({launchOptions:{miniToolEnv:{buildVersion:9459004}},miniTool:sdk});await C.storage.init();assert.equal(C.storage.backend(),'localStorage');
  });
  await check('Corrupt state and denied storage degrade safely', async () => {
    for(const invalid of [null,{version:99,answers:Array(15).fill('A')},{version:1,answers:Array(15).fill('X')},{version:1,answers:[]}]) assert.deepEqual(plain(A.restoreState(invalid)),plain(A.initialState()));
    assert.throws(()=>A.match([NaN,0,0,0,0,0,0]));assert.throws(()=>A.score(['A']));
    const {A:B,window}=environment();window.localStorage={getItem:()=>{throw Error();},setItem:()=>{throw Error();},removeItem:()=>{throw Error();}};assert.equal(await B.storage.init(),null);assert.equal(await B.storage.save(B.initialState()),false);assert.equal(await B.storage.clear(),false);
  });
  await check('AI weighting matches independent formulas for every memory/life combination', () => {
    const answers=Array(18).fill('A');
    const score=(index,d)=>A.questions[index].options.find(o=>o.id===answers[index]).scores[d];
    for(const q4 of ['A','B','C','D']) for(const q15 of ['A','B','C','D']) { answers[3]=q4; answers[14]=q15; close(A.scoreAI(answers).M,.75*score(14,'M')/2+.25*score(3,'M')/2); }
    for(const q8 of ['A','B','C','D']) for(const q10 of ['A','B','C','D']) for(const q18 of ['A','B','C','D']) { answers[7]=q8; answers[9]=q10; answers[17]=q18; close(A.scoreAI(answers).L,.60*score(17,'L')/2+.20*score(7,'L')/2+.20*score(9,'L')/2); }
    for(const choice of ['A','B','C','D']) { answers[15]=choice;answers[16]=choice;close(A.scoreAI(answers).G,score(15,'G')/2);close(A.scoreAI(answers).R,score(16,'R')/2); }
  });
  await check('AI label boundaries cover all legal values and map to distinct data-driven copy', () => {
    for(const d of A.aiConfig.dimensions) {
      const boundary=d==='G'||d==='R'?-.75:-.5;
      for(const [value,index] of [[-1,0],[boundary,0],[boundary+.000001,1],[.25,1],[.250001,2],[1,2]]) assert.equal(A.aiLabel(d,value).key,A.aiConfig.fields[d].bands[index].key);
      for(let i=0;i<=2000;i++) { const label=A.aiLabel(d,-1+i/1000); assert.ok(label&&A.aiConfigCopy[d][label.key]); }
      assert.equal(new Set(Object.values(A.aiConfigCopy[d])).size,3);
      assert.equal(A.aiLabel(d,NaN),null); assert.equal(A.aiLabel(d,null),null);
    }
    assert.equal(A.buildAIProfile({M:1,G:1,R:1,L:1}).length,4);
    assert.deepEqual(plain(A.aiConfig.fields.M.bands.map(b=>b.max)),[-.5,.25,1]);
    assert.deepEqual(plain(A.aiConfig.fields.L.bands.map(b=>b.max)),[-.5,.25,1]);
  });
  await check('Q16/Q17 A–D reach the requested labels through complete quiz answers', () => {
    const answers=Array(18).fill('A');
    const expected={G:['稳定型','适应型','成长型','成长型'],R:['日常陪伴为主','轻剧情型','沉浸剧情 / 自由切换型','沉浸剧情 / 自由切换型']};
    for(const [i,choice] of ['A','B','C','D'].entries()) {
      answers[15]=choice;answers[16]=choice;
      const result=A.evaluateAnswers(answers),profile=A.buildAIProfile(result.aiScores);
      for(const dimension of ['G','R']) assert.equal(profile.find(p=>p.dimension===dimension).label,expected[dimension][i]);
    }
  });
  await check('All four AI fields render each label and its corresponding copy', () => {
    const {A:B,context}=environment();
    context.document={documentElement:{getAttribute:()=>null}};
    for(const file of ['ui/common','ui/result']) vm.runInContext(readFileSync(join(root,'src',file+'.js'),'utf8'),context);
    const keys={M:['light','light','focused','deep'],G:['stable','adaptive','adaptive','growing'],R:['daily','light','light','immersive'],L:['quiet','quiet','subtle','independent']};
    for(const [i,score] of [-1,-.5,0,1].entries()) {
      const result=B.match(B.personas[0].center);result.aiScores={M:score,G:score,R:score,L:score};
      const html=B.resultHTML(result,false);
      assert.equal((html.match(/class="profile-item"/g)||[]).length,4);
      for(const d of B.aiConfig.dimensions) {
        const band=B.aiConfig.fields[d].bands.find(b=>b.key===keys[d][i]);
        assert.ok(html.includes(B.escape(band.label)));
        assert.ok(html.includes(B.escape(B.aiConfigCopy[d][band.key])));
      }
    }
  });
  await check('Missing/sparse/invalid answers have explicit safe behavior and no NaN', () => {
    const empty=Array(18).fill(null); assert.deepEqual(plain(A.score(empty)),Array(7).fill(0));assert.deepEqual(plain(A.scoreAI(empty)),{M:null,G:null,R:null,L:null});assert.throws(()=>A.evaluateAnswers(empty),/18/);
    assert.equal(A.validAnswers(new Array(18)),false); assert.throws(()=>A.scoreAI(new Array(18))); assert.throws(()=>A.scoreAI(Array(18).fill('Z')));
    const partial=Array(18).fill('A'); partial[3]=null; assert.equal(A.scoreAI(partial).M,null);assert.ok(Number.isFinite(A.scoreAI(partial).L));
    assert.ok(A.buildAIProfile(A.scoreAI(empty)).every(item=>item.label==='待完成设定'));
  });
  await check('Transition and edit refresh restore correctly; V1 records are kept separately', async () => {
    const state=A.initialState();state.answers.splice(0,14,...Array(14).fill('A'));state.index=14;state.view='transition'; const restored=A.restoreState(A.snapshot(state));assert.equal(restored.view,'transition');assert.equal(restored.index,14);
    state.answers=Array(18).fill('A');state.index=15;state.view='quiz';assert.equal(A.restoreState(A.snapshot(state)).view,'quiz');assert.equal(A.restoreState(A.snapshot(state)).index,15);
    const {A:B,items}=environment();items.set('ai-heart-personality-v1','old-v1-record');await B.storage.init();await B.storage.save(B.initialState());await B.storage.clear();assert.equal(items.get('ai-heart-personality-v1'),'old-v1-record');
  });
  await check('JSBridge media payloads, missing SDK, and rejection handling', async () => {
    assert.equal(await A.bridge.save('data:image/png;base64,a'),false);
    const calls=[];const {A:B}=environment({miniTool:{writeTempFile:async(o)=>{calls.push(o);return{filePath:'local-test-path'};},saveImageToPhotosAlbum:async(o)=>calls.push(o),postNote:async(o)=>calls.push(o)}});
    const r=B.match(B.personas[0].center);await B.bridge.save('data:image/png;base64,a');await B.bridge.post('data:image/png;base64,a',r);
    assert.deepEqual(plain(calls[0]),{data:'data:image/png;base64,a'});assert.deepEqual(plain(calls[1]),{filePath:'local-test-path'});assert.equal(calls[3].mediaInfo.image_resources[0].url,'local-test-path');assert.ok(calls[3].title.length<=20);
    const {A:C}=environment({miniTool:{saveImageToPhotosAlbum:async()=>{throw Error('denied');}}});await assert.rejects(()=>C.bridge.save('data:image/png;base64,a'));
  });
  mkdirSync(join(root,'output'),{recursive:true});writeFileSync(join(root,'output/algorithm-witnesses.json'),JSON.stringify(witnesses,null,2));
  console.log(`\n${passed} test groups passed. Browser overflow checks run separately.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
