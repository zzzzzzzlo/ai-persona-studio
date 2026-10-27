(function (A) {
  'use strict';
  A.weightedDistance = function (vector, center, weights) {
    var sum = 0, total = 0;
    vector.forEach(function (value, index) { sum += weights[index] * Math.pow(value - center[index], 2); total += weights[index]; });
    return Math.sqrt(sum / total);
  };
  A.classifyMargin = function (margin) {
    return margin < A.config.thresholds.dual ? 'dual' : margin < A.config.thresholds.secondary ? 'secondary' : 'single';
  };
  A.match = function (input) {
    var vector = A.normalizeVector(input);
    var ranking = A.personas.map(function (p, index) { return { persona: p, distance: A.weightedDistance(vector, p.center, p.weights), order: index }; });
    ranking.sort(function (a, b) { return a.distance - b.distance || a.order - b.order; });
    var margin = ranking[1].distance - ranking[0].distance;
    return { vector: vector, ranking: ranking, primary: ranking[0].persona, secondary: ranking[1].persona, margin: margin, mode: A.classifyMargin(margin) };
  };
})(window.HeartTest);
