# 用户偏好画像规范 1.0.0

正式机器规范为 `backend/src/main/resources/schema/user-preference-profile.schema.json`，采用 JSON Schema Draft 2020-12；行为锚点见同目录 `dimension-catalog.json`。`backend/tools/generate-schema.py` 是它们的生成源，同时生成草稿、完整示例和创建请求。修改模型时更新生成源并运行测试，不能仅修改文档。

该模型用于后续人格提示词编译，不是娱乐人格测试结果。1–5 档是内部工程表示，没有心理测量效度声明。数据库 ID、用户 ID、快照版本号和时间不重复放入 JSON。

## 顶层字段

所有顶层字段必需，不接受未声明字段；尚无条目时数组为 `[]`。

| 字段 | 含义 |
| --- | --- |
| `schemaVersion` | 固定 `1.0.0`，独立于数据库版本号 |
| `targetPersona` | name、relationshipArchetype、至少一条 coreSettings |
| `dimensions` | 以下七个必需维度，每个都有独立偏好值、类型、状态、重要性和证据 |
| `contextualPolicies` | 整份画像上的跨维度情境规则 |
| `narrativeConfig` | mode=CHAT/ROLEPLAY/MIXED；perspective=FIRST_PERSON/SECOND_PERSON/THIRD_PERSON；actionDescriptions=NONE/BRIEF/DETAILED |
| `linguisticConfig` | userAddress、personaSelfAddress、tone 字符串集合、language=zh-CN/zh-TW/en/MIXED、replyLength=SHORT/MEDIUM/LONG |
| `memoryAnchors` | anchorId、content、status、evidenceRefs；希望在提示词中固定表达的静态事实 |
| `hardConstraints` | 独立的禁令和关系边界 |
| `unresolvedItems` | itemId、targetPath、question、blocking、status=OPEN/RESOLVED |
| `conflicts` | conflictId、至少两个 targetPaths、description、status、resolution；状态 OPEN/RESOLVED/USER_ACCEPTED_TRADEOFF，后两种必须提供非空解决说明 |
| `readiness` | readyForCompilation、blockers、warnings，由确定性业务规则验证 |

## 维度结构与状态

```json
{
  "value": null,
  "valueType": "LEVEL",
  "status": "UNKNOWN",
  "importance": "UNSPECIFIED",
  "evidenceStrength": "NONE",
  "evidenceRefs": []
}
```

| 状态 | value 规则 | 编译处理 |
| --- | --- | --- |
| UNKNOWN | 必须 null；强度 NONE，证据空 | 阻断，不填默认值 |
| INFERRED_TENTATIVE | 必须有合法值及证据引用 | 仅模型推断，阻断 |
| EXTRACTED_PROVISIONAL | 必须有合法值及证据引用 | 提取待确认，阻断 |
| NEEDS_CLARIFICATION | 必须 null，可保留证据引用 | 阻断，候选留在证据里 |
| CONFLICTED | 必须 null，可保留证据引用 | 阻断，冲突双方留在 conflicts/证据里 |
| USER_CONFIRMED | 必须有合法值和证据引用 | 可参与编译；写入时要求已确认的非模型证据 |
| USER_SKIPPED | 必须 null，可保留证据引用 | 生成 skipped 警告，不擅自补值 |

`importance` 为 UNSPECIFIED/LOW/MEDIUM/HIGH/CRITICAL，表示用户需求的重要性。`evidenceStrength` 为 NONE/WEAK/MODERATE/STRONG，表示证据支撑强度。二者不决定偏好值，不是状态的替代品；强证据也不能将模型推断自动变成用户确认。

## 维度目录

| ID | 操作性定义与类型 | 合法取值与行为映射 |
| --- | --- | --- |
| conversationInitiative | 当前会话主动延展程度，LEVEL | 1 只回应；2 偶尔追问；3 自然延展；4 经常提话题；5 积极引导当前对话 |
| emotionalSupport | 情绪出现时采用的策略，MULTI_SELECT | LISTEN 倾听复述、VALIDATE 认可感受、ADVICE_ON_REQUEST 请求后建议、PRACTICAL_HELP 具体帮助；非空不重复集合 |
| intimacyDirectness | 尊重边界前提下表达亲近的直白程度，LEVEL | 1 含蓄陪伴；2 温和暗示；3 自然表达喜欢；4 直接亲近；5 频繁明确表达亲近 |
| independentAgency | 独立观点和虚构兴趣，LEVEL | 1 主要跟随；2 偶尔表达偏好；3 保有观点；4 主动说不同意见；5 鲜明独立且尊重边界 |
| relationshipLeadership | 互动节奏与共同选择中的带领程度，LEVEL | 1 用户决定；2 跟随并给选项；3 平等商量；4 主动提议征求同意；5 积极安排但可被拒绝 |
| teasingIntensity | 善意调侃频率与力度，LEVEL | 1 不调侃；2 偶尔轻松玩笑；3 熟悉后适度调侃；4 较多机智互怼；5 频繁犀利玩笑但服从边界 |
| adaptationStyle | 核心人格与反馈的调整策略，ENUM | CONSISTENT 保持表达习惯；CONTEXTUAL 核心不变按情境调整；FEEDBACK_LED 核心不变优先按明确反馈调整 |

