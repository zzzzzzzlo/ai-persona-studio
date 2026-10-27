(function (A) {
  'use strict';
  var app = document.getElementById('app');
  var state = A.initialState(), busy = false, timers = [], preview = null, ready = false;
  document.addEventListener('touchstart', function () { document.documentElement.classList.add('using-pointer'); }, { passive: true });
  document.addEventListener('mousedown', function () { document.documentElement.classList.add('using-pointer'); });
  document.addEventListener('keydown', function (event) { if (event.key === 'Tab') document.documentElement.classList.remove('using-pointer'); });
  function shownResult() { return preview || state.result; }
  function cancelTimers() { timers.forEach(clearTimeout); timers = []; busy = false; }
  function later(fn, ms) { var timer = setTimeout(fn, ms); timers.push(timer); }
  function render(focus) {
    var result = shownResult();
    var html = state.view === 'home' ? A.homeHTML(state) : state.view === 'quiz' ? A.quizHTML(state) : state.view === 'analysis' ? A.analysisHTML(result) : A.resultHTML(result, Boolean(preview));
    app.innerHTML = html + (A.debugEnabled && (state.view === 'home' || state.view === 'result') ? A.debugHTML(result) : '');
    window.scrollTo(0, 0); if (focus) A.focusHeading();
  }
  function persist() { if (!preview) A.storage.save(state); }
  function analyze() {
    state.result = A.match(A.score(state.answers)); state.view = 'analysis'; busy = true; persist(); render(true);
    [100, 460, 820, 1180].forEach(function (ms, index) { later(function () { var step = app.querySelector('[data-step="' + index + '"]'); if (step) step.classList.add('complete'); }, ms); });
    later(function () { var p = app.querySelector('.prediction'); if (p) p.hidden = false; }, 1280);
    later(function () { busy = false; state.view = 'result'; persist(); render(true); }, A.config.analysisDuration);
  }
  async function reset() {
    cancelTimers(); A.closeCard(); preview = null; busy = true;
    var ok = await A.storage.clear(); state = A.initialState(); busy = false; render(true);
    if (!ok) A.notify('已重新开始；旧记录清除失败，关闭页面前请完成本次测试。');
  }
  async function share(action, button) {
    var result = shownResult(); if (!result) return;
    if (action === 'card') { try { A.openCard(result); } catch (err) { A.notify(err.message); } return; }
    button.disabled = true;
    try {
      var data = A.drawShareCard(result).toDataURL('image/png');
      var supported = action === 'save' ? await A.bridge.save(data) : await A.bridge.post(data, result);
      if (!supported) A.openCard(result, action); else if (action === 'save') A.notify('心动人格卡已保存到相册。');
    } catch (err) { A.notify(action === 'save' ? '未能保存，请检查相册权限后再试。' : '未能打开发布页，请稍后再试。'); }
    finally { button.disabled = false; }
  }
  app.addEventListener('click', function (event) {
    var button = event.target.closest('button'); if (!button || !ready || busy || button.disabled) return;
    var action = button.dataset.action;
    if (button.dataset.answer && state.view === 'quiz') {
      busy = true; state.answers[state.index] = button.dataset.answer; state.result = null;
      app.querySelectorAll('.answer').forEach(function (b) { b.classList.toggle('selected', b === button); b.setAttribute('aria-pressed', String(b === button)); b.disabled = true; });
      persist();
      later(function () { busy = false; if (state.index === A.questions.length - 1) analyze(); else { state.index += 1; persist(); render(true); } }, A.config.answerDelay);
      return;
    }
    if (action === 'start') { preview = null; state.view = state.result ? 'result' : 'quiz'; persist(); render(true); }
    else if (action === 'back') { if (state.index > 0) state.index -= 1; else state.view = 'home'; persist(); render(true); }
    else if (action === 'home') { preview = null; state.view = 'home'; persist(); render(true); }
    else if (action === 'reset') reset();
    else if (action === 'save' || action === 'post' || action === 'card') share(action, button);
    else if (A.debugEnabled && (action === 'debug-persona' || action === 'debug-vector')) {
      var vector;
      if (action === 'debug-persona') vector = A.personas.find(function (p) { return p.id === document.getElementById('debug-persona').value; }).center.slice();
      else {
        vector = A.config.dimensions.map(function (d) { var input = document.getElementById('dim-' + d); return input.value.trim() === '' ? NaN : Number(input.value); });
        if (vector.some(function (n) { return !Number.isFinite(n) || n < -1 || n > 1; })) { A.notify('请将七个维度都设置为 -1 到 1 之间的数字。'); return; }
      }
      preview = A.match(vector); state.view = 'result'; render(true);
    }
  });
  function height() { document.documentElement.style.setProperty('--app-height', window.innerHeight + 'px'); }
  window.addEventListener('resize', height); height();
  app.innerHTML = A.homeHTML(state);
  A.storage.init().then(function (raw) { state = A.restoreState(raw); ready = true; render(false); }).catch(function () { ready = true; render(false); A.notify('无法读取本地进度，可以正常开始测试。'); });
})(window.HeartTest);
