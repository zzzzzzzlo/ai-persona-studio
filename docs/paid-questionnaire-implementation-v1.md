# 付费问卷前后端闭环 V1.0 · 2026-10-28

后续五项局部修正与最新验证见 [付费问卷 V1 五项修正报告](paid-questionnaire-bugfix-v1.md)。下文保留初版实现与样例的验收记录；Q16 确认、回执计数、Q03 边界及可选题状态以修正报告和当前代码为准。

已在当前 Vue 3 / Spring Boot 3.5.16 / MyBatis-Plus 3.5.17 工程内实现：读取服务端问卷 → 逐题填写 → 本地草稿 → 单次最终提交 → 校验与确定性映射 → 正式 Schema 和业务规则校验 → 事务写入原始答卷、画像版本与证据 → 按接口重新读取。

## 检查结果与数据来源

开始时 Git `main` 工作区干净，远程为 `https://github.com/zzzzzzzlo/ai-persona-studio.git`。原工程已有三张画像表、Flyway V1、正式 Draft 2020-12 Schema、七维目录及开发身份方案，没有已接入的付费问卷/评分/追问题库。因此不存在需要保留优先级的旧付费版本。

- 原始修订包逐文件保存在 `docs/paid-bundle-v1.0.1/`；包含问卷、评分、追问、示例、研究规范和修订记录。
- 运行时配置在 `backend/src/main/resources/questionnaire/`，三份原始 JSON 与提供的 1.0.1 一致，不做静默修改。
- 真正的画像规范仍为 `backend/src/main/resources/schema/user-preference-profile.schema.json` 与 `dimension-catalog.json`，未改动。
- 原三表迁移 `V1__create_profile_tables.sql` 未改动；新增 V2 只补充问卷提交表。
- `推广问卷/` 原文件未改动。读取其源码后，复用浅粉色值、系统字体、心形对话框 SVG、28px 白卡、18px 选项、6px 进度条与短淡入。付费页在 `/questionnaire` 独立布局，不覆盖原工作台或原免费页面。

### 实际适配差异

1. 修订包的 Q13 规则只给出 instruction，正式 Schema 却要求每条 policy 至少有一个 typed override。独立的 `engine-rules-v1.json` 为情绪权衡指定情境内倾听/认可支持方式；主导权衡沿用用户已选的常态主导档位，不添加新评分，也不改常态维度。触发条件、完整指令和证据保留。
2. `USER_AUTONOMY` 不在正式 affectedTargets 枚举中，按原说明保留于 instruction 与独立硬约束，不伪造新维度。
3. `unsolicitedAdvice` 仅作为逻辑名称与自然语言指令，不写入不存在的画像顶层 `/behaviors`。本次 Mapper 也没有生成该路径的覆盖。
4. Q01/Q22 有些字段没有 field-level required，但正式 Schema 要求其目标字段完整。展示投影明确这些结构字段为必填，并返回统一文本上限；服务端同样校验。自定义文本须通过明确的自定义选项或语气补充输入。
5. 提供的示例画像实测通过当前 Schema 和 `ProfileRules`，但其证据 ID 不是当前数据库记录；没有拿它直接冒充用户画像或持久化依据。真实输出来自答卷，示例校验报告在 `output/paid-verification/provided-sample-validation.json`。

## 前端与缓存

入口：`http://127.0.0.1:5180/questionnaire`。打开时 GET 一次展示配置；切换题目不重新拉配置、也不发送单题答案。页面刷新时重新加载一次配置，再恢复草稿。

26 题、7 模块；覆盖单选、多选、结构化短文本、自定义选项、成组枚举、Q13 成对权衡、语言配置、静态记忆槽位和自由文本。显示题序、整体进度、模块进度、选中状态、校验反馈、回退、跳过、提交前检查、清除草稿确认及成功回执。

草稿键为 `ai-persona:questionnaire-draft:{questionnaireId}:{version}`，保存问卷/版本、当前位置、答案、updatedAt、submissionId、是否尝试提交和页面阶段。每次输入或选择立即保存，文本不等到离开题目才保存。没有认证凭据。存储失败显示提示，允许留在当前页面继续。

提交时完整前置校验、禁用提交按钮，冻结该次实际请求中的答案。网络失败保留草稿和 submissionId；返回查看但未修改内容时仍沿用 ID。若失败后确实修改了答案，则创建新 ID 并明确提示新提交。只有收到匹配 ID 的 `COMPLETED` 回执才清除草稿；回执单独保存在 `ai-persona:questionnaire-receipt:…`，刷新可恢复编号、版本与状态。