独立主体性描述“是否有自己的观点”，关系主导性描述“谁带动互动节奏”，两者可以独立组合。情感支持方式不应压为一条高低轴。人格稳定与适应不被硬排成互斥分数。禁令不靠降低 teasingIntensity 等值表达。

## 情境规则

必需字段：policyId、triggerCondition、priority（0–100）、affectedTargets、overrides、instruction、status、evidenceRefs。ID 在画像内唯一。

`affectedTargets` 可包含任一维度 ID，以及行为 `unsolicitedAdvice`。每条覆盖包含 `operation=SET`、target JSON Pointer 和类型正确的 value；V1 不支持任意字段写入或数值增减。后端检查覆盖目标出现在 affectedTargets 中，且同一规则不重复覆盖同一目标。

例如 `sad-support` 在用户当前对话明确表示难过时，以优先级 80 同时 SET `/dimensions/teasingIntensity/value` 为 1、情感支持为倾听/认可/按请求建议，并将 `/behaviors/unsolicitedAdvice` 设为 false。最后这个路径是编译器的行为目标，不是画像顶层持久化字段。

未来编译语义：硬约束优先于情境规则，情境规则优先于常态偏好；命中多条规则时较高 priority 优先。同优先级且同目标不同值必须在编译前澄清。V1 保存并校验规则结构，不实现自然语言触发检测或复杂规则冲突识别。`readiness=true` 仅表示满足 V1 结构和确认条件，后续编译器仍必须做规则和语义质量校验。

触发条件和 instruction 是给外部模型阅读的完整自然语言设定，不是本站实时监控情绪的程序。只有 USER_CONFIRMED 条目可作为已确认内容使用，USER_SKIPPED 条目应省略，其他状态阻断。

## 硬约束

必需字段：constraintId、category、ruleType、triggerCondition、prohibitedBehavior、positiveReplacement、sourceType、immutableByInference、status、evidenceRefs。

category=RELATIONSHIP_BOUNDARY/COMMUNICATION/PRIVACY/OTHER；ruleType=ALWAYS_PROHIBIT/CONDITIONAL_PROHIBIT。即使 ALWAYS_PROHIBIT 也写明触发条件“任何时候”。sourceType=QUESTIONNAIRE/FREE_TEXT/CLARIFICATION/USER_EDIT/MODEL_INFERENCE。

用户已确认的约束必须 immutableByInference=true，来源不能是 MODEL_INFERENCE。Java `ProfileRules.protectFromInference` 执行保护，拒绝模型改值、删条目、改 ID 或关闭标记。用户明确编辑可生成新版本。模型建议只能待确认，不能依赖 Prompt 或该布尔字段本身提供保护。

## 编译就绪与证据

后端使用 `ProfileRules.readiness` 计算有序、去重的列表，并要求 JSON 中提供的 readiness 完全一致（列表按字典序）：

- 未确认/未跳过的维度：`dimension:ID`；规则、边界、锚点分别为 `policy:ID`、`constraint:ID`、`anchor:ID`，均阻断。
- OPEN 且 blocking 的缺失项：`unresolved:ID` 阻断；非 blocking 项进入 warnings。
- OPEN 冲突：`conflict:ID` 阻断。
- 跳过的条目：`skipped:dimension:ID` 等进入 warnings，不阻断。
- blockers 为空时 readyForCompilation=true；不为空时 false。

V1 的保守策略要求推断与提取结果经过确认；缺失条目可以作为合法草稿持久化。非法的“未知且有值”即使不准备编译也会被拒绝。

数组 ID 唯一、目标路径存在、规则目标匹配等由 Java 检查；数据库证据引用不能由 JSON Schema 单独验证。`POST /validate` 校验结构和确定性业务规则，不校验证据表，不能把其成功当作一定可写库。写入还会检查证据归属、状态及确认真实性。rawExcerpt 可空且不默认保留完整对话，详见 architecture.md。

## 可执行示例

- `docs/examples/profile-draft.json`：七维未知、合法可存草稿，不就绪。
- `docs/examples/profile-ready.json`：含多目标情境规则、硬约束和静态锚点的完整画像。
- `docs/examples/create-profile.json`：完整创建请求，包括单条整份问卷确认的最小化证据。每次创建须更换 evidenceId 并同步修改引用；生产场景应使用具体题号及字段路径。

所有示例由后端测试实际读取，目录等级锚点也有一致性测试。实例中的姓名与事实均为虚构开发数据。
