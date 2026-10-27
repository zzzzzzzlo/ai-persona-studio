async (page) => {
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  await page.goto('http://127.0.0.1:5173/?debug=1');
  const personas = await page.evaluate(() => window.HeartTest.personas.map(p => ({ id: p.id, name: p.name })));
  const checked = [];
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const p of personas) {
      await page.getByRole('combobox', { name: '12个人格原型' }).selectOption(p.id);
      await page.getByRole('button', { name: '使用原型中心预览' }).click();
      assert((await page.locator('.persona-title').textContent()).includes(p.name), 'Wrong preview ' + p.name);
      const layout = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, viewport: window.innerWidth, overflowing: Array.from(document.querySelectorAll('.result *')).filter(el => el.getBoundingClientRect().right > window.innerWidth + 1 || el.getBoundingClientRect().left < -1).map(el => el.className) }));
      assert(layout.doc <= width && layout.overflowing.length === 0, 'Overflow: ' + JSON.stringify({ width, persona: p.name, layout }));
      checked.push(width + ':' + p.id);
      if (width === 390) {
        await page.evaluate(() => document.querySelector('.debug-panel').style.display = 'none');
        await page.screenshot({ path: 'output/playwright/result-' + p.id + '.png', fullPage: true, animations: 'disabled' });
        await page.evaluate(() => document.querySelector('.debug-panel').style.display = '');
        await page.getByRole('button', { name: '预览结果卡', exact: true }).click();
        await page.getByRole('dialog').waitFor();
        assert(await page.locator('.share-card-image').evaluate(el => el.naturalWidth === 1080 && el.naturalHeight === 1440), 'Canvas image failed');
        await page.locator('.share-card-image').screenshot({ path: 'output/playwright/card-' + p.id + '.png' });
        await page.getByRole('button', { name: '关闭结果卡' }).click();
      }
    }
  }
  // Seeded search only supplies diagnostic examples; production has no randomness.
  const modes = await page.evaluate(() => {
    const A = window.HeartTest, found = {}; let seed = 1729;
    for (let i = 0; i < 20000 && (!found.dual || !found.secondary); i++) {
      const answers = A.questions.map(q => { seed = (1664525 * seed + 1013904223) >>> 0; return q.options[Math.floor(seed / 4294967296 * q.options.length)].id; });
      const vector = A.score(answers), result = A.match(vector);
      if (!found[result.mode]) found[result.mode] = vector;
    }
    return found;
  });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const mode of ['dual', 'secondary']) {
    for (const [i, d] of ['I','E','D','C','S','B','T'].entries()) await page.locator('#dim-' + d).fill(String(modes[mode][i]));
    await page.getByRole('button', { name: '预览这组七维结果' }).click();
    assert(await page.locator('.debug-panel').textContent().then(t => t.includes('判断: ' + mode)), 'Debug classification wrong');
    assert(mode === 'dual' ? await page.locator('.dual-name').count() === 1 : (await page.locator('.secondary-type').textContent()).includes('隐藏副型'), 'Missing secondary display');
    await page.evaluate(() => document.querySelector('.debug-panel').style.display = 'none');
    await page.screenshot({ path: 'output/playwright/result-' + mode + '.png', fullPage: true, animations: 'disabled' });
    await page.evaluate(() => document.querySelector('.debug-panel').style.display = '');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Dual/secondary overflow');
  }
  await page.locator('#dim-I').fill('2'); await page.getByRole('button', { name: '预览这组七维结果' }).click();
  assert((await page.locator('#toast').textContent()).includes('-1 到 1'), 'Invalid debug input accepted');
  return { passed: true, resultLayouts: checked.length, shareCards: 12, modes: ['single','secondary','dual'] };
}
