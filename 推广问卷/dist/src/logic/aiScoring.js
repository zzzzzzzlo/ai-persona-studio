(function (A) {
  'use strict';
  A.scoreAI = function (answers) {
    if (!A.validAnswers(answers)) throw new Error('答案格式无效');
    var scores = {};
    A.aiConfig.dimensions.forEach(function (dimension) {
      var total = 0, complete = true;
      A.aiConfig.sources[dimension].forEach(function (source) {
        var index = source.question - 1;
        var option = A.questions[index].options.find(function (o) { return o.id === answers[index]; });
        if (!option) complete = false;
        else total += source.weight * option.scores[dimension] / A.aiConfig.normalization;
      });
      scores[dimension] = complete ? A.clamp(total) : null;
    });
    return scores;
  };
  A.evaluateAnswers = function (answers) {
    if (!A.validAnswers(answers) || answers.some(function (answer) { return answer === null; })) throw new Error('请完成全部 18 道题后查看 AI 人格档案。');
    var result = A.match(A.score(answers));
    result.aiScores = A.scoreAI(answers);
    return result;
  };
})(window.HeartTest);
