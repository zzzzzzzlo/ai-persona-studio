async (page) => {
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const errors = [];
  const onError = error => errors.push(error.message);
  page.on('pageerror', onError);
  let layouts = 0;
  try {
    for (const theme of ['blue','pink']) {
      await page.goto('http://127.0.0.1:5173/' + (theme === 'pink' ? 'pink.html' : 'index.html') + '?debug=1');
      await page.locator('.debug-panel').waitFor();
      for (const width of [320,390]) {
        await page.setViewportSize({ width, height:844 });
        const result = await page.evaluate(() => {
          const A=window.HeartTest, app=document.getElementById('app'), issues=[]; let count=0;
          const check=(html,label)=>{
            app.innerHTML=html;count++;
            if(document.documentElement.scrollWidth>innerWidth) issues.push(label+' document overflow');
            for(const el of document.querySelectorAll('.screen *')) {
              const rect=el.getBoundingClientRect();
              if(rect.width && (rect.right>innerWidth+1 || rect.left < -1)) issues.push(label+' '+el.className);
            }
          };
          check(A.homeHTML(A.initialState()),'home');
          check(A.transitionHTML(),'transition');
          for(let index=0;index<18;index++) {const state=A.initialState();state.view='quiz';state.index=index;check(A.quizHTML(state),'Q'+(index+1));}
          for(const primary of A.personas) for(const mode of ['single','secondary','dual']) for(const value of [-1,0,1]) {
            const result={primary,secondary:A.personas.find(p=>p.id!==primary.id),vector:primary.center.slice(),mode,aiScores:{M:value,G:value,R:value,L:value}};
            check(A.resultHTML(result,false),primary.id+':'+mode+':'+value);
            if(document.querySelectorAll('.profile-item').length!==4) issues.push('Wrong profile count');
            if(document.querySelectorAll('[data-action="customize"]').length!==1) issues.push('Wrong CTA count');
          }
          return {issues,count};
        });
        assert(result.issues.length===0, JSON.stringify({theme,width,issues:result.issues}));
        layouts+=result.count;
      }
    }
    await page.goto('http://127.0.0.1:5173/pink.html?debug=1');
    await page.locator('.debug-panel').waitFor();
    await page.setViewportSize({width:390,height:844});
    const before = await page.evaluate(()=>localStorage.getItem(window.HeartTest.config.storageKey));
    for(const d of ['M','G','R','L']) await page.locator('#ai-'+d).fill('1');
    await page.getByRole('button',{name:'使用原型中心预览'}).click();
    const title=await page.locator('.persona-title').textContent();
    assert((await page.locator('.ai-profile').textContent()).includes('深度关系记忆'),'Debug AI inputs missing');
    for(const d of ['M','G','R','L']) await page.locator('#ai-'+d).fill('-1');
    await page.getByRole('button',{name:'预览这组七维结果'}).click();
    assert(await page.locator('.persona-title').textContent()===title,'AI debug changed persona');
    assert((await page.locator('.ai-profile').textContent()).includes('轻量记忆'),'AI preview not updated');
    assert(await page.evaluate(()=>localStorage.getItem(window.HeartTest.config.storageKey))===before,'Debug changed real record');
    await page.locator('#ai-M').fill('2');await page.getByRole('button',{name:'预览这组七维结果'}).click();
    assert((await page.locator('#toast').textContent()).includes('四个 AI'),'Invalid AI debug input accepted');
    assert(!errors.length,'JavaScript errors: '+errors.join(';'));
    return {passed:true,layouts,themes:['blue','pink'],widths:[320,390],allQuestions:18,personas:12,resultModes:3,aiProfiles:3,debugAI:true,errors};
  } finally {page.off('pageerror',onError);}
}
