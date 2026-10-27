async (page) => {
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.context().setOffline(true);
  try {
    const checks=[];
    for (const theme of ['浅蓝','浅粉']) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('file:///E:/ai人格测试产品/release/mobile-preview/AI心动人格测试-' + theme + '版.html');
    await page.evaluate(()=>localStorage.removeItem(window.HeartTest.config.storageKey)); await page.reload();
    await page.getByRole('button', { name: '开始测试', exact: true }).waitFor();
    const external = await page.evaluate(() => ({ scripts: document.querySelectorAll('script[src]').length, styles: document.querySelectorAll('link[rel="stylesheet"]').length, images: Array.from(document.images).filter(i => !i.src.startsWith('data:')).length }));
    assert(external.scripts === 0 && external.styles === 0 && external.images === 0, 'External resources remained');
    await page.getByRole('button', { name: '开始测试', exact: true }).click();
    for (let i = 0; i < 18; i++) {
      await page.locator('[data-answer="A"]').click();
      if (i === 13) { await page.locator('.transition').waitFor(); await page.getByRole('button', { name:'继续塑造 TA' }).click(); }
      else if (i < 17) await page.waitForFunction(n => document.querySelector('.counter').textContent.startsWith(n), String(i + 2).padStart(2, '0'));
    }
    await page.locator('.result').waitFor();
    assert(await page.locator('.profile-item').count()===4,'Offline AI profile missing');
    await page.getByRole('button', { name: '预览结果卡', exact: true }).click();
    assert(await page.locator('.share-card-image').evaluate(el => el.naturalWidth === 1080 && el.naturalHeight === 1440), 'Canvas failed');
    await page.screenshot({ path: 'output/playwright/v2-offline-' + (theme==='浅粉'?'pink':'blue') + '.png', fullPage: true, animations: 'disabled' });
    await page.getByRole('button', { name: '关闭结果卡' }).click();
    await page.getByRole('button', { name: '重新测试', exact: true }).click();
    await page.getByRole('button', { name: '开始测试', exact: true }).waitFor();
    assert(errors.length === 0, 'Script errors: ' + errors.join(';'));
    checks.push({theme,externalResources:external,fullQuiz:true,aiProfile:true,canvas:true});
    }
    return { passed: true, singleFile: true, checks, actualIPhone: 'not tested' };
  } finally { await page.context().setOffline(false); }
}
