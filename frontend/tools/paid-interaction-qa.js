async(page)=>{
  const assert=(ok,message)=>{if(!ok)throw Error(message)}
  await page.goto('http://127.0.0.1:5180/questionnaire');await page.locator('.paid-success,.paid-intro').waitFor()
  if(await page.locator('.paid-success').count())await page.getByRole('button',{name:'另填一份新答卷'}).click()
  await page.getByRole('button',{name:'开始塑造 TA',exact:true}).click()
  await page.locator('input').nth(0).fill('清除草稿测试')
  await page.locator('select').selectOption('ARC_01');await page.locator('input').nth(1).fill('虚构伴侣，喜欢阅读。')
  await page.getByRole('button',{name:'下一题',exact:false}).click();await page.locator('[data-option="B"]').click();await page.getByRole('button',{name:'下一题',exact:false}).click()
  await page.getByRole('button',{name:'暂时跳过这题'}).click();await page.getByRole('button',{name:'上一题',exact:true}).click()
  const skipped=await page.evaluate(()=>JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('ai-persona:questionnaire-draft:')))).answers.Q03.skipped)
  assert(skipped===true,'Skip not saved')
  await page.getByRole('button',{name:'上一题',exact:true}).click();assert(await page.locator('[data-option="B"]').getAttribute('aria-pressed')==='true','Previous answer lost')
  await page.getByRole('button',{name:'清除草稿',exact:true}).click();await page.getByRole('button',{name:'保留草稿',exact:true}).click();assert(await page.locator('[data-option="B"]').getAttribute('aria-pressed')==='true','Cancel clear removed answer')
  await page.getByRole('button',{name:'清除草稿',exact:true}).click();await page.getByRole('button',{name:'确认清除',exact:true}).click()
  assert(await page.evaluate(()=>!Object.keys(localStorage).some(k=>k.startsWith('ai-persona:questionnaire-draft:'))),'Clear left a draft')
  await page.getByRole('button',{name:'开始塑造 TA',exact:true}).waitFor()
  await page.setViewportSize({width:320,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'320px intro overflow')
  await page.setViewportSize({width:1200,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Desktop overflow')
  return {passed:true,backPreservesAnswer:true,optionalSkip:true,clearConfirmAndCancel:true,widths:[320,390,1200]}
}
