async (page) => {
  const assert=(ok,message)=>{if(!ok) throw new Error(message);};
  const errors=[];
  const onError=error=>errors.push(error.message);
  page.on('pageerror',onError);
  let checkedCards=0;
  try {
    for(const theme of ['blue','pink']) {
      await page.setViewportSize({width:390,height:844});
      await page.goto('http://127.0.0.1:5173/'+(theme==='pink'?'pink.html':'index.html')+'?debug=1');
      await page.locator('.debug-panel').waitFor();
      const images=await page.evaluate(()=>{
        const A=window.HeartTest,frames=[],issues=[];
        const prototype=CanvasRenderingContext2D.prototype,original=prototype.fillText;
        let records=[];
        prototype.fillText=function(text,x,y){
          const bounds=this.measureText(String(text));
          records.push({text:String(text),font:this.font,x,y,left:x-bounds.actualBoundingBoxLeft,right:x+bounds.actualBoundingBoxRight,top:y-bounds.actualBoundingBoxAscent,bottom:y+bounds.actualBoundingBoxDescent});
          return original.call(this,text,x,y);
        };
        let checked=0;
        try {
          for(const p of A.personas) for(const mode of ['single','secondary','dual']) for(const value of [-1,-.5,1]) {
            records=[];
            const result={primary:p,secondary:A.personas.find(s=>s.id!==p.id),vector:p.center.slice(),mode,aiScores:{M:value,G:value,R:value,L:value}};
            const card=A.drawShareCard(result);checked++;
            if(card.width!==1080||card.height!==1440) issues.push('Card size');
            if(!records.some(r=>r.text===p.name&&/94px/.test(r.font))) issues.push('Persona title resized');
            for(const keyword of p.keywords) if(!records.some(r=>r.text===keyword)) issues.push('Missing keyword '+keyword);
            for(const metric of A.displayMetrics(p,result.vector)) {
              if(!records.some(r=>r.text===metric.label)||!records.some(r=>r.text===String(metric.value)&&/75px/.test(r.font))) issues.push('Missing metric');
            }
            if(records.filter(r=>/38px/.test(r.font)).map(r=>r.text).join('')!==A.resultCopy[p.id].insight.replace(/^「|」$/g,'')) issues.push('Insight changed');
            for(const field of A.buildAIProfile(result.aiScores)) {
              if(!records.some(r=>r.text===field.title&&/25px/.test(r.font))) issues.push('Missing AI field '+field.title);
              if(!records.some(r=>r.text===field.label&&/36px/.test(r.font))) issues.push('AI label missing/small '+field.label);
            }
            for(const r of records) if(r.left < -1 || r.right > 1081 || r.top < -1 || r.bottom > 1441) issues.push('Overflow '+p.id+':'+mode+':'+r.text);
            if(mode==='single'&&value===1&&(p.id==='1'||p.id==='2')) frames.push({kind:p.id==='1'?'insight':'metrics',uri:card.toDataURL('image/png')});
            card.width=0;card.height=0;
          }
        } finally {prototype.fillText=original;}
        if(issues.length) throw new Error(issues.join(';'));
        return {frames,checked};
      });
      checkedCards+=images.checked;
      await page.setViewportSize({width:1100,height:1460});
      for(const frame of images.frames) {
        await page.evaluate(uri=>{
          let review=document.getElementById('canvas-check');
          if(!review){review=document.createElement('div');review.id='canvas-check';document.body.appendChild(review);}
          review.innerHTML='<img id="canvas-check-image" width="1080" height="1440" alt="分享卡复查">';
          review.querySelector('img').src=uri;
        },frame.uri);
        await page.locator('#canvas-check-image').screenshot({path:'output/playwright/v2-fix-'+theme+'-card-'+frame.kind+'.png'});
      }
    }
    await page.setViewportSize({width:390,height:844});
    await page.goto('http://127.0.0.1:5173/pink.html?debug=1');
    await page.locator('.debug-panel').waitFor();
    await page.getByRole('button',{name:'使用原型中心预览'}).click();
    const before=await page.evaluate(()=>localStorage.getItem(window.HeartTest.config.storageKey));
    await page.getByRole('button',{name:'把 TA 真正捏出来'}).click();
    assert(await page.locator('#toast').textContent()==='专属 AI 定制版正在准备中。想参与内测，可以回到发布这份测试的笔记评论『想定制』；也可以先保存这份配置。','Wrong invitation');
    assert(await page.evaluate(()=>localStorage.getItem(window.HeartTest.config.storageKey))===before,'Invitation created a record');
    await page.locator('.customize-panel').screenshot({path:'output/playwright/v2-fix-invitation-panel.png'});
    await page.screenshot({path:'output/playwright/v2-fix-invitation-toast.png',animations:'disabled'});
    await page.context().setOffline(true);
    try {
      for(const theme of ['浅蓝','浅粉']) {
        await page.goto('file:///E:/ai人格测试产品/release/mobile-preview/AI心动人格测试-'+theme+'版.html');
        const metadata=await page.evaluate(()=>{
          const A=window.HeartTest,answers=Array(18).fill('A');answers[15]='B';answers[16]='B';
          return {q2:A.questions[1].options[3],profile:A.buildAIProfile(A.evaluateAnswers(answers).aiScores),message:A.config.customizeMessage};
        });
        assert(metadata.q2.text==='TA已经留了几条消息，分享今天发生的小事，还问你什么时候有空聊聊。','Stale offline Q2');
        assert(JSON.stringify(metadata.q2.scores)==='{"I":2}','Q2 scores changed');
        assert(metadata.profile.find(p=>p.dimension==='G').label==='适应型','Offline G middle missing');
        assert(metadata.profile.find(p=>p.dimension==='R').label==='轻剧情型','Offline R middle missing');
        assert(metadata.message.includes('评论『想定制』'),'Offline invitation stale');
      }
    } finally {await page.context().setOffline(false);}
    assert(!errors.length,errors.join(';'));
    return {passed:true,checkedCards,themes:2,personas:12,modes:3,aiBands:3,allCanvasTextInBounds:true,titleMetricsInsightPreserved:true,invitationNoRecord:true,offlineFilesUpdated:true,errors};
  } finally {page.off('pageerror',onError);}
}
