(function (A) {
  'use strict';
  A.analysisHTML = function (result) {
    var steps = ['分析你的关系距离', '匹配你的 AI 心动原型', '整理记忆与相处偏好', '生成专属 AI 配置档案'];
    return '<section class="screen analysis"><header class="masthead">' + A.brand + '<span class="edition">18 / 18</span></header><div class="analysis-content"><div class="analysis-symbol" aria-hidden="true"><img src="' + A.markPath + '" width="104" height="104" alt=""></div><p class="eyebrow">心动，有迹可循</p><h1 tabindex="-1">正在解析你的<br>心动模式<span class="dots">…</span></h1><ol class="analysis-steps">' + steps.map(function (s, i) { return '<li data-step="' + i + '"><span aria-hidden="true">✓</span>' + s + '</li>'; }).join('') + '</ol><p class="prediction" aria-live="polite" hidden>' + A.escape(A.predictInsight(result.vector)) + '</p></div><p class="smallprint">根据你的情境选择匹配 · 娱乐向解读</p></section>';
  };
})(window.HeartTest);
