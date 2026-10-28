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
  const expectedAnswers={}
  for(let index=0;index<config.questions.length;index++){
    const q=config.questions[index]
    await page.locator('.paid-card h1').waitFor();assert(await page.locator('.paid-card h1').textContent()===q.title,'Question sequence '+q.questionId)
    if(q.options){
      const count=q.minSelections||1
      for(let i=0;i<count;i++){
        await page.locator('[data-option="'+q.options[i].id+'"]').click()
        if(q.questionId==='Q12'&&i===0){await page.getByRole('button',{name:'下一题',exact:false}).click();assert(await page.locator('.paid-field-errors').count()===1,'Multi minimum not validated')}
      }
    }else if(q.fields){
      for(const field of q.fields){
        if(field.type?.startsWith('MULTI_'))await page.locator('.paid-chips button').first().click()
        else if(field.options)await page.getByRole('combobox',{name:field.label,exact:true}).selectOption(field.defaultValue||field.options[0].id)
        else await page.getByRole('textbox',{name:field.label,exact:true}).fill(field.defaultValue|| (field.fieldId==='personaName'?'林间':field.fieldId.includes('Address')?'小林':'认识七年，喜欢散步和阅读的虚构伴侣。'))
      }
    }else if(q.subQuestions){for(let i=0;i<q.subQuestions.length;i++)await page.locator('.paid-subquestions section').nth(i).getByRole('button').first().click()}
    else if(q.slots){for(const slot of q.slots)await page.getByRole('textbox',{name:slot.label,exact:true}).fill('相识七年，一起散步，尊重各自的生活。')}
    else await page.getByRole('textbox',{name:q.title,exact:true}).fill('希望在我情绪低落时先倾听，不替我决定。')
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
    await page.getByRole('button',{name:index===config.questions.length-1?'检查整份答卷':'下一题',exact:false}).click()
  }
  await page.locator('.paid-review').waitFor()
  const savedDraft=await page.evaluate(()=>JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('ai-persona:questionnaire-draft:')))))
  const postStart=requests.filter(r=>r.method==='POST').length
  await page.getByTestId('submit').dblclick()
  await page.locator('.paid-success').waitFor()
  assert(requests.filter(r=>r.method==='POST').length-postStart===1,'Duplicate normal submit')
  assert(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('ai-persona:questionnaire-draft:')).length)===0,'Draft not cleared after success')
  const firstId=await page.getByTestId('profile-id').textContent()
  await page.getByRole('button',{name:'查看已保存的偏好档案'}).click();await page.locator('.paid-json').waitFor()
  const profile=await(await page.request.get('http://127.0.0.1:5180/api/v1/profiles/'+firstId)).json()
  const evidence=await(await page.request.get('http://127.0.0.1:5180/api/v1/profiles/'+firstId+'/evidence')).json()
  assert(profile.currentVersion===1&&profile.current.profile.schemaVersion==='1.0.0','Stored profile invalid')
  assert(evidence.length>20,'Stored evidence missing')
  await page.screenshot({path:'output/playwright/paid-success.png',fullPage:true,animations:'disabled'})
  await page.reload();await page.locator('.paid-success').waitFor();assert(await page.getByTestId('profile-id').textContent()===firstId,'Success receipt lost on refresh')
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
  return {passed:true,questions:26,draftKinds:['structured','multi','text'],normalPostCount:1,retryPostCount:3,retryStableId:true,lostResponseIdempotent:true,profileId:firstId,retryProfileId:committed.profileId,evidenceCount:evidence.length,noQuestionPosts:true,errors}
}
