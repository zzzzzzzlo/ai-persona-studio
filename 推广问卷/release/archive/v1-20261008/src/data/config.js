(function (w) {
  'use strict';
  w.HeartTest = {};
  w.HeartTest.config = {
    version: 1,
    storageKey: 'ai-heart-personality-v1',
    dimensions: ['I', 'E', 'D', 'C', 'S', 'B', 'T'],
    dimensionLabels: ['主动度', '情感表达', '关系主导', '亲密黏度', '主体性', '嘴毒/互损度', '关系张力'],
    thresholds: { dual: 0.02, secondary: 0.06 },
    answerDelay: 200,
    analysisDuration: 1900
  };
})(window);