成功后「另填一份新答卷」创建新提交，默认生成新画像，绝不覆盖历史；对已有画像追加版本的 API 另外要求 `profileId` 与 `expectedCurrentVersion`。

## API

沿用现有直接 DTO 响应与 `{code,message,errors,timestamp}` 错误格式；开发接口开关和服务端 owner 配置保持原方案。没有客户端可指定的 userId。

| 方法与路径 | 用途 |
| --- | --- |
| `GET /api/v1/questionnaires/paid-deep-persona-questionnaire-v1?version=1.0.1` | 只返回展示字段；不包含 mapping、证据强度或内部评分规则 |
| `POST /api/v1/questionnaire-submissions` | 校验并幂等提交；首次与重试均返回处理回执 |
| `GET /api/v1/questionnaire-submissions/{submissionId}` | 读取当前开发 owner 的回执 |
| `GET /api/v1/profiles/{profileId}` | 读取最新持久化画像 |
| `GET /api/v1/profiles/{profileId}/versions/{version}` | 读取历史快照 |
| `GET /api/v1/profiles/{profileId}/evidence` | 读取当前画像历史证据 DTO；执行归属检查 |

完整合法请求见 `examples/paid-submission.json`；浏览器实填请求见 `examples/paid-browser-submission.json`。每题为有类型的 Answer：`selectedOptionIds`、`text`、`fields`、`selections`、`subAnswers`、`customTexts`、`anchors`、`skipped`，只使用与该题型相符的字段。

```powershell
curl.exe -H "Content-Type: application/json" --data-binary "@docs/examples/paid-submission.json" http://127.0.0.1:8080/api/v1/questionnaire-submissions
```

示例 submissionId 仅用于复现；新的答卷应生成新 UUID，重试同一次答卷保持原 UUID。相同 ID 且内容等价（选项集合不受顺序影响）返回原回执；不同内容返回 409 `SUBMISSION_ID_CONFLICT`。

回执包含 submissionId、profileId、profileVersion、questionnaireVersion、processingStatus、profileStatus、readyForCompilation、clarificationCount、blockers、warnings 和 processedAt。真实响应见 `examples/paid-browser-receipt.json`。候选画像通常是 DRAFT、尚不可编译，这是待确认状态，不是保存失败。

主要错误：400 `UNSUPPORTED_QUESTIONNAIRE_VERSION` / `INVALID_ANSWERS` / `MALFORMED_JSON`；409 `SUBMISSION_ID_CONFLICT` / `VERSION_CONFLICT`；422 `PROFILE_SCHEMA_INVALID` / `PROFILE_RULES_INVALID`；500 `DATABASE_SAVE_FAILED` / `INTERNAL_ERROR`。不返回 SQL、堆栈或密钥。

## Mapper

`AnswerToProfileMapper` 只处理通过 `AnswerValidator` 的答卷，使用服务端配置，前端不提交或决定分数、确认状态、重要性和证据强度。

- LEVEL：按配置加权并四舍五入为 1–5 档。两次测量差达到 2 档时不取平均，保留证据、value=null、CONFLICTED。跳过辅助题保留主测量候选。
- MULTI_SELECT / ENUM：保留对应枚举与集合，不生成跨维度总分。
- 重要性：Q12 选中映射为 CRITICAL 并单独生成证据；未选中使用 MEDIUM 产品默认，不生成用户重要性证据，另标待确认。
- 情境：Q14–Q18 和 Q13 保留触发条件、优先级、覆盖及指令；一条政策与一条硬约束分别生成证据，不合并非法路径。
- 硬约束：Q19 直接选择与配置规定的 Q13 明确边界按规则记录，带 QUESTIONNAIRE 来源、不可由推断覆盖、已确认直接选择证据。Q19 的无禁区项不生成该清单约束，也不将未选禁区反向视为偏好。
- 自由文本：保留完整原文于提交记录；证据含原始片段和 NOT_ANALYZED 标志，新增待分析事项。没有假装做语义提取，也没有据此填维度分数或确认禁区。
- 每个重要映射字段有合法 JSON Pointer 证据。rawExcerpt 上限遵循原表 1000 字符；完整原答案不截断，仍在提交 JSON 中。
- 维度/政策/记忆先为候选状态，强证据也不会自动变成 USER_CONFIRMED。就绪状态由既有 `ProfileRules` 重算，再经 Schema 与业务校验；写库时现有 `ProfileService` 继续检查证据归属、引用与确认来源。

