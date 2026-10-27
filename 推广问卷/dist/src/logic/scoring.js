(function (A) {
  'use strict';
  A.clamp = function (value) { return Math.max(-1, Math.min(1, value)); };
  A.normalizeVector = function (vector) {
    if (!Array.isArray(vector) || vector.length !== 7 || vector.some(function (v) { return typeof v !== 'number' || !Number.isFinite(v); })) throw new Error('七维输入必须是七个有限数字');
    return vector.map(A.clamp);
  };
  A.validAnswers = function (answers) {
    if (!Array.isArray(answers) || answers.length !== A.questions.length) return false;
    for (var i = 0; i < answers.length; i += 1) {
      if (answers[i] !== null && !A.questions[i].options.some(function (o) { return o.id === answers[i]; })) return false;
    }
    return true;
  };
  A.score = function (answers) {
    if (!A.validAnswers(answers)) throw new Error('答案格式无效');
    var vector = A.config.dimensions.map(function () { return 0; });
    A.questions.forEach(function (q, index) {
      if (q.kind !== 'scenario' || A.config.dimensions.indexOf(q.dimension) === -1) return;
      var option = q.options.find(function (o) { return o.id === answers[index]; });
      if (option) vector[A.config.dimensions.indexOf(q.dimension)] += option.scores[q.dimension] / 4;
    });
    return A.normalizeVector(vector);
  };
})(window.HeartTest);
