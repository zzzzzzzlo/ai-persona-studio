(function (A) {
  'use strict';
  var modes = ['single', 'secondary', 'dual'];
  var labels = { single: '单人格', secondary: '隐藏副型', dual: '双核心' };
  var entries = [], pinkStyle = document.getElementById('pink-theme');
  var activeResult = null, previousFocus = null;
  var grid = document.getElementById('review-grid');
  A.personas.forEach(function (p, i) {
    modes.forEach(function (mode) {
      entries.push({ key: mode + '-' + p.id, result: { primary: p, secondary: A.personas[(i + 1) % A.personas.length], vector: p.center.slice(), mode: mode, aiScores: { M: 0, G: 0, R: 0, L: 0 } } });
    });
  });
  function renderPage(entry) {
    document.getElementById('page-' + entry.key).innerHTML = A.resultHTML(entry.result, false);
  }
  grid.innerHTML = entries.map(function (entry) {
    var p = entry.result.primary, mode = entry.result.mode;
    var pair = mode === 'single' ? '' : '<label class="review-pair">' + (mode === 'dual' ? '另一个核心人格' : '隐藏副型搭配') + '<select class="review-select" data-pair="' + entry.key + '" aria-label="' + A.escape(p.name + ' · ' + labels[mode] + '搭配') + '">' + A.personas.filter(function (s) { return s.id !== p.id; }).map(function (s) { return '<option value="' + s.id + '"' + (s.id === entry.result.secondary.id ? ' selected' : '') + '>' + A.escape(s.name) + '</option>'; }).join('') + '</select></label>';
    return '<article class="review-item" id="review-' + entry.key + '" data-primary="' + p.id + '" data-mode="' + mode + '"><div class="review-caption"><h2>' + p.id.padStart(2, '0') + ' · ' + A.escape(p.name) + '</h2><span class="review-badge">' + labels[mode] + '</span></div>' + pair + '<div class="review-page app" id="page-' + entry.key + '"></div></article>';
  }).join('');
  entries.forEach(renderPage);
  document.getElementById('review-ai').addEventListener('change', function (event) {
    var value = Number(event.target.value);
    entries.forEach(function (entry) {
      entry.result.aiScores = { M: value, G: value, R: value, L: value };
      renderPage(entry);
    });
  });
  var personaSelect = document.getElementById('review-persona');
  personaSelect.innerHTML = '<option value="all">全部 12 种人格</option>' + A.personas.map(function (p) { return '<option value="' + p.id + '">' + p.id.padStart(2, '0') + ' · ' + A.escape(p.name) + '</option>'; }).join('');
  function filter() {
    var mode = document.getElementById('review-mode').value, persona = personaSelect.value;
    var visible = entries.filter(function (e) {
      var show = (mode === 'all' || e.result.mode === mode) && (persona === 'all' || e.result.primary.id === persona);
      document.getElementById('review-' + e.key).hidden = !show;
      return show;
    });
    document.getElementById('review-count').textContent = '正在展示 ' + visible.length + ' 个完整结果页面 · ' + (mode === 'all' ? '全部展示形式' : labels[mode]);
    document.getElementById('review-nav').innerHTML = A.personas.filter(function (p) { return persona === 'all' || persona === p.id; }).map(function (p) {
      return '<a href="#review-' + (mode === 'all' ? 'single' : mode) + '-' + p.id + '"><span>' + p.id.padStart(2, '0') + '</span>' + A.escape(p.name) + '</a>';
    }).join('');
  }
  document.getElementById('review-mode').addEventListener('change', filter);
  personaSelect.addEventListener('change', filter);
  grid.addEventListener('change', function (event) {
    var key = event.target.getAttribute('data-pair');
    if (!key) return;
    var entry = entries.find(function (e) { return e.key === key; });
    entry.result.secondary = A.personas.find(function (p) { return p.id === event.target.value; });
    renderPage(entry);
  });
  document.querySelectorAll('[data-review-theme]').forEach(function (button) {
    button.addEventListener('click', function () {
      var theme = button.getAttribute('data-review-theme');
      pinkStyle.media = theme === 'pink' ? 'all' : 'not all';
      document.documentElement.setAttribute('data-theme', theme);
      document.querySelector('meta[name="theme-color"]').setAttribute('content', theme === 'pink' ? '#fff3f7' : '#f5f7fc');
      A.markPath = window.reviewMarks[theme];
      A.brand = '<span class="brand"><img src="' + A.markPath + '" width="30" height="30" alt="">AI 心动人格测试</span>';
      document.querySelectorAll('[data-review-theme]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === button)); });
      entries.forEach(renderPage);
    });
  });
  function closeCard() {
    document.getElementById('modal-root').innerHTML = '';
    activeResult = null;
    document.body.style.overflow = '';
    if (previousFocus) previousFocus.focus({ preventScroll:true });
  }
  function showCard(result) {
    previousFocus = document.activeElement;
    activeResult = result;
    var canvas = A.drawShareCard(result), uri = canvas.toDataURL('image/png');
    var title = result.primary.name + (result.mode === 'single' ? '' : ' · ' + labels[result.mode] + ' · ' + result.secondary.shortName);
    document.getElementById('modal-root').innerHTML = '<div class="modal-overlay review-card-dialog" role="dialog" aria-modal="true" aria-labelledby="review-card-title"><div class="modal-sheet"><header class="modal-head"><h2 id="review-card-title">' + A.escape(title) + '</h2><button class="modal-close" data-review-close aria-label="关闭结果卡">×</button></header><img class="share-card-image" src="' + uri + '" width="1080" height="1440" alt="' + A.escape(title + '分享卡') + '"><p class="modal-help">1080 × 1440 原始分享卡。电脑可下载 PNG；手机可长按图片保存。</p><a class="primary review-download" download="AI心动人格卡-' + A.escape(title) + '.png" href="' + uri + '">下载 PNG 图片</a></div></div>';
    document.body.style.overflow = 'hidden';
    document.querySelector('[data-review-close]').focus();
  }
  document.addEventListener('click', function (event) {
    if (event.target.closest('[data-review-close]') || event.target.classList.contains('modal-overlay')) { closeCard(); return; }
    var button = event.target.closest('[data-action]');
    if (!button) return;
    var article = button.closest('.review-item');
    if (!article) return;
    var entry = entries.find(function (e) { return 'review-' + e.key === article.id; });
    var action = button.getAttribute('data-action');
    if (action === 'save' || action === 'card') showCard(entry.result);
    if (action === 'customize') A.notify(A.config.customizeMessage, 12000);
    if (action === 'home' || action === 'reset') {
      document.getElementById('review-top').scrollIntoView();
      A.notify('已返回审查导航。用上方筛选切换结果页面。');
    }
  });
  document.addEventListener('keydown', function (event) {
    if (!activeResult) return;
    if (event.key === 'Escape') { closeCard(); return; }
    if (event.key === 'Tab') {
      var focusable = Array.from(document.querySelectorAll('.modal-sheet button,.modal-sheet a'));
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  document.addEventListener('mousedown', function () { document.documentElement.classList.add('using-pointer'); });
  document.addEventListener('touchstart', function () { document.documentElement.classList.add('using-pointer'); }, { passive:true });
  document.addEventListener('keydown', function (event) { if (event.key === 'Tab') document.documentElement.classList.remove('using-pointer'); });
  filter();
})(window.HeartTest);
