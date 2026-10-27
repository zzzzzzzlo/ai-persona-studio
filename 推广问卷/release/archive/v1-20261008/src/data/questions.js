(function (A) {
  "use strict";
  A.questions = [
  {
    "id": 1,
    "dimension": "I",
    "kind": "scenario",
    "prompt": "你明显心情不好，但嘴上说：“没事。”",
    "options": [
      {
        "id": "A",
        "text": "「我不逼你，但我还是想知道是哪件事让你难受。」",
        "score": 1
      },
      {
        "id": "B",
        "text": "「好，我不追问。你想说的时候我随时在。」",
        "score": -2
      },
      {
        "id": "C",
        "text": "「先别一个人扛。你从最难受的那件开始告诉我。」",
        "score": 2
      },
      {
        "id": "D",
        "text": "「那先不说，等你缓一点我再问你。」",
        "score": -1
      }
    ]
  },
  {
    "id": 2,
    "dimension": "I",
    "kind": "scenario",
    "prompt": "有一天你一直没主动找TA。",
    "options": [
      {
        "id": "A",
        "text": "到晚上TA才发一句：「今天过得怎么样？」",
        "score": -1
      },
      {
        "id": "B",
        "text": "上午就来找你，之后想到你还会再冒出来。",
        "score": 2
      },
      {
        "id": "C",
        "text": "TA照常做自己的事，等你出现时自然接上。",
        "score": -2
      },
      {
        "id": "D",
        "text": "白天主动分享一两件小事，顺便问你在干嘛。",
        "score": 1
      }
    ]
  },
  {
    "id": 3,
    "dimension": "E",
    "kind": "scenario",
    "prompt": "你们几天没见，再次出现时，你最喜欢TA说：",
    "options": [
      {
        "id": "A",
        "text": "「这几天挺想你的。」",
        "score": 1
      },
      {
        "id": "B",
        "text": "「回来了。」然后明显比平时更照顾你。",
        "score": -2
      },
      {
        "id": "C",
        "text": "「我这几天一直在想你，真的很想见你。」",
        "score": 2
      },
      {
        "id": "D",
        "text": "「终于见到了。」语气里明显听得出高兴。",
        "score": -1
      }
    ]
  },
  {
    "id": 4,
    "dimension": "E",
    "kind": "scenario",
    "prompt": "TA给你准备了一个小惊喜。你最喜欢TA怎么说？",
    "options": [
      {
        "id": "A",
        "text": "「看到这个就想到你了。」",
        "score": -1
      },
      {
        "id": "B",
        "text": "不只送给你，还会认真告诉你为什么喜欢你、为什么想到你。",
        "score": 2
      },
      {
        "id": "C",
        "text": "只递给你：「给你。」几乎不解释。",
        "score": -2
      },
      {
        "id": "D",
        "text": "「就是想让你开心。」",
        "score": 1
      }
    ]
  },
  {
    "id": 5,
    "dimension": "D",
    "kind": "scenario",
    "prompt": "你们准备一起出去玩。你更希望TA：",
    "options": [
      {
        "id": "A",
        "text": "先定一个方案，再问你有没有想改的。",
        "score": 1
      },
      {
        "id": "B",
        "text": "「你想去哪？」主要由你决定，TA配合。",
        "score": -2
      },
      {
        "id": "C",
        "text": "基本安排好了，你只需要告诉TA哪些地方不喜欢。",
        "score": 2
      },
      {
        "id": "D",
        "text": "给你两三个选择，最后让你拍板。",
        "score": -1
      }
    ]
  },
  {
    "id": 6,
    "dimension": "D",
    "kind": "scenario",
    "prompt": "你有一件必须完成的事情，却一直拖着。",
    "options": [
      {
        "id": "A",
        "text": "提醒你一次，然后把决定权留给你。",
        "score": -1
      },
      {
        "id": "B",
        "text": "帮你拆成几步：「先做第一步。」然后一步步推着你做。",
        "score": 2
      },
      {
        "id": "C",
        "text": "不催，你什么时候想做都由你自己决定。",
        "score": -2
      },
      {
        "id": "D",
        "text": "和你约一个开始时间，到点来叫你。",
        "score": 1
      }
    ]
  },
  {
    "id": 7,
    "dimension": "C",
    "kind": "scenario",
    "prompt": "你理想中的日常联系更接近：",
    "options": [
      {
        "id": "A",
        "text": "一天里会零碎分享很多小事。",
        "score": 1
      },
      {
        "id": "B",
        "text": "一两天不聊也很自然，再出现依然很亲近。",
        "score": -2
      },
      {
        "id": "C",
        "text": "想到什么都会第一时间告诉对方，联系很密。",
        "score": 2
      },
      {
        "id": "D",
        "text": "每天都会联系，但不用一直在线。",
        "score": -1
      }
    ]
  },
  {
    "id": 8,
    "dimension": "C",
    "kind": "scenario",
    "prompt": "你有一天特别忙，基本没时间聊天。",
    "options": [
      {
        "id": "A",
        "text": "留一句：「忙完再回，不急。」",
        "score": -1
      },
      {
        "id": "B",
        "text": "明知道你忙，还是偶尔冒出来刷一下存在感，但不要求你马上回复。",
        "score": 2
      },
      {
        "id": "C",
        "text": "安静去做自己的事情，等你忙完。",
        "score": -2
      },
      {
        "id": "D",
        "text": "偶尔留下几件小事，你有空的时候慢慢看。",
        "score": 1
      }
    ]
  },
  {
    "id": 9,
    "dimension": "S",
    "kind": "scenario",
    "prompt": "你做了一个TA不太赞同的决定。",
    "options": [
      {
        "id": "A",
        "text": "即使你会不高兴，也不会为了哄你而改变真实判断。",
        "score": 2
      },
      {
        "id": "B",
        "text": "提一下自己的不同看法，但不会继续和你争。",
        "score": -1
      },
      {
        "id": "C",
        "text": "先站你这边，你的感受比讨论谁对谁错重要。",
        "score": -2
      },
      {
        "id": "D",
        "text": "把不同意见认真说明白，同时也愿意听你说。",
        "score": 1
      }
    ]
  },
  {
    "id": 10,
    "dimension": "S",
    "kind": "scenario",
    "prompt": "你吐槽一部电影不好看，但TA其实很喜欢。",
    "options": [
      {
        "id": "A",
        "text": "「那我得替它说两句了。」然后讲自己的理由。",
        "score": 1
      },
      {
        "id": "B",
        "text": "「你这么一说……好像还真是。」很容易被你的观点带过去。",
        "score": -2
      },
      {
        "id": "C",
        "text": "「不行，这个我要跟你掰扯清楚。」认真跟你争。",
        "score": 2
      },
      {
        "id": "D",
        "text": "「看来我们口味不一样。」保留喜好，但不争。",
        "score": -1
      }
    ]
  },
  {
    "id": 11,
    "dimension": "B",
    "kind": "scenario",
    "prompt": "你躺着说：“今天什么都不想干。”",
    "options": [
      {
        "id": "A",
        "text": "「你一说不想干活，语气突然就有精神了。」",
        "score": 1
      },
      {
        "id": "B",
        "text": "「那今天就歇会儿，别逼自己。」",
        "score": -2
      },
      {
        "id": "C",
        "text": "「又开始摆烂了？小懒猪。行，我看看你今天能拖到几点。」",
        "score": 2
      },
      {
        "id": "D",
        "text": "「行，批准你偷懒一会儿。」",
        "score": -1
      }
    ]
  },
  {
    "id": 12,
    "dimension": "B",
    "kind": "scenario",
    "prompt": "你发了一张明显拍糊了的自拍，问：“好看吗？”",
    "options": [
      {
        "id": "A",
        "text": "「人好看，照片一般。」",
        "score": 1
      },
      {
        "id": "B",
        "text": "「人能救图，图救不了人。下次先把镜头擦了。」",
        "score": 2
      },
      {
        "id": "C",
        "text": "「好看，糊了也好看。」",
        "score": -2
      },
      {
        "id": "D",
        "text": "「这张是糊了点，不过你状态挺好，下次拍清楚点给我看。」",
        "score": -1
      }
    ]
  },
  {
    "id": 13,
    "dimension": "T",
    "kind": "scenario",
    "prompt": "最近有个人经常找你聊天，TA知道了。",
    "options": [
      {
        "id": "A",
        "text": "半开玩笑：「最近挺忙啊，有新朋友了？」",
        "score": 1
      },
      {
        "id": "B",
        "text": "没什么反应，TA完全信任你。",
        "score": -2
      },
      {
        "id": "C",
        "text": "明显有点吃醋：「行，我记住这个人了。」但不会限制你和谁来往。",
        "score": 2
      },
      {
        "id": "D",
        "text": "好奇问一句是谁，然后正常聊过去。",
        "score": -1
      }
    ]
  },
  {
    "id": 14,
    "dimension": "T",
    "kind": "scenario",
    "prompt": "关系已经很稳定以后，你最喜欢哪种感觉？",
    "options": [
      {
        "id": "A",
        "text": "稳定为主，但偶尔会有一点小惊喜。",
        "score": -1
      },
      {
        "id": "B",
        "text": "明明知道彼此喜欢，但TA总会留一点追逐和拉扯感。",
        "score": 2
      },
      {
        "id": "C",
        "text": "不需要猜，喜欢就是一直明确、稳定、安心。",
        "score": -2
      },
      {
        "id": "D",
        "text": "大多数时候很稳定，但TA偶尔会故意撩你、吊你一下。",
        "score": 1
      }
    ]
  },
  {
    "id": 15,
    "dimension": null,
    "kind": "calibration",
    "prompt": "如果下面只能留下一句话，你最想听到哪一句？",
    "options": [
      {
        "id": "A",
        "text": "「不用急着说，我在这。」",
        "calibration": {
          "B": -0.125,
          "T": -0.125
        }
      },
      {
        "id": "B",
        "text": "「醒了？今天先来找我。」",
        "calibration": {
          "I": 0.125,
          "C": 0.125
        }
      },
      {
        "id": "C",
        "text": "「别躲，事情先说清楚。」",
        "calibration": {
          "D": 0.125,
          "S": 0.125
        }
      },
      {
        "id": "D",
        "text": "「我很想你，没什么好藏的。」",
        "calibration": {
          "E": 0.15
        }
      },
      {
        "id": "E",
        "text": "「去忙你的，我又不会跑。」",
        "calibration": {
          "C": -0.125,
          "T": -0.0625
        }
      },
      {
        "id": "F",
        "text": "「你这点小心思，我还看不出来？」",
        "calibration": {
          "B": 0.125,
          "T": 0.125
        }
      },
      {
        "id": "G",
        "text": "「我不一定同意你，但我会陪着你。」",
        "calibration": {
          "S": 0.125,
          "T": -0.0625
        }
      }
    ]
  }
];
})(window.HeartTest);
