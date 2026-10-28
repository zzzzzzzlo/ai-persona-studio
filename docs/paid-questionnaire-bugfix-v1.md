# 付费问卷 V1 五项局部修正与验证

日期：2026-10-28。基于 `a541a26`，保留 Vue 3 / Spring Boot / MyBatis-Plus 工程与当前浅粉视觉；没有重建、重构或重新设计问卷。

## 修改文件

源码与服务端配置：

- `backend/src/main/java/cn/aipersona/questionnaire/QuestionnaireConfiguration.java`
- `backend/src/main/java/cn/aipersona/questionnaire/AnswerToProfileMapper.java`
- `backend/src/main/java/cn/aipersona/questionnaire/QuestionnaireDtos.java`
- `backend/src/main/java/cn/aipersona/questionnaire/QuestionnaireSubmissionService.java`
- `backend/src/main/resources/questionnaire/engine-rules-v1.json`
- `frontend/src/questionnaire/model.ts`
- `frontend/src/views/QuestionnaireView.vue`

测试：

- `backend/src/test/java/cn/aipersona/questionnaire/QuestionnaireIntegrationTest.java`
- `frontend/tools/test-questionnaire.mjs`
- `frontend/tools/paid-browser-qa.js`

文档：本报告；`paid-questionnaire-implementation-v1.md` 增加后续修正索引。测试日志与截图保存在仓库忽略的 `output/` 下。

## 五项修正

| 问题与根因 | 修正方式及原因 | 数据影响 |
| --- | --- | --- |
| Q22 的 option 只有 `value`，展示投影丢弃它，模板也没有回退 | 实际旧 GET 确认 8 个 toneTags 只剩 ID。展示白名单加入 `value`，Option 增加可选 `value`；所有选项统一 `optionText(label → text → value → id)`。仍不返回内部 mapping。API 和浏览器均断言实际文案与原配置一致 | 仅补充展示字段；8 个 ID、语义和 tone 映射不变 |
| Q16 直接选择被统一当作提取候选 | `engine-rules-v1.json` 新增 `policyConfirmation`：默认 `EXTRACTED_PROVISIONAL`，仅 Q16 声明 `DIRECT_USER_CONFIRMED`。Mapper 据此输出 `USER_CONFIRMED` policy、`CONFIRMED` evidence，source 保持 `QUESTIONNAIRE`。启动时校验策略枚举和题号；不解析自然语言，不在 Java 判断 Q16 | 沿用现有状态枚举。其他 policy、加权维度、记忆候选不自动确认；不改历史快照 |
| Q03 D 的边界只在一段自然语言设定中，缺少可执行交叉检查 | 新增 `boundaryCrossChecks`，由选择条件驱动，向 coreSettings 明确保留不限制现实社交、不逼问现实行踪、尊重身体边界三条规则及直接用户证据；追加非阻断 OPEN unresolved，询问吃醋表达何时停止/降温。Q19 无固定禁区与明确隐私边界均合法 | 使用既有 coreSettings、unresolvedItems、conflicts 和 evidence；不新增画像字段 |
| 回执把所有 readiness 提示称作 clarification | 新增 `pendingItemCount = blockers.length + warnings.length`；保留 `clarificationCount`，仅计 OPEN unresolvedItems 与 OPEN conflicts。成功页显示 pending。旧数据库回执按其原版本快照计算，不读取最新版本冒充旧版，也不写回历史 JSON；旧浏览器缓存按 blockers/warnings 回退 | API 加法扩展，clarificationCount 的含义修正；无需迁移或重填答卷 |
| 可选题校验通过即计为填写 | 新增 `answerState`，统一四态与 review 标签。只有明确 `skipped=true` 才是跳过；有真实输入且校验通过才是填写；空可选题为未填写；缺失必答或不合法输入为待修正。进度只统计 ANSWERED + SKIPPED，文案为“已处理” | 前端状态推导变化；草稿键、格式和服务端答卷契约不变 |

### Q03 冲突处理的实际范围

正式 V1 当前没有明确要求强制汇报行踪或剥夺社交自由的结构化选项，因此生产配置 `conflictingSelections` 保持空数组，不把高主导、吃醋强度或未勾选禁令推断成越界意愿。

引擎支持显式选择信号：questionId、可选 subQuestionId、optionId、boundaryIndex、targetPath、description。若将来配置确有矛盾选项，则生成 OPEN conflict，精确指向边界与对立输出，保留双方设定与来源，不平均或覆盖。测试使用独立配置加入明确“强制汇报现实行踪”的虚构测试选项，验证该路径；正式问卷没有增加此选项。

