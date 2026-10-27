# AI 人格定制 V1 架构

## 模块边界

本仓库采用模块化单体：`frontend/` 为 Vue 3 开发工作台，`backend/` 为独立 Spring Boot 应用，MySQL 为唯一业务数据库。原根目录的离线问卷、`src/`、`tests/` 和发布包保留，暂不直接转换成新画像。原娱乐测试分数不等于用户确认的偏好，后续应逐题定义可审查的适配规则。

后端的 `profile` 模块按实际请求顺序组织：

1. `api/ProfileController` 接收明确的请求 DTO；Jakarta Validation 检查请求外壳和证据字段。
2. `application/ProfileService.validate` 调用 `validation/ProfileSchemaValidator` 检查 Draft 2020-12，再调用 `ProfileRules` 检查就绪条件、ID、目标路径及硬约束规则。
3. 写入时检查证据归属、状态、目标覆盖范围，以及模型更新保护。
4. `persistence/` 中的 MyBatis-Plus Mapper 写入三张表。Entity 不出现在 API 响应中；JSON 列映射为字符串，Jackson 负责与 `domain/ProfileDocument` 转换。
5. `common/ApiExceptionHandler` 返回统一错误；400 表示输入失败，409 表示版本或数据冲突。

没有 JPA、Redis、Spring AI、向量库、Agent、支付或账号依赖。

## 数据流和外部软件边界

问卷 / 自由文本 / 追问 → 候选画像 → Java 校验 → 用户确认 / 新版本事务 → JSON 快照 + 证据。

后续编译器只消费有效快照和需要的证据，输出完整、自包含的自然语言提示词。外部聊天软件不会访问本站 MySQL。情境规则是提示词内的行为指令；本站没有后台监控用户情绪或联系用户的机制。静态记忆锚点只是提示词内容，不能保证外部软件跨会话记忆。

## 三表混合存储

| 表 | 职责与约束 |
| --- | --- |
| `persona_profile` | 自增主键、唯一 UUID 业务 ID、所属用户、当前版本、DRAFT/READY、时间；按 owner 建索引 |
| `persona_profile_version` | 每个版本的完整 JSON、结构版本、ready 标记、原因、时间；`(profile_id,version_number)` 唯一并外键关联画像 |
| `persona_profile_evidence` | 唯一证据 ID、画像与版本、来源/题号/字段路径、可选原文片段、JSON 值、状态；复合外键关联版本 |

维度、情境规则、边界、缺失项和冲突均保存在快照中。SQL 结构版本由 Flyway 管理；内容结构版本为 `schemaVersion=1.0.0`，两者独立。

创建画像在一个事务内插入元数据、版本 1、证据。更新在一个事务内按所属用户 `SELECT ... FOR UPDATE` 锁定元数据，比较 `expectedCurrentVersion`，读取旧快照并应用模型保护，再以条件 UPDATE 推进版本、INSERT 新快照和必要证据。失败全部回滚。锁与条件更新、版本唯一键共同防止覆盖；历史快照只通过新增版本演进，服务没有修改历史内容的操作。

GET 先读取元数据及其版本号，再按该版本取快照，因此并发更新时依旧返回一对一致的元数据和快照。ready 列直接取自经规则校验后的 JSON；MySQL CHECK 再检查其与 JSON 布尔值一致，并校验 schema_version。H2 使用简化测试表，不能代替 MySQL 迁移验收。

## 后端执行的模型保护

请求 `origin=MODEL_INFERENCE` 时，模型不能创建或修改为 `USER_CONFIRMED`，不能修改、删去已有用户确认维度、规则、锚点或边界；不能修改任何 `immutableByInference=true` 的硬约束，即使尝试删除该条目、更换 ID 或关闭保护标记也会失败。V1 模型更新还不能自动改变现存角色、叙事和语言设定。模型来源证据不能标为用户确认，也不能伪装为问卷或用户编辑。

模型也不能伪造或自动改变 USER_SKIPPED，以免通过替用户跳过缺失项绕开就绪检查。这是保守的候选检查，不是自动融合算法。明确的用户编辑可产生新版本修改边界；模型修改建议应保存为候选，待用户确认再以用户操作提交。后续接入时必须由后端可信调用路径设定 origin；禁止让模型或正式客户端自行宣称 USER。

## 开发身份和部署边界

V1 没有真实账号系统。owner 由服务端 `DEV_OWNER_ID` 设置，不接收客户端 owner 字段，GET 和更新都按 owner 过滤。所有画像路由默认关闭，仅 `DEV_API_ENABLED=true` 时注册，服务默认只监听 `127.0.0.1`。Swagger 同样按开发开关开启。

这只适用于本地开发。正式开放前必须接入认证身份、资源授权、限流、请求大小和审计策略，移除开发身份及客户端可选的 origin。默认关闭接口并不代表已经实现正式权限系统。

## 证据最小化

`rawExcerpt` 可空，最多 1000 字，只保存支撑特定结论的必要片段，不默认收集全部聊天。`sourceRef` 保存业务题号或追问 ID，不存密钥或完整请求日志。证据绑定首次形成的版本，后续版本可以引用同一画像已有的有效证据；证据全局 ID 不可覆盖。新证据随快照同事务写入。

结构校验不读取数据库；写入时再检查所有 evidenceRefs 属于本画像、未被拒绝且覆盖目标字段。用户确认的条目必须有至少一条已确认、非模型的证据。根指针 `""` 只应用于整份问卷确认或整份用户编辑；字段证据应尽量使用具体 JSON Pointer。

上线前仍需定义用户可见的保留期限、敏感字段脱敏、导出与删除机制。V1 不实现自动清理、账号注销、证据状态修改接口或隐私合规承诺。

## 下一阶段的复用点

自由文本提取器输出候选 `ProfileDocument` 与 `EvidenceInput`，标注 `MODEL_INFERENCE`、`PROVISIONAL`、字段路径和最小片段。调用 `ProfileSchemaValidator`、`ProfileRules` 和 `ProfileService.validate` 做确定性检查，通过后使用 `ProfileService.addVersion` 的锁和事务保存；在用户确认前不得改为 USER_CONFIRMED。外部开发联调可先调用 `/api/v1/profiles/validate`，证据归属仍须在写入时检查。

画像 DTO、目录和 Schema 是稳定边界。候选差异展示、冲突识别、追问、合并、提示词编译与质量检测为后续独立应用服务；模型不得获得 Mapper、SQL 执行接口或数据库凭证。
