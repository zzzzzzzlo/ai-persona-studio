(function (A) {
  'use strict';
  A.quizHTML = function (state) {
    var q = A.questions[state.index];
    var last = q.kind === 'calibration';
    var options = q.options.map(function (o) {
      return '<button class="answer' + (state.answers[state.index] === o.id ? ' selected' : '') + '" data-answer="' + o.id + '" aria-pressed="' + (state.answers[state.index] === o.id) + '"><span class="answer-letter">' + o.id + '</span><span class="answer-copy">' + A.escape(o.text) + '</span></button>';
    }).join('');
    return '<section class="screen quiz' + (last ? ' final-question' : '') + '"><header class="masthead quiz-nav"><button class="nav-back" data-action="back" aria-label="' + (state.index ? '返回上一题' : '返回首页') + '">‹</button>' + A.brand + '</header><div class="progress-meta"><div class="counter">' + String(state.index + 1).padStart(2, '0') + '<span>/ 15</span></div><p class="progress-caption">凭第一感觉作答</p></div><div class="progress-track" role="progressbar" aria-label="答题进度" aria-valuemin="0" aria-valuemax="15" aria-valuenow="' + state.index + '"><div class="progress-fill" style="width:' + (state.index / 15 * 100) + '%"></div></div><div class="question-body"><p class="question-label">' + (last ? '最后一题' : '第 ' + (state.index + 1) + ' 题') + '</p><h1 class="question-title" tabindex="-1">' + A.escape(q.prompt) + '</h1><div class="answers" aria-label="选择最让你心动的回应">' + options + '</div></div><p class="quiz-hint">选中即进入下一题 · 可以返回修改</p></section>';
  };
})(window.HeartTest);
