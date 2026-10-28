async(page)=>{
  const assert=(ok,message)=>{if(!ok)throw Error(message)}
  const errors=[],requests=[]
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/api/v1/'))requests.push({method:r.method(),url:r.url()})})
  await page.setViewportSize({width:390,height:844})
  await page.goto('http://127.0.0.1:5180/questionnaire')
  await page.locator('.paid-intro,.paid-success,.paid-step,.paid-review').waitFor()
  await page.evaluate(()=>{for(const key of Object.keys(localStorage))if(key.startsWith('ai-persona:questionnaire-'))localStorage.removeItem(key)})
  const configResponse=page.waitForResponse(r=>r.url().includes('/questionnaires/')&&r.status()===200)
  await page.reload();const config=await(await configResponse).json()
  await page.getByRole('button',{name:'开始塑造 TA',exact:true}).waitFor()
  await page.screenshot({path:'output/playwright/paid-intro.png',fullPage:true,animations:'disabled'})
  await page.getByRole('button',{name:'开始塑造 TA',exact:true}).click()
  await page.getByRole('button',{name:'下一题',exact:false}).click();assert(await page.getByRole('alert').count()>0,'Required validation missing')
  const expectedAnswers={};let toneLabels=[]
  for(let index=0;index<config.questions.length;index++){
    const q=config.questions[index]
    await page.locator('.paid-card h1').waitFor();assert(await page.locator('.paid-card h1').textContent()===q.title,'Question sequence '+q.questionId)
    if(q.options&&q.questionId!=='Q18'){
      const count=q.minSelections||1
      for(let i=0;i<count;i++){
        await page.locator('[data-option="'+(q.questionId==='Q03'?'D':q.options[i].id)+'"]').click()
        if(q.questionId==='Q12'&&i===0){await page.getByRole('button',{name:'下一题',exact:false}).click();assert(await page.locator('.paid-field-errors').count()===1,'Multi minimum not validated')}
      }
    }else if(q.fields){
      for(const field of q.fields){
        if(field.type?.startsWith('MULTI_')){
          const buttons=page.locator('.paid-chips button');assert(await buttons.count()===8,'Expected all 8 tone tags')
          for(let i=0;i<8;i++){const button=buttons.nth(i),text=(await button.innerText()).trim();assert(await button.isVisible()&&text.length>0,'Tone tag has no visible text '+i);assert(text===field.options[i].value,'Tone label changed '+i);toneLabels.push(text)}
          await buttons.first().click();assert(await buttons.first().getAttribute('aria-pressed')==='true','Tone tag selection failed')
          await page.screenshot({path:'output/playwright/paid-tone-tags.png',fullPage:true,animations:'disabled'})
        }
        else if(field.options)await page.getByRole('combobox',{name:field.label,exact:true}).selectOption(field.defaultValue||field.options[0].id)
        else await page.getByRole('textbox',{name:field.label,exact:true}).fill(field.defaultValue|| (field.fieldId==='personaName'?'林间':field.fieldId.includes('Address')?'小林':'认识七年，喜欢散步和阅读的虚构伴侣。'))
      }
    }else if(q.subQuestions){for(let i=0;i<q.subQuestions.length;i++)await page.locator('.paid-subquestions section').nth(i).getByRole('button').first().click()}
    else if(q.slots){
      const progress=Number(await page.getByRole('progressbar').getAttribute('aria-valuenow'))
      for(const slot of q.slots)await page.getByRole('textbox',{name:slot.label,exact:true}).fill('相识七年，一起散步，尊重各自的生活。')
      assert(Number(await page.getByRole('progressbar').getAttribute('aria-valuenow'))===progress+1,'Filled anchors not counted')
      for(const slot of q.slots)await page.getByRole('textbox',{name:slot.label,exact:true}).fill('')
      assert(Number(await page.getByRole('progressbar').getAttribute('aria-valuenow'))===progress,'Empty anchors counted as completed')
    }
    else if(!q.options)await page.getByRole('textbox',{name:q.title,exact:true}).fill(q.questionId==='Q20'?'':'希望在我情绪低落时先倾听，不替我决定。')
    if(index===0||index===5||index===24){
      const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('ai-persona:questionnaire-draft:')))))
      expectedAnswers[q.questionId]=saved.answers[q.questionId]
      await page.reload();await page.locator('.paid-step').waitFor()
      const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('ai-persona:questionnaire-draft:')))))
      assert(JSON.stringify(restored.answers[q.questionId])===JSON.stringify(expectedAnswers[q.questionId]),'Draft restore '+q.questionId)
    }
    if(index===0)await page.screenshot({path:'output/playwright/paid-identity.png',fullPage:true,animations:'disabled'})
    if(index===5)await page.screenshot({path:'output/playwright/paid-multi.png',fullPage:true,animations:'disabled'})
    if(index===24)await page.screenshot({path:'output/playwright/paid-text.png',fullPage:true,animations:'disabled'})
    const layout=await page.evaluate(()=>({width:innerWidth,doc:document.documentElement.scrollWidth}));assert(layout.doc<=layout.width,'Horizontal overflow '+q.questionId)
    assert(!requests.some(r=>r.method==='POST'),'Backend called before final submission')
    await page.getByRole('button',{name:q.questionId==='Q18'?'暂时跳过这题':index===config.questions.length-1?'检查整份答卷':'下一题',exact:false}).click()
  }
  await page.locator('.paid-review').waitFor()
  const reviewStates=await page.locator('.paid-review small').evaluateAll(nodes=>nodes.map(n=>({state:n.dataset.answerState,text:n.innerText})))
  assert(reviewStates.length===26,'Review missing questions')
  for(let i=0;i<26;i++){const expected=i===17?['SKIPPED','已跳过']:[19,23].includes(i)?['UNANSWERED','未填写']:['ANSWERED','已填写'];assert(reviewStates[i].state===expected[0]&&reviewStates[i].text===expected[1],'Wrong review state Q'+(i+1))}
  await page.screenshot({path:'output/playwright/paid-review-states.png',fullPage:true,animations:'disabled'})
  const savedDraft=await page.evaluate(()=>JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('ai-persona:questionnaire-draft:')))))
  await page.evaluate(d=>{const key=Object.keys(localStorage).find(k=>k.startsWith('ai-persona:questionnaire-draft:'));d.answers.Q04={};localStorage.setItem(key,JSON.stringify(d))},savedDraft)
  await page.reload();await page.locator('.paid-review').waitFor();assert(await page.locator('.paid-review small').nth(3).innerText()==='待修正','Invalid required review label')
  await page.getByTestId('submit').click();await page.locator('.paid-step').waitFor();assert(!requests.some(r=>r.method==='POST'),'Invalid review submitted')
  await page.evaluate(d=>{localStorage.setItem(`ai-persona:questionnaire-draft:${d.questionnaireId}:${d.questionnaireVersion}`,JSON.stringify(d))},savedDraft)
  await page.reload();await page.locator('.paid-review').waitFor()
  await page.locator('.paid-review li button').last().click();assert(await page.getByRole('progressbar').getAttribute('aria-valuenow')==='24','Unanswered optional questions included in progress');await page.getByRole('button',{name:'检查整份答卷',exact:false}).click()
  const postStart=requests.filter(r=>r.method==='POST').length
  const receiptResponse=page.waitForResponse(r=>r.url().endsWith('/api/v1/questionnaire-submissions')&&r.request().method()==='POST')
  await page.getByTestId('submit').dblclick()
  await page.locator('.paid-success').waitFor()
  const receipt=await(await receiptResponse).json()
  assert(requests.filter(r=>r.method==='POST').length-postStart===1,'Duplicate normal submit')
  assert(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('ai-persona:questionnaire-draft:')).length)===0,'Draft not cleared after success')
  const firstId=await page.getByTestId('profile-id').textContent()
  await page.getByRole('button',{name:'查看已保存的偏好档案'}).click();await page.locator('.paid-json').waitFor()
  const profile=await(await page.request.get('http://127.0.0.1:5180/api/v1/profiles/'+firstId)).json()
  const evidence=await(await page.request.get('http://127.0.0.1:5180/api/v1/profiles/'+firstId+'/evidence')).json()
  assert(profile.currentVersion===1&&profile.current.profile.schemaVersion==='1.0.0','Stored profile invalid')
  assert(evidence.length>20,'Stored evidence missing')
  const doc=profile.current.profile
  assert(doc.linguisticConfig.tone.length===1&&doc.linguisticConfig.tone[0]===toneLabels[0],'Selected tone did not persist')
  const crisis=doc.contextualPolicies.find(p=>p.policyId==='pol_conflict_angry_coax')
  assert(crisis.status==='USER_CONFIRMED','Q16 confirmation incorrect')
  assert(crisis.evidenceRefs.every(ref=>evidence.some(e=>e.evidenceId===ref&&e.sourceType==='QUESTIONNAIRE'&&e.status==='CONFIRMED')),'Q16 lacks confirmed user evidence')
  const boundaries=['不限制现实社交。','不逼问现实行踪。','不无视用户身体边界；用户不愿意时不得强行靠近。']
  assert(boundaries.every(b=>doc.targetPersona.coreSettings.includes(b)),'Q03 D minimum boundaries lost')
  const coreReview=doc.unresolvedItems.find(i=>i.targetPath==='/targetPersona/coreSettings'&&i.status==='OPEN');assert(coreReview&&!coreReview.blocking,'Boundary review missing or blocks valid Q19 none')
  const pointer=path=>path.split('/').slice(1).reduce((v,k)=>v?.[k.replace(/~1/g,'/').replace(/~0/g,'~')],doc)
  for(const e of evidence)assert(e.targetFieldPath===''||pointer(e.targetFieldPath)!==undefined,'Evidence path missing '+e.targetFieldPath)
  const walk=node=>{if(!node||typeof node!=='object')return;if(node.evidenceRefs){assert(node.evidenceRefs.every(ref=>evidence.some(e=>e.evidenceId===ref&&e.status!=='REJECTED')),'Unresolved evidence reference');if(node.status==='USER_CONFIRMED')assert(node.evidenceRefs.some(ref=>evidence.some(e=>e.evidenceId===ref&&e.status==='CONFIRMED'&&e.sourceType!=='MODEL_INFERENCE')),'Fake confirmation')}Object.values(node).forEach(walk)};walk(doc)
  const validation=await(await page.request.post('http://127.0.0.1:5180/api/v1/profiles/validate',{data:{profile:doc}})).json();assert(validation.valid===true,'Official profile validation failed')
  assert(receipt.pendingItemCount===receipt.blockers.length+receipt.warnings.length,'Pending count mismatch')
  assert(receipt.clarificationCount===doc.unresolvedItems.filter(i=>i.status==='OPEN').length+doc.conflicts.filter(c=>c.status==='OPEN').length,'Clarification count mismatch')
  assert(receipt.clarificationCount<receipt.pendingItemCount,'Provisional blockers counted as clarification questions')
  assert((await page.locator('.paid-success dd').last().innerText())===receipt.pendingItemCount+' 项','UI uses wrong pending count')
  await page.screenshot({path:'output/playwright/paid-success.png',fullPage:true,animations:'disabled'})
  await page.reload();await page.locator('.paid-success').waitFor();assert(await page.getByTestId('profile-id').textContent()===firstId,'Success receipt lost on refresh')
  await page.evaluate(()=>{const key=Object.keys(localStorage).find(k=>k.startsWith('ai-persona:questionnaire-receipt:')),r=JSON.parse(localStorage.getItem(key));delete r.pendingItemCount;r.clarificationCount=999;localStorage.setItem(key,JSON.stringify(r))})
  await page.reload();await page.locator('.paid-success').waitFor();assert((await page.locator('.paid-success dd').last().innerText())===receipt.pendingItemCount+' 项','Legacy cached receipt fallback failed')
  // Failure/retry uses a real form-restorable draft and the actual submission API.
  const retryDraft=await page.evaluate(d=>{d.submissionId=crypto.randomUUID();d.attempted=false;d.stage='review';localStorage.setItem(`ai-persona:questionnaire-draft:${d.questionnaireId}:${d.questionnaireVersion}`,JSON.stringify(d));return d},savedDraft)
  await page.reload();await page.locator('.paid-review').waitFor()
  const attempts=[];let committed
  await page.route('**/api/v1/questionnaire-submissions',async route=>{
    attempts.push(route.request().postDataJSON())
    if(attempts.length===1){await new Promise(r=>setTimeout(r,150));await route.abort('failed')}
    else if(attempts.length===2){const response=await route.fetch();assert(response.ok(),'Server retry processing failed');committed=await response.json();await route.abort('failed')}
    else await route.continue()
  })
  await page.getByTestId('submit').click();assert(await page.getByTestId('submit').isDisabled(),'Submit enabled in flight')
  await page.getByRole('alert').waitFor();assert(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('ai-persona:questionnaire-draft:'))),'Network failure cleared draft')
  await page.getByTestId('submit').click();await page.waitForFunction(()=>document.querySelector('[data-testid="submit"]')?.disabled===false)
  await page.locator('.paid-review li button').last().click()
  await page.locator('textarea').evaluate(el=>el.dispatchEvent(new Event('input',{bubbles:true})))
  await page.getByRole('button',{name:'检查整份答卷',exact:false}).click()
  const unchangedId=await page.evaluate(()=>JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('ai-persona:questionnaire-draft:')))).submissionId)
  assert(unchangedId===retryDraft.submissionId,'Revisiting unchanged text changed retry ID')
  await page.getByTestId('submit').click();await page.locator('.paid-success').waitFor()
  assert(attempts.length===3&&attempts.every(a=>a.submissionId===retryDraft.submissionId),'Retry changed submissionId')
  assert((await page.getByTestId('profile-id').textContent())===committed.profileId,'Lost-response retry created a different profile')
  await page.unroute('**/api/v1/questionnaire-submissions')
  assert(!errors.length,'Browser errors '+errors.join(';'))
  return {passed:true,questions:26,toneLabels,reviewStates,processedQuestions:24,officialSchemaValid:validation.valid,evidenceReferencesValid:true,q16Confirmed:true,q03Boundaries:boundaries,pendingItemCount:receipt.pendingItemCount,clarificationCount:receipt.clarificationCount,legacyReceiptCompatible:true,draftKinds:['structured','multi','text'],normalPostCount:1,retryPostCount:3,retryStableId:true,lostResponseIdempotent:true,profileId:firstId,retryProfileId:committed.profileId,evidenceCount:evidence.length,noQuestionPosts:true,errors}
}
