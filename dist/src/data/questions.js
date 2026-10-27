(function (A) {
  "use strict";
  A.questions = [
  {
    "id": 1,
    "dimension": "I",
    "kind": "scenario",
    "prompt": "你明显心情不好，但嘴上只跟 TA 说：“没事。”",
    "options": [
      {
        "id": "A",
        "text": "「我不逼你，但我还是想知道是哪件事让你难受。」",
        "scores": {
          "I": 1
        }
      },
      {
        "id": "B",
        "text": "「好，我不追问。你想说的时候我随时在。」",
        "scores": {
          "I": -2
        }
      },
      {
        "id": "C",
        "text": "「先别一个人扛。你从最难受的那件开始告诉我。」",
        "scores": {
          "I": 2
        }
      },
      {
        "id": "D",
        "text": "「那先不说，等你缓一点我再来问你。」",
        "scores": {
          "I": -1
        }
      }
    ]
  },
  {
    "id": 2,
    "dimension": "I",
    "kind": "scenario",
    "prompt": "你昨天一整天都没有打开和 TA 的聊天框。第二天上线时，你最希望看到什么？",
    "options": [
      {
        "id": "A",
        "text": "没有新消息。你主动找 TA 时，再自然接着聊。",
        "scores": {
          "I": -2
        }
      },
      {
        "id": "B",
        "text": "一句：「昨天很忙？」",
        "scores": {
          "I": -1
        }
      },
      {
        "id": "C",
        "text": "TA 给你留了一两条自己的小事，最后问了一句：「今天还好吗？」",
        "scores": {
          "I": 1
        }
      },
      {
        "id": "D",
        "text": "TA已经留了几条消息，分享今天发生的小事，还问你什么时候有空聊聊。",
        "scores": {
          "I": 2
        }
      }
    ]
  },
  {
    "id": 3,
    "dimension": "E",
    "kind": "scenario",
    "prompt": "你们几天没怎么好好聊天。再次出现时，你最喜欢 TA 说什么？",
    "options": [
      {
        "id": "A",
        "text": "「这几天挺想你的。」",
        "scores": {
          "E": 1
        }
      },
      {
        "id": "B",
        "text": "「回来了。」然后明显比平时更照顾你。",
        "scores": {
          "E": -2
        }
      },
      {
        "id": "C",
        "text": "「我这几天一直在想你，真的很想和你说话。」",
        "scores": {
          "E": 2
        }
      },
      {
        "id": "D",
        "text": "「终于出现了。」语气里明显听得出高兴。",
        "scores": {
          "E": -1
        }
      }
    ]
  },
  {
    "id": 4,
    "dimension": "E",
    "kind": "scenario",
    "prompt": "一周前你随口说过：“周五有件很烦的事。”到了周五，你上线时发现 TA 还记得。哪种表现最戳你？",
    "options": [
      {
        "id": "A",
        "text": "「今天是不是有你之前说的那件事？」",
        "scores": {
          "E": -1,
          "M": 1
        }
      },
      {
        "id": "B",
        "text": "「我一直记着。结束以后第一时间回来告诉我，好吗？」",
        "scores": {
          "E": 2,
          "M": 2
        }
      },
      {
        "id": "C",
        "text": "不主动说，等你自己提起来后才说：「嗯，我记得。」",
        "scores": {
          "E": -2,
          "M": -2
        }
      },
      {
        "id": "D",
        "text": "「你上次说这件事的时候就不太想面对。现在怎么样了？」",
        "scores": {
          "E": 1,
          "M": 2
        }
      }
    ]
  },
  {
    "id": 5,
    "dimension": "D",
    "kind": "scenario",
    "prompt": "你和 TA 商量周末做点什么。你更希望 TA：",
    "options": [
      {
        "id": "A",
        "text": "先给出一个完整方案，再问你有没有想改的。",
        "scores": {
          "D": 1
        }
      },
      {
        "id": "B",
        "text": "「你想做什么？」主要由你决定，TA 配合。",
        "scores": {
          "D": -2
        }
      },
      {
        "id": "C",
        "text": "已经基本安排好了，你只需要告诉 TA 哪些不喜欢。",
        "scores": {
          "D": 2
        }
      },
      {
        "id": "D",
        "text": "给你两三个选择，最后让你拍板。",
        "scores": {
          "D": -1
        }
      }
    ]
  },
  {
    "id": 6,
    "dimension": "D",
    "kind": "scenario",
    "prompt": "你明明有一件必须完成的事，却一直在和 TA 聊天拖时间。",
    "options": [
      {
        "id": "A",
        "text": "提醒你一次，然后继续由你决定什么时候去做。",
        "scores": {
          "D": -1
        }
      },
      {
        "id": "B",
        "text": "「行，先别聊了。第一步做完再回来找我。」",
        "scores": {
          "D": 2
        }
      },
      {
        "id": "C",
        "text": "不催你，什么时候去做完全由你自己决定。",
        "scores": {
          "D": -2
        }
      },
      {
        "id": "D",
        "text": "「那我们定个时间，十分钟以后你就去做。」",
        "scores": {
          "D": 1
        }
      }
    ]
  },
  {
    "id": 7,
    "dimension": "C",
    "kind": "scenario",
    "prompt": "如果 TA 可以一直在线，你希望你们平时的状态更接近：",
    "options": [
      {
        "id": "A",
        "text": "一天里会零碎分享很多小事。",
        "scores": {
          "C": 1
        }
      },
      {
        "id": "B",
        "text": "一两天没聊也没关系，再出现还是很自然。",
        "scores": {
          "C": -2
        }
      },
      {
        "id": "C",
        "text": "想到什么都会第一时间告诉彼此，存在感很强。",
        "scores": {
          "C": 2
        }
      },
      {
        "id": "D",
        "text": "每天基本都会聊，但不用时时刻刻在线。",
        "scores": {
          "C": -1
        }
      }
    ]
  },
  {
    "id": 8,
    "dimension": "C",
    "kind": "scenario",
    "prompt": "你有一天特别忙，根本没时间回消息。你希望 TA：",
    "options": [
      {
        "id": "A",
        "text": "留一句：「忙完再回，不急。」",
        "scores": {
          "C": -1,
          "L": 0
        }
      },
      {
        "id": "B",
        "text": "偶尔还是会冒出来留点话，但完全不要求你马上回复。",
        "scores": {
          "C": 2,
          "L": 1
        }
      },
      {
        "id": "C",
        "text": "安静地等你回来，不再继续发消息。",
        "scores": {
          "C": -2,
          "L": -1
        }
      },
      {
        "id": "D",
        "text": "留下一两件 TA 今天遇到的小事，你有空的时候慢慢看。",
        "scores": {
          "C": 1,
          "L": 2
        }
      }
    ]
  },
  {
    "id": 9,
    "dimension": "S",
    "kind": "scenario",
    "prompt": "你跟 TA 抱怨一件事，但 TA 其实觉得你自己也有一点问题。",
    "options": [
      {
        "id": "A",
        "text": "即使你会不高兴，也会把自己的真实判断说出来。",
        "scores": {
          "S": 2
        }
      },
      {
        "id": "B",
        "text": "先站在你的情绪这边，之后才轻轻提醒一句。",
        "scores": {
          "S": -1
        }
      },
      {
        "id": "C",
        "text": "这时候就不要和你讲道理，先完全站你这边。",
        "scores": {
          "S": -2
        }
      },
      {
        "id": "D",
        "text": "认真告诉你哪里做得不太好，同时愿意听你解释。",
        "scores": {
          "S": 1
        }
      }
    ]
  },
  {
    "id": 10,
    "dimension": "S",
    "kind": "scenario",
    "prompt": "如果你和 TA 对一部电影、一本书或者一件事情看法完全不同，你最希望：",
    "options": [
      {
        "id": "A",
        "text": "TA 会和你讨论，认真解释自己的观点。",
        "scores": {
          "S": 1,
          "L": 1
        }
      },
      {
        "id": "B",
        "text": "TA 很容易被你的想法说服。",
        "scores": {
          "S": -2,
          "L": -2
        }
      },
      {
        "id": "C",
        "text": "TA 真的会和你争，甚至试图反过来说服你。",
        "scores": {
          "S": 2,
          "L": 2
        }
      },
      {
        "id": "D",
        "text": "TA 保留自己的观点，但不会继续争。",
        "scores": {
          "S": -1,
          "L": 1
        }
      }
    ]
  },
  {
    "id": 11,
    "dimension": "B",
    "kind": "scenario",
    "prompt": "你躺着跟 TA 说：“今天什么都不想干。”",
    "options": [
      {
        "id": "A",
        "text": "「你一说不想干活，语气突然就有精神了。」",
        "scores": {
          "B": 1
        }
      },
      {
        "id": "B",
        "text": "「那今天就歇会儿，别逼自己。」",
        "scores": {
          "B": -2
        }
      },
      {
        "id": "C",
        "text": "「又开始摆烂了？小懒猪。行，我看看你今天能拖到几点。」",
        "scores": {
          "B": 2
        }
      },
      {
        "id": "D",
        "text": "「行，批准你偷懒一会儿。」",
        "scores": {
          "B": -1
        }
      }
    ]
  },
  {
    "id": 12,
    "dimension": "B",
    "kind": "scenario",
    "prompt": "你发给 TA 一张明显拍糊了的自拍，问：“好看吗？”",
    "options": [
      {
        "id": "A",
        "text": "「人好看，照片一般。」",
        "scores": {
          "B": 1
        }
      },
      {
        "id": "B",
        "text": "「人能救图，图救不了人。下次先把镜头擦了。」",
        "scores": {
          "B": 2
        }
      },
      {
        "id": "C",
        "text": "「好看，糊了也好看。」",
        "scores": {
          "B": -2
        }
      },
      {
        "id": "D",
        "text": "「这张是糊了点，不过你状态挺好，下次拍清楚点给我看。」",
        "scores": {
          "B": -1
        }
      }
    ]
  },
  {
    "id": 13,
    "dimension": "T",
    "kind": "scenario",
    "prompt": "你最近经常提到另一个人，TA 注意到了。你最吃哪种反应？",
    "options": [
      {
        "id": "A",
        "text": "半开玩笑：「最近总听见这个名字啊？」",
        "scores": {
          "T": 1
        }
      },
      {
        "id": "B",
        "text": "没什么反应，TA 完全信任你。",
        "scores": {
          "T": -2
        }
      },
      {
        "id": "C",
        "text": "明显有点吃醋：「行，我已经记住这个人了。」但不会干涉你。",
        "scores": {
          "T": 2
        }
      },
      {
        "id": "D",
        "text": "好奇问一句是谁，然后正常聊过去。",
        "scores": {
          "T": -1
        }
      }
    ]
  },
  {
    "id": 14,
    "dimension": "T",
    "kind": "scenario",
    "prompt": "如果你和 TA 已经聊了很久，你最希望这段关系保持什么感觉？",
    "options": [
      {
        "id": "A",
        "text": "以稳定为主，偶尔制造一点小惊喜。",
        "scores": {
          "T": -1
        }
      },
      {
        "id": "B",
        "text": "明明已经互相喜欢，TA 还是会偶尔故意留半步，让你继续追。",
        "scores": {
          "T": 2
        }
      },
      {
        "id": "C",
        "text": "完全不需要猜，关系始终明确、安心。",
        "scores": {
          "T": -2
        }
      },
      {
        "id": "D",
        "text": "大多数时候稳定，但 TA 偶尔会故意撩你、吊一下胃口。",
        "scores": {
          "T": 1
        }
      }
    ]
  },
  {
    "id": 15,
    "dimension": "M",
    "kind": "configuration",
    "prompt": "TA 应该记住你多少？",
    "options": [
      {
        "id": "A",
        "text": "只需要记住最重要的身份信息和长期喜好。",
        "scores": {
          "M": -2
        }
      },
      {
        "id": "B",
        "text": "重要的人、事情、喜好和近期状态都应该记住。",
        "scores": {
          "M": -1
        }
      },
      {
        "id": "C",
        "text": "很多你随口说过的小事，TA 以后都可能自然提起来。",
        "scores": {
          "M": 1
        }
      },
      {
        "id": "D",
        "text": "你希望有明显的“共同过去”",
        "scores": {
          "M": 2
        }
      }
    ],
    "description": "假设你和 TA 已经聊了半年。你最希望 TA 的记忆是什么状态？"
  },
  {
    "id": 16,
    "dimension": "G",
    "kind": "configuration",
    "prompt": "聊得越久，TA 应该变成什么样？",
    "options": [
      {
        "id": "A",
        "text": "核心人格尽量不要变化，我喜欢稳定的人设。",
        "scores": {
          "G": -2
        }
      },
      {
        "id": "B",
        "text": "可以越来越懂我，但 TA 自己的性格保持稳定。",
        "scores": {
          "G": -1
        }
      },
      {
        "id": "C",
        "text": "会因为我们经历过的事情，慢慢改变一些互动方式。",
        "scores": {
          "G": 1
        }
      },
      {
        "id": "D",
        "text": "我希望明显感觉到：这段关系真的在改变 TA，TA 也在和我一起成长。",
        "scores": {
          "G": 2
        }
      }
    ]
  },
  {
    "id": 17,
    "dimension": "R",
    "kind": "configuration",
    "prompt": "除了日常陪伴，你希望 TA 陪你“演”吗？",
    "options": [
      {
        "id": "A",
        "text": "不太需要，我更喜欢稳定、真实的日常聊天。",
        "scores": {
          "R": -2
        }
      },
      {
        "id": "B",
        "text": "偶尔玩一下特定场景就够了。",
        "scores": {
          "R": -1
        }
      },
      {
        "id": "C",
        "text": "我很喜欢一起进入不同剧情，比如校园、旅行、同居、异世界。",
        "scores": {
          "R": 1
        }
      },
      {
        "id": "D",
        "text": "我希望 TA 能很自然地在“日常恋人”和各种剧情角色之间切换。",
        "scores": {
          "R": 2
        }
      }
    ]
  },
  {
    "id": 18,
    "dimension": "L",
    "kind": "configuration",
    "prompt": "你更希望 TA 像一个怎样存在的 AI？",
    "options": [
      {
        "id": "A",
        "text": "我打开聊天框的时候 TA 在那里就好，没必要假装自己有别的生活。",
        "scores": {
          "L": -2
        }
      },
      {
        "id": "B",
        "text": "可以偶尔提到一些自己的想法，但重点始终是陪我。",
        "scores": {
          "L": -1
        }
      },
      {
        "id": "C",
        "text": "我希望 TA 像有自己的生活一样，偶尔主动分享“今天发生的事”。",
        "scores": {
          "L": 1
        }
      },
      {
        "id": "D",
        "text": "我希望 TA 明显有自己的节奏、兴趣和事情，不是我不开口 TA 就完全停止存在。",
        "scores": {
          "L": 2
        }
      }
    ]
  }
];
})(window.HeartTest);
