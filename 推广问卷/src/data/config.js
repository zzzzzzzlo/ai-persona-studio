(function (w) {
  'use strict';
  w.HeartTest = {};
  w.HeartTest.config = {
    version: 2,
    storageKey: 'ai-heart-personality-v2',
    questionCount: 18,
    personalityQuestionCount: 14,
    dimensions: ['I', 'E', 'D', 'C', 'S', 'B', 'T'],
    dimensionLabels: ['主动度', '情感表达', '关系主导', '亲密黏度', '主体性', '嘴毒/互损度', '关系张力'],
    thresholds: { dual: 0.02, secondary: 0.06 },
    answerDelay: 200,
    analysisDuration: 1900,
    customizeMessage: '专属 AI 定制版正在准备中。想参与内测，可以回到发布这份测试的笔记评论『想定制』；也可以先保存这份配置。',
    stages: [
      { through: 6, text: '正在确定 TA 的性格底色' },
      { through: 14, text: '正在塑造 TA 与你的相处方式' },
      { through: 18, text: '正在完成 TA 的 AI 人格设定' }
    ]
  };
})(window);
