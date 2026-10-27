(function (A) {
  'use strict';
  A.aiConfig = {
    dimensions: ['M', 'G', 'R', 'L'],
    normalization: 2,
    sources: {
      M: [{ question: 15, weight: 0.75 }, { question: 4, weight: 0.25 }],
      G: [{ question: 16, weight: 1 }],
      R: [{ question: 17, weight: 1 }],
      L: [{ question: 18, weight: 0.60 }, { question: 8, weight: 0.20 }, { question: 10, weight: 0.20 }]
    },
    fields: {
      M: { title: '记忆方式', bands: [{ max: -0.5, key: 'light', label: '轻量记忆' }, { max: 0.25, key: 'focused', label: '重点记忆' }, { max: 1, key: 'deep', label: '深度关系记忆' }] },
      G: { title: '人格成长', bands: [{ max: -0.75, key: 'stable', label: '稳定型' }, { max: 0.25, key: 'adaptive', label: '适应型' }, { max: 1, key: 'growing', label: '成长型' }] },
      R: { title: '情景模式', bands: [{ max: -0.75, key: 'daily', label: '日常陪伴为主' }, { max: 0.25, key: 'light', label: '轻剧情型' }, { max: 1, key: 'immersive', label: '沉浸剧情 / 自由切换型' }] },
      L: { title: '存在方式', bands: [{ max: -0.5, key: 'quiet', label: '安静陪伴型' }, { max: 0.25, key: 'subtle', label: '低调存在型' }, { max: 1, key: 'independent', label: '独立生活感' }] }
    }
  };
})(window.HeartTest);
