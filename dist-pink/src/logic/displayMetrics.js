(function (A) {
  'use strict';
  A.displayMetrics = function (persona, vector) {
    return persona.metrics.map(function (metric) {
      var position = (A.clamp(vector[A.config.dimensions.indexOf(metric.dimension)]) * metric.direction + 1) / 2;
      return { label: metric.label, value: Math.round((metric.min + position * (metric.max - metric.min)) / 5) * 5 };
    });
  };
})(window.HeartTest);