## 数据库与事务

V2 新增 `persona_questionnaire_submission`：主键 submission_id、服务端 owner、问卷和版本、规范化请求 hash、原始答卷 JSON、处理状态、画像 ID/版本、回执 JSON、时间戳；复合外键指向已有快照。V1 不修改、不重建。

一次 `TransactionTemplate` 包含提交行、已有 ProfileService 的画像/不可变快照/证据写入以及回执完成。并发同 ID 由唯一约束协调，失败方在回滚后读取成功回执；证据写入失败则四类数据全部回滚。更新画像仍使用原行锁和预期版本检查，不覆盖旧快照。

## 真实答卷与验证

实际浏览器以 390px 逐题填完 26 题，读取数据库后导出的文件：

- `examples/paid-browser-submission.json`：原始请求。
- `examples/paid-browser-profile.json`：正式 Schema 的完整画像。
- `examples/paid-browser-evidence.json`：39 条真实持久化证据。
- `examples/paid-browser-receipt.json`：处理回执。
- `examples/paid-browser-validation.json`：重新读取后再次执行 Schema 与业务校验。
- `examples/paid-browser-db-verification.json`：SQL 确认 1 次提交、1 个画像版本、39 条证据、迁移 1/2 均已执行。

测试结果：

| 检查 | 实际结果 |
| --- | --- |
| 后端 H2 | 36 项，0 失败、0 错误 |
| 后端真实 MySQL 8.4.11 | 同 36 项，0 失败、0 错误；Flyway V1/V2、JSON 列、外键、事务和并发实跑 |
| Maven package | Spring Boot 可执行 JAR 构建成功 |
| 前端 `npm --prefix frontend test` | 6 组配置/选择限制/草稿/自定义/损坏数据测试通过 |
| 前端生产构建 | vue-tsc 与 Vite 成功，无新增依赖 |
| 浏览器完整流程 | 26 题实填；单/多/文本刷新恢复；逐题 0 次 POST；正常最终 1 次 POST；成功才清草稿；回执刷新恢复 |
| 故障重试 | 模拟断网，再模拟服务器提交成功但响应丢失；3 次尝试同一 ID，最终同一画像，没有重复版本 |
| 交互补充 | 上一题保留、可选跳过、草稿清除确认/取消，320/390/1200px 代表布局通过 |
| 原推广问卷 / Schema / V1 迁移 | Git 无修改 |

浏览器故障测试有两条预期的网络失败控制台记录；正常填写与成功流程无 JavaScript 错误。截图在 `output/playwright/paid-*.png`，已人工检查介绍、多选、身份配置和成功页。

### 复现命令

```powershell
npm --prefix frontend test
npm --prefix frontend run build
mvn -f backend/pom.xml test
mvn -f backend/pom.xml package
```

Java 21 与 Maven 可使用 README 的本机路径；本次使用既有 Maven 缓存离线构建。真实 MySQL 测试的 TEST_DB_URL/USER/PASSWORD、TEST_FLYWAY_ENABLED=true、TEST_SQL_INIT_MODE=never 用法沿用 README，必须指向专用测试库。本次独立测试实例端口 3309，测试库 `persona_paid_test`、预览库 `persona_paid_dev`，没有使用原业务库。

## 尚未实现与原因

- 正式认证、付费授权和用户归属接入：仍沿用开发开关与服务端 owner，不接受客户端 userId；不是可直接公开的多租户服务。
- 澄清轮次、画像确认 UI 与最终提示词编译：本次范围仅生成/持久化候选；追问题库已加载并留存，尚未执行后续确认流程。
- 自由文本语义解析、大模型和 Agent/RAG：按要求不实现，只保留原文和待分析事项。
- 支付、兑换码：未添加。
- 真实 iOS/Android、公开部署与生产数据库验收：未进行；本次为 Edge 与本机隔离 MySQL。
- Flyway 现有版本提示 MySQL 8.4 超出其已测试支持范围。本次真实迁移及回归已通过，但生产升级前仍需核对该依赖的支持矩阵；未擅自升级仓库依赖。

## 文件清单

完整列表见 `paid-questionnaire-files.txt`。新增集中在 `backend/.../questionnaire/`、一张提交表及 Mapper、`frontend/src/questionnaire/`、API、独立 Vue 页、测试与配置资料。原 ProfileService/Controller 只增加有归属检查的历史与证据读取，错误处理增加数据库错误码。
