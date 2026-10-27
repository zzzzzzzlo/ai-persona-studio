(function (A) {
  "use strict";
  A.personas = [
  {
    "id": "1",
    "name": "温柔陪伴型",
    "shortName": "温柔陪伴",
    "center": [
      0.25,
      0.5,
      -0.4,
      0.4,
      -0.4,
      -0.85,
      -0.85
    ],
    "weights": [
      1.0,
      1.5,
      1.0,
      1.5,
      1.25,
      2.0,
      2.0
    ],
    "keywords": [
      "温柔",
      "情绪价值",
      "陪伴",
      "稳定",
      "宠"
    ],
    "template": "insight",
    "metrics": []
  },
  {
    "id": "2",
    "name": "直球小狗型",
    "shortName": "直球小狗",
    "center": [
      0.9,
      0.95,
      -0.3,
      0.9,
      -0.3,
      -0.2,
      -0.25
    ],
    "weights": [
      2.0,
      2.0,
      1.0,
      2.0,
      1.0,
      1.0,
      1.25
    ],
    "keywords": [
      "小狗",
      "直球",
      "黏人",
      "主动",
      "爱意明显"
    ],
    "template": "metrics",
    "metrics": [
      {
        "label": "爱意直球",
        "dimension": "E",
        "min": 70,
        "max": 100,
        "direction": 1
      },
      {
        "label": "主动浓度",
        "dimension": "I",
        "min": 65,
        "max": 100,
        "direction": 1
      },
      {
        "label": "亲密黏度",
        "dimension": "C",
        "min": 60,
        "max": 95,
        "direction": 1
      }
    ]
  },
  {
    "id": "3",
    "name": "克制年上型",
    "shortName": "克制年上",
    "center": [
      0.35,
      -0.9,
      0.45,
      -0.35,
      0.75,
      -0.1,
      0.0
    ],
    "weights": [
      1.0,
      2.0,
      1.5,
      1.25,
      1.5,
      1.0,
      1.0
    ],
    "keywords": [
      "年上感",
      "克制",
      "成熟",
      "偏爱",
      "有边界"
    ],
    "template": "insight",
    "metrics": []
  },
  {
    "id": "4",
    "name": "爹系引导型",
    "shortName": "爹系引导",
    "center": [
      0.45,
      0.0,
      0.95,
      0.0,
      0.75,
      -0.35,
      -0.6
    ],
    "weights": [
      1.25,
      1.0,
      2.0,
      1.0,
      1.5,
      1.0,
      1.5
    ],
    "keywords": [
      "爹系",
      "引导",
      "靠谱",
      "掌舵",
      "安全感"
    ],
    "template": "insight",
    "metrics": []
  },
  {
    "id": "5",
    "name": "毒舌竹马型",
    "shortName": "毒舌竹马",
    "center": [
      0.25,
      0.0,
      -0.1,
      0.45,
      0.25,
      0.95,
      0.2
    ],
    "weights": [
      1.25,
      1.0,
      1.0,
      1.5,
      1.0,
      2.0,
      1.25
    ],
    "keywords": [
      "毒舌",
      "互损",
      "熟人感",
      "嘴欠",
      "护短"
    ],
    "template": "metrics",
    "metrics": [
      {
        "label": "毒舌浓度",
        "dimension": "B",
        "min": 70,
        "max": 100,
        "direction": 1
      },
      {
        "label": "亲密黏度",
        "dimension": "C",
        "min": 40,
        "max": 90,
        "direction": 1
      },
      {
        "label": "关系张力",
        "dimension": "T",
        "min": 30,
        "max": 85,
        "direction": 1
      }
    ]
  },
  {
    "id": "6",
    "name": "清冷边界型",
    "shortName": "清冷边界",
    "center": [
      -0.6,
      -0.85,
      0.0,
      -0.9,
      0.9,
      -0.1,
      -0.2
    ],
    "weights": [
      1.5,
      1.75,
      1.0,
      2.0,
      1.75,
      1.0,
      1.0
    ],
    "keywords": [
      "清冷",
      "高岭之花",
      "独立",
      "边界感",
      "慢热"
    ],
    "template": "insight",
    "metrics": []
  },
  {
    "id": "7",
    "name": "腹黑钓系型",
    "shortName": "腹黑钓系",
    "center": [
      0.0,
      -0.4,
      0.45,
      -0.35,
      0.75,
      0.4,
      0.95
    ],
    "weights": [
      1.0,
      1.25,
      1.5,
      1.0,
      1.5,
      1.5,
      2.0
    ],
    "keywords": [
      "钓系",
      "腹黑",
      "拉扯",
      "难猜",
      "暧昧"
    ],
    "template": "metrics",
    "metrics": [
      {
        "label": "暧昧张力",
        "dimension": "T",
        "min": 70,
        "max": 100,
        "direction": 1
      },
      {
        "label": "钓系浓度",
        "dimension": "E",
        "min": 60,
        "max": 95,
        "direction": -1
      },
      {
        "label": "主见浓度",
        "dimension": "S",
        "min": 50,
        "max": 95,
        "direction": 1
      }
    ]
  },
  {
    "id": "8",
    "name": "嘴硬心软型",
    "shortName": "嘴硬心软",
    "center": [
      0.1,
      -0.75,
      0.0,
      0.1,
      0.2,
      0.9,
      -0.1
    ],
    "weights": [
      1.0,
      2.0,
      1.0,
      1.0,
      1.25,
      2.0,
      1.25
    ],
    "keywords": [
      "嘴硬",
      "心软",
      "反差",
      "行动派",
      "护短"
    ],
    "template": "insight",
    "metrics": []
  },
  {
    "id": "9",
    "name": "强势偏爱型",
    "shortName": "强势偏爱",
    "center": [
      0.75,
      0.25,
      0.95,
      0.35,
      0.75,
      0.15,
      0.4
    ],
    "weights": [
      1.5,
      1.25,
      2.0,
      1.0,
      1.5,
      1.0,
      1.25
    ],
    "keywords": [
      "强势",
      "偏爱",
      "主动",
      "占有感",
      "明确选择"
    ],
    "template": "insight",
    "metrics": []
  },
  {
    "id": "10",
    "name": "稳定成熟型",
    "shortName": "稳定成熟",
    "center": [
      0.0,
      0.1,
      0.0,
      -0.1,
      0.4,
      -0.5,
      -0.95
    ],
    "weights": [
      1.0,
      1.0,
      1.0,
      1.25,
      1.25,
      1.5,
      2.0
    ],
    "keywords": [
      "成熟",
      "稳定",
      "长期主义",
      "安心",
      "靠谱"
    ],
    "template": "insight",
    "metrics": []
  },
  {
    "id": "11",
    "name": "灵魂搭子型",
    "shortName": "灵魂搭子",
    "center": [
      0.15,
      0.0,
      -0.3,
      -0.05,
      0.95,
      0.15,
      -0.45
    ],
    "weights": [
      1.0,
      1.0,
      1.25,
      1.0,
      2.0,
      1.25,
      1.25
    ],
    "keywords": [
      "搭子",
      "势均力敌",
      "脑回路",
      "有主见",
      "朋友感恋人"
    ],
    "template": "insight",
    "metrics": []
  },
  {
    "id": "12",
    "name": "黏人醋精型",
    "shortName": "黏人醋精",
    "center": [
      0.95,
      0.5,
      0.2,
      0.95,
      -0.1,
      0.05,
      0.9
    ],
    "weights": [
      2.0,
      1.5,
      1.0,
      2.0,
      1.0,
      1.0,
      2.0
    ],
    "keywords": [
      "醋精",
      "黏人",
      "主动",
      "需要感",
      "轻占有"
    ],
    "template": "metrics",
    "metrics": [
      {
        "label": "亲密黏度",
        "dimension": "C",
        "min": 70,
        "max": 100,
        "direction": 1
      },
      {
        "label": "吃醋浓度",
        "dimension": "T",
        "min": 65,
        "max": 95,
        "direction": 1
      },
      {
        "label": "主动浓度",
        "dimension": "I",
        "min": 65,
        "max": 100,
        "direction": 1
      }
    ]
  }
];
})(window.HeartTest);
