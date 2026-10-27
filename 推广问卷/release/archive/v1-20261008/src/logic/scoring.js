(function (A) {
  'use strict';
  A.clamp = function (value) { return Math.max(-1, Math.min(1, value)); };
  A.normalizeVector = function (vector) {
    if (!Array.isArray(vector) || vector.length !== 7 || vector.some(function (v) { return typeof v !== 'number' || !Number.isFinite(v); })) throw new Error('七维输入必须是七个有限数字');
    return vector.map(A.clamp);
  };
  A.validAnswers = function (answers) {
    return Array.isArray(answers) && answers.length === A.questions.length && answers.every(function (id, i) { return id === null || A.questions[i].options.some(function (o) { return o.id === id; }); });
  };
  A.score = function (answers) {
    if (!A.validAnswers(answers)) throw new Error('答案格式无效');
    var vector = A.config.dimensions.map(function () { return 0; });
    A.questions.forEach(function (q, index) {
      if (q.kind !== 'scenario') return;
      var option = q.options.find(function (o) { return o.id === answers[index]; });
      if (option) vector[A.config.dimensions.indexOf(q.dimension)] += option.score / 4;
    });
    var last = A.questions.find(function (q) { return q.kind === 'calibration'; });
    var choice = last.options.find(function (o) { return o.id === answers[last.id - 1]; });
    if (choice) Object.keys(choice.calibration).forEach(function (d) { vector[A.config.dimensions.indexOf(d)] += choice.calibration[d]; });
    return A.normalizeVector(vector);
  };
})(window.HeartTest);
