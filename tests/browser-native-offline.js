async (page) => {
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const nativePage = await page.context().newPage();
  await nativePage.addInitScript(() => {
    window.__nativeCalls = [];
    const prefix = 'mock-native:';
    window.xhs = { launchOptions: { miniToolEnv: { buildVersion: 9491004 } }, miniTool: {
      getStorage: async ({ key }) => { window.__nativeCalls.push({ method: 'getStorage' }); return { data: sessionStorage.getItem(prefix + key) }; },
      setStorage: async ({ key, data }) => { window.__nativeCalls.push({ method: 'setStorage' }); sessionStorage.setItem(prefix + key, data); return { errMsg: 'setStorage:ok' }; },
      removeStorage: async ({ key }) => { window.__nativeCalls.push({ method: 'removeStorage' }); sessionStorage.removeItem(prefix + key); },
      writeTempFile: async ({ data }) => { if (!data.startsWith('data:image/png;base64,')) throw new Error('Wrong data URI'); window.__nativeCalls.push({ method: 'writeTempFile', bytes: data.length }); return { filePath: 'native-temp-image.png' }; },
      saveImageToPhotosAlbum: async ({ filePath }) => { window.__nativeCalls.push({ method: 'save', filePath }); return { errMsg: 'saveImageToPhotosAlbum:ok' }; },
      postNote: async options => { window.__nativeCalls.push({ method: 'post', title: options.title, mediaInfo: options.mediaInfo }); return { errMsg: 'postNote:ok' }; }
    } };
  });
  await nativePage.setViewportSize({ width: 390, height: 844 });
  await nativePage.goto('http://127.0.0.1:5173/');
  await nativePage.evaluate(() => { localStorage.removeItem('ai-heart-personality-v2'); sessionStorage.removeItem('mock-native:ai-heart-personality-v2'); });
  await nativePage.reload();
  await nativePage.getByRole('button', { name: '开始测试', exact: true }).click();
  await nativePage.locator('[data-answer="A"]').click();
  await nativePage.waitForFunction(() => document.querySelector('.counter').textContent.startsWith('02'));
  await nativePage.reload();
  await nativePage.locator('.counter').waitFor();
  assert((await nativePage.locator('.counter').textContent()).startsWith('02'), 'Native resume failed');
  for (let i = 1; i < 18; i++) {
    await nativePage.locator('[data-answer="A"]').click();
    if (i === 13) { await nativePage.locator('.transition').waitFor(); await nativePage.getByRole('button', { name:'继续塑造 TA' }).click(); }
    else if (i < 17) await nativePage.waitForFunction(n => document.querySelector('.counter').textContent.startsWith(n), String(i + 2).padStart(2, '0'));
  }
  await nativePage.locator('.result').waitFor();
  await nativePage.getByRole('button', { name: '保存我的心动人格卡' }).click();
  await nativePage.waitForFunction(() => document.querySelector('#toast').textContent.includes('已保存'));
  assert(await nativePage.getByRole('button', { name: '发到小红书', exact: true }).count() === 0, 'Publish button must be removed');
  const calls = await nativePage.evaluate(() => window.__nativeCalls);
  assert(calls.some(c => c.method === 'setStorage'), 'Native storage not used');
  assert(calls.find(c => c.method === 'save').filePath === 'native-temp-image.png', 'Wrong album path');
  assert(!calls.some(c => c.method === 'post'), 'Removed publish action was called');
  assert(await nativePage.evaluate(() => localStorage.getItem('ai-heart-personality-v2') === null), 'Native mode wrote browser storage');
  await nativePage.evaluate(() => window.xhs.miniTool.saveImageToPhotosAlbum = async () => { throw { errMsg: 'permission denied' }; });
  await nativePage.getByRole('button', { name: '保存我的心动人格卡' }).click();
  await nativePage.waitForFunction(() => document.querySelector('#toast').textContent.includes('相册权限'));
  await nativePage.getByRole('button', { name: '重新测试', exact: true }).click();
  await nativePage.getByRole('button', { name: '开始测试', exact: true }).waitFor();
  assert(await nativePage.evaluate(() => sessionStorage.getItem('mock-native:ai-heart-personality-v2') === null), 'Native clear failed');
  await nativePage.close();

  // File URL, all packaged files, browser network disabled.
  await page.context().setOffline(true);
  try {
    await page.goto('file:///E:/ai人格测试产品/dist/index.html');
    await page.getByRole('button', { name: '开始测试', exact: true }).waitFor();
    await page.getByRole('button', { name: '开始测试', exact: true }).click();
    for (let i = 0; i < 18; i++) {
      await page.locator('[data-answer="A"]').click();
      if (i === 13) { await page.locator('.transition').waitFor(); await page.getByRole('button', { name:'继续塑造 TA' }).click(); }
      else if (i < 17) await page.waitForFunction(n => document.querySelector('.counter').textContent.startsWith(n), String(i + 2).padStart(2, '0'));
    }
    await page.locator('.result').waitFor();
    await page.getByRole('button', { name: '预览结果卡', exact: true }).click();
    assert(await page.locator('.share-card-image').evaluate(el => el.naturalWidth === 1080), 'Offline packaged Canvas failed');
    await page.screenshot({ path: 'output/playwright/offline-package.png', fullPage: true, animations: 'disabled' });
    await page.getByRole('button', { name: '关闭结果卡' }).click();
    await page.getByRole('button', { name: '重新测试', exact: true }).click();
  } finally { await page.context().setOffline(false); }
  await page.goto('http://127.0.0.1:5173/');
  return { passed: true, nativeApiMock: 'storage, resume, save, no publish action, rejection, reset', packagedFileUrlOffline: 'full 18 questions + transition + result + AI profile + Canvas', realDeviceValidation: 'pending' };
}
