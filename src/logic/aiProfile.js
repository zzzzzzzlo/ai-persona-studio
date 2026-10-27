(function (A) {
  'use strict';
  A.aiLabel = function (dimension, score) {
    var field = A.aiConfig.fields[dimension];
    if (!field || typeof score !== 'number' || !Number.isFinite(score)) return null;
    return field.bands.find(function (band) { return A.clamp(score) <= band.max; });
  };
  A.buildAIProfile = function (scores) {
    return A.aiConfig.dimensions.map(function (dimension) {
      var band = A.aiLabel(dimension, scores && scores[dimension]);
      return { dimension: dimension, title: A.aiConfig.fields[dimension].title, label: band ? band.label : '待完成设定', key: band ? band.key : null, description: band ? A.aiConfigCopy[dimension][band.key] : '完成最后 4 道 AI 设定题后，生成这一项专属配置。' };
    });
  };
})(window.HeartTest);
