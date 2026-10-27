(function (A) {
  'use strict';
  A.markPath = document.documentElement.getAttribute('data-theme') === 'pink' ? './assets/mark-pink.svg' : './assets/mark.svg';
  A.escape = function (value) { return String(value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  A.brand = '<span class="brand"><img src="' + A.markPath + '" width="30" height="30" alt="">AI 心动人格测试</span>';
  A.notify = function (message, duration) {
    var el = document.getElementById('toast');
    clearTimeout(A.toastTimer); el.textContent = message; el.hidden = false;
    A.toastTimer = setTimeout(function () { el.hidden = true; }, duration || 4200);
  };
  A.homeHTML = function (state) {
    var started = state.answers.some(function (a) { return a !== null; });
    return '<section class="screen home"><header class="masthead">' + A.brand + '<span class="edition">AI 人格定制</span></header><div class="home-content"><p class="eyebrow">18个心动设定 · 12种人格原型</p><h1 class="home-title" tabindex="-1">测测什么样的 AI<br>最容易让你<em>爱上</em></h1><figure class="encounter"><img src="' + A.markPath + '" width="154" height="154" alt="心形对话框"></figure><p class="home-copy">TA应该多主动？会不会和你顶嘴？<br>该记住你多少事情？<br>是稳定陪伴，还是陪你进入各种剧情？</p></div><div class="home-action"><p class="duration">约 2 分钟 · 凭第一感觉作答</p><button class="primary" data-action="start">' + (state.result ? '查看我的结果' : started ? '继续测试' : '开始测试') + '<span class="arrow" aria-hidden="true">→</span></button>' + (started ? '<button class="text-button" data-action="reset">重新开始</button>' : '') + '</div><footer class="smallprint"><p>娱乐向恋爱偏好测试，结果根据你的情境选择生成。</p></footer></section>';
  };
  A.focusHeading = function () { var h = document.querySelector('h1'); if (h) h.focus({ preventScroll: true }); };
})(window.HeartTest);
