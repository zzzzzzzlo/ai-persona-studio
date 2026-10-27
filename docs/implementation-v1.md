# AI 人格定制 V1.0 实施与验收

验收日期：2026-10-27（Asia/Shanghai）。代码在当前 `E:\ai人格测试产品` 中实际创建并运行；没有上传网站、调用大模型、创建账号或处理支付。

本文记录 V1 首次交付的实施与验证。后续已创建 GitHub 公开仓库，并按开发范围将旧推广问卷完整移动到 `推广问卷/`；下文提及的原根目录 package.json、src、tests 和问卷发布文件，现均位于该归档目录。当前结构以 README 和 architecture.md 为准。

目录整理验收：201 个问卷文件搬移前后 SHA256 一致，52 个当前前后端文件未改动；归档内 19 组测试、浅蓝/浅粉目录与 ZIP 静态校验通过，5 个 HTML 入口的 114 条本地资源引用均有效。当前前端重新生产构建通过，运行中的前端 HTTP 200、后端草稿校验通过。问卷旧截图和调试产物随归档保留在其 output/，仍不提交到 Git。

## 1. 检查结论与保留范围

起始目录为 V2 离线 HTML/JavaScript/Canvas 问卷，根 package.json 不需要安装依赖；没有后端、Vue 项目或 Git 元数据。本次新增 frontend/backend 模块并初始化单一 Git 仓库，未提交、未配置远程。原有问卷代码与发布资产不迁移、不覆盖。

Node.js 24.15.0、pnpm 11.25.0 可用；通过完整路径复用本机 Java 21.0.12.1、Maven 3.9.16 和 MySQL 8.4.11，未修改系统 PATH，未重新安装工具。Docker 未安装。Maven 使用既有 D:\Codex\software 下的缓存。pnpm 11 使用 workspace 配置、项目内 store 和 hoisted 布局，解决 Windows 符号链接权限限制。

## 2. 交付能力

画像 JSON 的 11 个顶层字段：schemaVersion、targetPersona、dimensions、contextualPolicies、narrativeConfig、linguisticConfig、memoryAnchors、hardConstraints、unresolvedItems、conflicts、readiness。

七维中五项为 1–5 工程等级，一项情感支持为多选，一项适应策略为枚举。偏好值、重要性、证据强度独立。UNKNOWN/NEEDS_CLARIFICATION/CONFLICTED/USER_SKIPPED 强制 null，不使用中性默认值。情境规则支持类型受限的跨维度和行为覆盖。模型不能自动覆盖已确认偏好与硬约束，保护由 Java 实际执行。

MySQL 为三张 InnoDB/utf8mb4 表：persona_profile 元数据、persona_profile_version 不可变版本快照、persona_profile_evidence 最小化证据。Flyway V1 创建表、唯一键、外键与 CHECK。更新锁定画像行、检查 expectedCurrentVersion，再将版本推进、快照和证据写入同一事务。独立 ready 列来自已校验 JSON，并由数据库约束再次检查。

已实现四个接口：POST /api/v1/profiles、GET /api/v1/profiles/{profileId}、POST /api/v1/profiles/{profileId}/versions、POST /api/v1/profiles/validate。创建和新版本返回 201，字段失败 400，版本过期 409；响应不暴露 Entity。owner 来自服务端开发配置，默认只监听回环地址且画像接口默认关闭。

前端具备基础布局、Router、Axios 拦截器、环境变量、全局错误、404 页面、Tailwind 和源码式 shadcn-vue Button。开发模式有 JSON 校验页，普通生产构建默认不包含该路由；没有实现正式问卷或角色编辑器。

## 3. 实际测试结果

| 验证 | 结果与范围 |
| --- | --- |
| 后端编译与 H2 测试 | 25 项全部通过：14 个 Schema/规则测试、10 个 HTTP/持久化集成测试、1 个开发开关测试 |
| 真实 MySQL 测试 | 同一 25 项全部通过；专用 persona_v1_test，启用真实 Flyway，禁用 H2 初始化脚本 |
| 数据库迁移 | 在 persona_v1_test 和 persona_v1_dev 空库各自动执行 V1；后续启动验证 checksum，迁移不重复执行 |
| 持久化和历史 | 创建后重新读取画像；第 2 版存在且第 1 版内容未变；允许引用同画像旧证据 |
| 并发与回滚 | 两个线程以相同预期版本提交，恰好一个成功、一个 VERSION_CONFLICT；证据唯一键失败使元数据与快照一起回滚 |
| 非法写入 | 无效等级、未知状态非空值、缺字段、伪造就绪、缺失证据、模型删边界、模型伪造用户跳过等被拒绝 |
| 最终 JAR | package 成功，java -jar 独立启动并连接真实开发库 |
| 真实 HTTP | 9 项通过，包含合法草稿、非法字段路径、创建、读取、第二版、409、推断保护、失败后版本不变、OpenAPI；输出 output/persona-api-smoke.json |
| 前端安装 | pnpm install 与 pnpm install --frozen-lockfile 成功 |
| 生产构建 | vue-tsc + Vite 成功；生成 frontend/dist，普通构建不包含开发工具路由 |
| 浏览器 | 10 项检查通过：桌面布局、导航、真实 API 草稿校验、语法错误、字段路径、重置、断网恢复、390px 无横向溢出、深路由刷新、无未捕获 JS 错误 |
| 原问卷回归 | npm test：19 组通过，含 10,000 组抽样 |
| 资产保护 | 对施工前记录的 179 个原有源文件、问卷与发布文件逐项比较 SHA256：0 个变化 |
| Docker Compose | 已提供配置；本机无 Docker，未执行容器运行验收；原生 MySQL 验证不冒充容器验收 |