自由文本仍按原流程保存原文、NOT_ANALYZED 证据及待处理项；没有自然语言矛盾识别器，也没有实现后续澄清问答页面。

## 兼容性

| 契约/资产 | 结果 |
| --- | --- |
| 正式画像 Schema、dimension-catalog.json、schemaVersion | 未修改，仍为 1.0.0 / 1–5 档 |
| ProfileDocument、ProfileRules 和模型推断保护 | 未修改；新增测试证明不能伪造确认 |
| Flyway V1、V2、数据库表 | 未修改；无新增迁移，现有库启动仍为版本 2 |
| paid-questionnaire-v1.json、paid-scoring-mapping-v1.json | 未修改题目、ID、原始评分、权重或映射 |
| 原推广问卷及付费页面 CSS | 未修改 |
| API 路径/提交字段 | 无删除或更名；展示新增 value，回执新增 pendingItemCount，clarificationCount 保留并纠正含义。将旧字段当总数的外部消费者需改用 pendingItemCount |
| 已有答卷/画像 | 不重算、不自动确认、不改历史快照；同 submissionId 仍返回原画像版本；旧回执仅在读取时规范化计数 |
| Redis、LLM、Prompt compiler、支付、账号系统 | 未引入 |

## 实际验证

| 命令/流程 | 结果 |
| --- | --- |
| `npm --prefix frontend test` | 11 组全部通过；保留原 6 组，增加显示文案、四态、进度和旧回执缓存覆盖 |
| `npm --prefix frontend run build` | vue-tsc / Vite 成功 |
| `mvn -f backend/pom.xml test`，H2 | 42 项，0 失败、0 错误、0 跳过 |
| 同一套测试，MySQL 8.4.11 | 42 项，0 失败、0 错误、0 跳过；专用 persona_paid_test，Flyway V1/V2 校验通过 |
| Spring Boot package | 构建成功，可启动连接既有 persona_paid_dev |
| 26 题真实浏览器完整流程，390px | 通过：8 个 toneTags 的 innerText 与原 value 相等、均可见，选择后持久化 tone 正确；单/多/文本草稿刷新恢复；Q20/Q24 未填写、Q18 已跳过、其他已填写；还验证缺失必答为待修正且不能提交 |
| 进度 | 空锚点不计进度，填写后 +1，清空后 -1；完整 review 中 24/26 已处理，不将两道未填可选题计入 |
| 请求与重试 | 逐题 0 次 POST，正常双击最终按钮仅 1 次 POST；断网、服务端提交成功但响应丢失、再重试共 3 次，ID 不变且仍为同一画像版本 |
| 画像与证据 | 重新通过正式 Schema / 业务校验；37 条持久化证据路径和引用合法；Q16 为用户确认且引用非模型已确认依据；Q03 D 三条边界保留 |
| 原有交互/布局回归 | 返回保留答案、可选跳过、清除确认/取消通过；320/390/1200px 无水平溢出；检查了标签与 review 截图 |

已知答卷计数断言：`docs/examples/paid-submission.json` 的新提交为 pending=21（14 blockers + 7 warnings）、clarification=7；移除记忆锚点的下一版本 pending=20，旧版本回执仍是 21/7。另有完整浏览器答卷 pending=20、clarification=8，UI 显示“待处理事项 20 项”，不将其称作 20 道追问。

日志：`output/bugfix-h2-tests.log`、`bugfix-mysql-tests.log`、`bugfix-browser-result.json`、`bugfix-interaction-cli.log`。关键截图：`output/playwright/paid-tone-tags.png`、`paid-review-states.png`、`paid-success.png`。正常流程没有 JavaScript 错误；断网测试预期产生两条网络失败控制台记录。

MySQL 初次运行暴露的是新增测试对 JSON 空白格式的错误假设：已改为保存数据库实际写入的原字符串，再断言兼容读取不会改写它；没有删除断言或放宽数据校验。

## 尚需验证/未实现

- 未在真实 iPhone Safari、小红书容器或线上环境实测；本次为本地 Edge 的手机宽度与桌面验证。
- 后续澄清队列调度/问答 UI 和自由文本语义冲突识别仍不在 V1 范围；当前输出真实 OPEN 条目，不声称已自动完成澄清。
- 旧画像保持不可变；若用户希望旧答卷采用新 Q16 确认规则，应显式产生新版本，不在读取时偷偷改动状态。
