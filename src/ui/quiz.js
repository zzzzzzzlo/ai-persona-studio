(function (A) {
  'use strict';
  A.quizHTML = function (state) {
    var q = A.questions[state.index], total = A.questions.length;
    var configuration = q.kind === 'configuration';
    var stage = A.config.stages.find(function (s) { return q.id <= s.through; });
    var completed = state.answers.filter(function (answer) { return answer !== null; }).length;
    var options = q.options.map(function (o) {
      return '<button class="answer' + (state.answers[state.index] === o.id ? ' selected' : '') + '" data-answer="' + o.id + '" aria-pressed="' + (state.answers[state.index] === o.id) + '"><span class="answer-letter">' + o.id + '</span><span class="answer-copy">' + A.escape(o.text) + '</span></button>';
    }).join('');
    return '<section class="screen quiz' + (configuration ? ' configuration-question' : '') + '"><header class="masthead quiz-nav"><button class="nav-back" data-action="back" aria-label="' + (state.index ? '返回上一题' : '返回首页') + '">‹</button>' + A.brand + '</header><div class="progress-meta"><div class="counter">' + String(state.index + 1).padStart(2, '0') + '<span>/ ' + total + '</span></div><p class="progress-caption">' + A.escape(stage.text) + '</p></div><div class="progress-track" role="progressbar" aria-label="答题进度" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + completed + '"><div class="progress-fill" style="width:' + (completed / total * 100) + '%"></div></div><div class="question-body"><p class="question-label">' + (configuration ? 'AI 设定 · ' + A.escape(A.aiConfig.fields[q.dimension].title) : '第 ' + (state.index + 1) + ' 题') + '</p><h1 class="question-title" tabindex="-1">' + A.escape(q.prompt) + '</h1>' + (q.description ? '<p class="question-description">' + A.escape(q.description) + '</p>' : '') + '<div class="answers" aria-label="' + (configuration ? '选择你希望的 AI 设定' : '选择最让你心动的回应') + '">' + options + '</div></div><p class="quiz-hint">' + (configuration ? '这一项会写入 TA 的 AI 配置档案<br>' : '凭第一感觉作答<br>') + '选中即进入下一题 · 可以返回修改</p></section>';
  };
  A.transitionHTML = function () {
    return '<section class="screen transition"><header class="masthead quiz-nav"><button class="nav-back" data-action="transition-back" aria-label="返回上一题">‹</button>' + A.brand + '</header><div class="transition-content"><img src="' + A.markPath + '" width="104" height="104" alt=""><p class="eyebrow">已完成 14 / 18 题</p><h1 tabindex="-1">TA 的性格轮廓<br>已经基本确定</h1><p class="transition-copy">接下来 4 题，我们开始决定：<br>TA 作为一个 AI，究竟应该怎么陪你。</p><div class="transition-fields"><span>记忆方式</span><span>人格成长</span><span>情景模式</span><span>存在方式</span></div></div><div class="transition-action"><button class="primary" data-action="continue-configuration">继续塑造 TA<span class="arrow" aria-hidden="true">→</span></button><p class="smallprint">让心动的原型，多一点属于你的设定。</p></div></section>';
  };
})(window.HeartTest);