H2 不具备生产迁移中的全部 MySQL JSON/CHECK 特性，所以本次额外运行了真实 MySQL。测试数据库没有使用机器已有业务库或修改已有 MySQL 服务；临时实例只监听 127.0.0.1:13308，数据目录在 output/mysql-v1-data，被 Git 忽略。

Flyway 11.7.2（Spring Boot 管理版本）对 MySQL 8.4 打印“超过已测试版本”的提示，本次 V1 迁移、checksum 检查和完整持久化测试均实际通过；不能据此推断所有 MySQL 版本/迁移操作都经过验证。后续升级依赖时应保留真实 MySQL 回归。

复现命令见 README。单独跑 HTTP 验收：`python backend/tools/smoke-api.py http://127.0.0.1:8080`，它只应连接启用开发接口的本地实例，会新增一份虚构画像。浏览器验收脚本为 frontend/tools/browser-qa.js，供现有 Playwright CLI 的 `run-code --filename` 使用，默认前端端口 5180。

截图：output/playwright/persona-home-desktop.png、persona-validation-desktop.png、persona-invalid-desktop.png、persona-validation-mobile.png。最终验收日志为 output/backend-h2-verification.log 和 output/backend-mysql-verification.log，后者同时包含最终 JAR 打包结果。早期曾遇到运行中 JAR 被 Windows 锁定导致 repackage 失败，停止旧进程后已解决。

## 4. 尚未实现与下一阶段

按照本阶段边界，未实现真实模型、自由文本提取、冲突自动识别、画像融合、追问、人格编译、质量检测、RAG/Agent、Redis、账号权限、支付和正式业务前端。静态锚点不承诺跨会话记忆，情境规则不表示本站能够监控外部聊天。

后续模型提取复用 ProfileDocument、EvidenceInput、ProfileSchemaValidator、ProfileRules，以及 ProfileService.validate/create/addVersion 和现有 validate/versions 接口。模型只输出候选 JSON，由可信服务端赋予 MODEL_INFERENCE 来源并校验，用户确认后再写确认状态；不允许模型执行 SQL。默认的 origin 客户端选项和开发 owner 都必须在正式认证接入时替换。

V1 readiness 只证明结构、确认状态和显式缺失/冲突条件满足；不证明自然语言规则语义无冲突，也不代表编译器已经实现。敏感文本保留、删除、审计、正式 API 防护仍是上线前工作。

## 5. 文件清单

本节后附实际新建/修改的工程文件清单。根 README.md 和 .gitignore 更新；原 package.json、src、tests、问卷 HTML 和发布资产保持原样。node_modules、编译产物、缓存、数据库数据及 Git 内部文件不计入源码清单。

共 63 个工程源码、配置及文档文件：

```text
.env.example
.gitignore
README.md
backend/pom.xml
backend/src/main/java/cn/aipersona/PersonaApplication.java
backend/src/main/java/cn/aipersona/common/ApiExceptionHandler.java
backend/src/main/java/cn/aipersona/profile/api/ProfileController.java
backend/src/main/java/cn/aipersona/profile/api/ProfileDtos.java
backend/src/main/java/cn/aipersona/profile/application/ProfileService.java
backend/src/main/java/cn/aipersona/profile/domain/ProfileDocument.java
backend/src/main/java/cn/aipersona/profile/domain/ProfileException.java
backend/src/main/java/cn/aipersona/profile/persistence/ProfileEntity.java
backend/src/main/java/cn/aipersona/profile/persistence/ProfileEvidenceEntity.java
backend/src/main/java/cn/aipersona/profile/persistence/ProfileEvidenceMapper.java
backend/src/main/java/cn/aipersona/profile/persistence/ProfileMapper.java
backend/src/main/java/cn/aipersona/profile/persistence/ProfileVersionEntity.java
backend/src/main/java/cn/aipersona/profile/persistence/ProfileVersionMapper.java
backend/src/main/java/cn/aipersona/profile/validation/ProfileRules.java
backend/src/main/java/cn/aipersona/profile/validation/ProfileSchemaValidator.java
backend/src/main/resources/application.yml
backend/src/main/resources/db/migration/V1__create_profile_tables.sql
backend/src/main/resources/schema/dimension-catalog.json
backend/src/main/resources/schema/user-preference-profile.schema.json
backend/src/test/java/cn/aipersona/profile/DevelopmentGateTest.java
backend/src/test/java/cn/aipersona/profile/ProfileIntegrationTest.java
backend/src/test/java/cn/aipersona/profile/ProfileSchemaTest.java
backend/src/test/resources/application-test.yml
backend/src/test/resources/h2-schema.sql
backend/tools/generate-schema.py
backend/tools/smoke-api.py
compose.yaml
docs/api.md
docs/architecture.md
docs/examples/create-profile.json
docs/examples/profile-draft.json
docs/examples/profile-ready.json
docs/implementation-v1.md
docs/profile-schema.md
frontend/.env.example
frontend/.npmrc
frontend/components.json
frontend/index.html
frontend/package.json
frontend/pnpm-lock.yaml
frontend/pnpm-workspace.yaml
frontend/public/favicon.svg
frontend/src/App.vue
frontend/src/api/client.ts
frontend/src/api/profiles.ts
frontend/src/components/ui/button/Button.vue
frontend/src/components/ui/button/index.ts
frontend/src/examples/profile-draft.json
frontend/src/lib/errors.ts
frontend/src/lib/utils.ts
frontend/src/main.ts
frontend/src/router/index.ts
frontend/src/style.css
frontend/src/views/HomeView.vue
frontend/src/views/NotFoundView.vue
frontend/src/views/ValidateView.vue
frontend/tools/browser-qa.js
frontend/tsconfig.json
frontend/vite.config.ts
```
