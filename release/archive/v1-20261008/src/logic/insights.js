(function (A) {
  'use strict';
  A.insightRules = [
    { dimension: 'S', direction: 1, threshold: 0.5, text: '对你来说，TA有没有自己的想法，可能比TA够不够听话更重要。' },
    { dimension: 'E', direction: -1, threshold: 0.5, text: '你似乎比自己想象中，更容易被克制的偏爱打动。' },
    { dimension: 'C', direction: 1, threshold: 0.5, text: '对你来说，被惦记本身就是一种很重要的爱意。' },
    { dimension: 'T', direction: -1, threshold: 0.5, text: '你容易心动的关系，似乎有一种不需要猜的安心。' },
    { dimension: 'B', direction: 1, threshold: 0.5, text: '你和TA之间，能互损、能接梗，也是一种亲密。' },
    { dimension: 'I', direction: 1, threshold: 0.5, text: '比起一直等你开口，你更喜欢被主动惦记。' }
  ];
  A.predictInsight = function (vector) {
    var rule = A.insightRules.find(function (r) { return vector[A.config.dimensions.indexOf(r.dimension)] * r.direction >= r.threshold; });
    return rule ? rule.text : '让你心动的，可能正是回应、距离与节奏之间刚刚好的平衡。';
  };
})(window.HeartTest);
