# AI心动人格测试

## AI 人格定制工程 V1.0（新增）

当前仓库同时保留原离线问卷与新增的 Vue + Spring Boot 模块。问卷、两主题发布包和原构建脚本沿用原结构；新版工程不把娱乐测试分数直接当成用户确认的画像。

新增内容：版本化用户偏好画像、Draft 2020-12 校验、证据引用、MySQL 三表持久化、并发版本检查与开发 JSON 校验页面。最终商品计划是可复制到外部软件的自包含人格提示词；当前没有大模型调用、人格生成、支付或正式账号系统。

| 路径 | 用途 |
| --- | --- |
| `frontend/` | Vue 3 + TypeScript + Vite + Router + Axios + Tailwind 4 + shadcn-vue Button 开发骨架 |
| `backend/` | Java 21、Spring Boot 3.5.16、Maven、MyBatis-Plus 3.5.17、Flyway、Jackson、Validation、springdoc 2.8.17、networknt 1.5.6 |
| `docs/profile-schema.md` | 画像正式规则、状态、等级锚点与示例说明 |
| `docs/architecture.md` / `docs/api.md` | 事务、身份边界、证据最小化、接口与错误格式 |
| `docs/implementation-v1.md` | 本次文件清单、验收结果与后续复用点 |

### 启动新版工程

需要 Java 21、Maven 3.6.3+、Node.js 22.12+（本次使用 24）、pnpm 11.25.0，以及 MySQL 8.0.16+（本次使用 8.4.11）。版本兼容参考 [Spring Boot](https://docs.spring.io/spring-boot/3.5/system-requirements.html)、[MyBatis-Plus](https://baomidou.com/en/getting-started/install/)、[springdoc](https://springdoc.org/)、[networknt 1.5.6](https://github.com/networknt/json-schema-validator/tree/1.5.6)、[shadcn-vue Vite](https://www.shadcn-vue.com/docs/installation/vite)。前端依赖精确解析在 `frontend/pnpm-lock.yaml`；shadcn-vue 为组件源码方式，配置见 `components.json`。

在项目根目录启动数据库：

```powershell
Copy-Item .env.example .env
# 先修改 .env 中的本地密码；Docker 未安装时也可以使用已有 MySQL 创建同名数据库和账号。
docker compose up -d mysql
```

Docker Compose 读取根 `.env`，Spring Boot 不会自动读取它。在后端终端明确设置同一组数据库参数：

```powershell
$env:DB_URL='jdbc:mysql://127.0.0.1:3308/persona_dev?connectionTimeZone=UTC&characterEncoding=UTF-8'
$env:DB_USER='persona_dev'
$env:DB_PASSWORD='local-dev-change-me' # 与 .env 的 MYSQL_PASSWORD 保持一致
$env:DEV_OWNER_ID='dev-user-local'
$env:DEV_API_ENABLED='true'
mvn -f backend/pom.xml spring-boot:run
```

启动时 Flyway 自动迁移；服务默认只监听 `127.0.0.1:8080`。Swagger：`http://127.0.0.1:8080/swagger-ui/index.html`。开发接口默认关闭，需上述开关才注册。owner 暂由服务端配置，不能信任客户端用户 ID；此开关不能代替正式认证与权限控制。

另开前端终端：

```powershell
Set-Location frontend
pnpm install --frozen-lockfile
pnpm dev
```

访问 `http://127.0.0.1:5180`，开发校验页为 `/dev/validate`。Vite 将 `/api` 代理到后端 8080；非默认端口可在启动前设置 `$env:API_PROXY_TARGET='http://127.0.0.1:其他端口'`。前端环境模板见 `frontend/.env.example`，可复制为 `.env.local`。

```powershell
# 普通生产构建默认不含开发校验路由；显式构建开发预览时设置 VITE_ENABLE_DEV_TOOLS=true。
pnpm build
pnpm preview
```

生产静态服务需要配置 SPA history 回退，以及 `/api` 的反向代理；Vite preview 不代理后端。生产认证、部署和外部网站发布不在本次范围内。

### 编译与测试

在根目录执行；前后端可独立构建：

```powershell
mvn -f backend/pom.xml test       # 无需数据库，H2 快速集成测试 + Schema 单元测试
mvn -f backend/pom.xml package    # 生成 backend/target/persona-backend-1.0.0-SNAPSHOT.jar
pnpm --dir frontend build        # TypeScript 检查与生产构建
npm test                        # 原离线问卷回归测试
python backend/tools/generate-schema.py  # 修改模型生成源后再运行
```

独立运行后端 JAR（沿用前述数据库环境变量）：

```powershell
java -jar backend/target/persona-backend-1.0.0-SNAPSHOT.jar
```

真实 MySQL 测试必须指向**专用测试库**，测试会新增画像与证据，不应使用业务库：

```powershell
$env:TEST_DB_URL='jdbc:mysql://127.0.0.1:3308/persona_test?connectionTimeZone=UTC&characterEncoding=UTF-8'
$env:TEST_DB_USER='persona_test'
$env:TEST_DB_PASSWORD='测试库密码'
$env:TEST_FLYWAY_ENABLED='true'
$env:TEST_SQL_INIT_MODE='never'
mvn -f backend/pom.xml test
# 测试后在该终端清除 TEST_*，普通测试才能回到 H2 默认配置。
```

先手动为测试账号创建对应数据库并授权；Flyway 只建表。H2 表结构仅用于快速事务测试；真实 JSON 列、CHECK、字符集与迁移以 MySQL 验证为准。本次真实环境验收记录见 `docs/implementation-v1.md`。

### 本机已发现的工具（不修改系统 PATH）

本次环境 Java/Maven/MySQL 未在 PATH 中完整暴露，实际使用 `D:\Codex\software\jdk-21.0.12.1+1`、`D:\Codex\software\apache-maven-3.9.16`、`D:\Codex\software\mysql-8.4.11-winx64`。可在当前终端设置 JAVA_HOME 并用完整路径运行 Maven；这些路径仅是本机示例，项目不依赖它们。依赖缓存使用既有 `D:\Codex\software\maven-repository`。

---

以下为原离线问卷 V2 的使用说明。

V2「AI 人格定制前置测试」，纯离线 HTML / CSS / ES2017 JavaScript / Canvas 2D。沿用原架构和浅蓝 / 浅粉视觉；18 道题分别生成七维人格原型与独立的四维 AI 配置档案。升级说明、修改文件和已知问题见 `docs/v2-upgrade.md`。

## 本地运行

在电脑浏览器中直接打开项目根目录或 `dist/index.html`，即可离线使用。手机的系统文件预览不保证执行脚本；iPhone 请参阅 `release/mobile-preview/手机打开说明.md`，使用支持 JavaScript 的本地 HTML 查看器导入单文件离线预览。该单文件不是小红书上传产物。调试建议在本目录运行：

```powershell
npm run dev
```

打开 <http://127.0.0.1:5173/>。测试控制台：<http://127.0.0.1:5173/?debug=1>。本地预览服务只提供静态文件，产品本身不发起任何接口请求。

浅蓝版保留在 `index.html` / `dist/index.html`；浅粉版在 `pink.html` / `dist-pink/index.html`，电脑预览为 <http://127.0.0.1:5173/pink.html>。两版共享所有题目、布局和业务代码；浅粉版采用柔粉按钮、近白粉选项、暖灰正文及同形粉色图标，Canvas 使用对应主题；两版均移除结果页“发到小红书”按钮。

手机独立离线文件分别是 `release/mobile-preview/AI心动人格测试-浅蓝版.html` 与 `AI心动人格测试-浅粉版.html`。旧名 `AI心动人格测试-手机离线预览.html` 继续指向浅蓝版。`npm run build` 同时生成两个发布包、电脑入口和两份手机文件，不会覆盖浅蓝设计。

```powershell
npm test       # 评分、匹配、恢复、缓存、桥接测试；无依赖
npm run build # 生成 dist、执行静态校验及官方审计、输出 ZIP
npm run audit # 再次检查 dist
```

需要 Node.js 与 Python 3；开发和构建都不需要 npm install。浏览器 QA 使用开发时单独运行的 Playwright CLI，不随小工具发布。

## 上传产物

`release/ai-heart-personality-v2.0.0.zip` 是浅蓝版 Builder Hub 待上传包。根目录包含唯一的 `index.html`，总计 29 个运行时文件；不带文档、测试、依赖、源映射或开发工具。`release/manifest.json` 记录准确体积及 SHA256。

浅粉发布包为 `release/pink/ai-heart-personality-pink-v2.0.0.zip`，增加主题样式和对应图标，共 31 个文件；对应审计与校验和保存在 `release/pink/`。上传时选择其中一版，每个 ZIP 仍只有一个 `index.html`。V1 源码和交付文件保存在 `release/archive/v1-20261008/`。

项目源码留在当前工作区。按全局文件交付偏好，另将最终 ZIP 和验收说明复制到 `E:\Codex\files\AI心动人格测试`。

上传前使用 Builder Hub 上传页的当前规范口令复核。将同一 ZIP 先在创服平台模拟器完整验证，再分别用 Android 和 iOS 真机扫码验证；当前环境未登录、上传或进行真机验收。

## 已实现

- 2026-10-08 视觉改版：浅蓝灰底、白色圆角答题卡、黑体标题、轻粉标记；首页与品牌等使用统一的心形对话框图标。
- 单题流程，18 道 V2 题目，选择反馈 200ms 自动跳题，左上返回修改；Q14 后展示性格轮廓过渡页。
- 三段阶段提示；Q15—Q18 配置记忆、成长、情景和生活感，附加分与人格七维独立。
- 约 1.9 秒解析仪式、七维驱动的预测洞察、完整结果揭晓。
- 加权均方根距离匹配，双核心 / 隐藏副型 / 单人格三种判断。
- 8 种洞察版、4 种指标版，指标由实际维度确定并舍入到 5%，不参与分类。
- 动态 AI 配置档案、定制按钮点击提示；Canvas 1080 × 1440 人格卡保留主副型标记并补充四项配置标签。
- 小红书临时文件和相册保存；结果页提供保存、预览与重测操作。
- 普通浏览器缺少 SDK 时展示结果图，用户可长按、图片另存为或截图；包内没有被禁用的下载链接、剪贴板或系统分享 API。
- `?debug=1` 显示七维、完整距离排序、P1/P2/margin/判断及 12 原型预览，另有四维 AI 配置输入。预览不覆盖正式答题记录。

## 本地存储

依照 2026-09-22 在线官方文档，在满足客户端版本 9.46.0 且方法存在时优先使用 Storage JS API；普通浏览器、低版本或版本未知时使用 localStorage。升级至原生存储时，将旧 localStorage 记录迁移，成功后删除旧副本。

所有答案和结果都保存在用户设备上。写入串行处理，重测时等待已排队写入再删除本工具的记录。缓存损坏、不可读、写入被拒绝时可继续测试，页面明确提示进度未保存。恢复结果重新计算，避免信任缓存中的旧分数。

V2 使用独立存储键 `ai-heart-personality-v2`。V1 的题目和选项语义已变化，旧 15 题答案不直接迁入 V2；`ai-heart-personality-v1` 记录保留，可用归档 V1 查看。重测仅清除 V2 记录。

## 修改位置

全部结果审查：打开 `result-review.html`，或使用单文件 `release/AI心动人格测试-全部结果审查.html`。包含 12 种人格的三种展示形式，共 36 页；可筛选人格、切换浅粉 / 浅蓝，以及预览和下载分享卡。双核心和隐藏副型可切换搭配，搭配示例仅用于布局与文案审查。修改正式结果文案或样式后，运行 `python tools/result-review.py` 重新生成审查文件。

| 内容 | 文件 |
| --- | --- |
| 18 题及多维分值 | `src/data/questions.js` |
| 12 原型、权重、关键词、模板及指标区间 | `src/data/personas.js` |
| 冻结正文、重点句及副型短解释 | `src/data/resultCopy.js` |
| 0.02 / 0.06 阈值与交互时长 | `src/data/config.js` |
| 评分与距离算法 | `src/logic/scoring.js` / `matcher.js` |
| AI 配置权重与标签区间 | `src/data/aiConfig.js` |
| AI 配置文案 | `src/data/aiConfigCopy.js` |
| AI 配置评分 / 标签映射 | `src/logic/aiScoring.js` / `aiProfile.js` |
| 分享图 / 端能力 | `src/ui/shareCanvas.js` / `xhsBridge.js` |
| 设计规范 | `design.md` |

指标采用 `round((min + (dimension × direction + 1) / 2 × (max - min)) / 5) × 5`。例如毒舌竹马的毒舌浓度展示范围为 70–100%，腹黑钓系的钓系浓度由情感表达的反向映射得到；这些区间仅用于娱乐化展示，不改动冻结算法。

`python tools/import-v2.py` 从 `docs/requirements-v2.txt` 重新生成 V2 问卷，不覆盖人格配置和结果文案。`tools/import-brief.py` 是 V1 导入工具，会覆盖 V2 问卷，升级后不用于日常构建。

## 验证范围

V2 初版通过 17 组自动测试及完整布局检查；2026-10-26 修正后通过 19 组测试、10,000 组答案抽样、正式 18 题中档可达性验证及两主题 216 张分享卡检查。历史与当前验证范围见 `docs/validation.md`，本轮修改清单见 `docs/v2-corrections-20261026.md`。

2026-10-26 已修正中档可达性：仅将 G/R 低档上限改为 −0.75，Q16/Q17 的 B 选项（−0.5）现在进入「适应型」「轻剧情型」；M/L 区间与全部评分公式不变。定制按钮只提示返回原笔记评论『想定制』；分享卡使用独立的四项配置摘要区，标签字号为 36px。

采用 Chrome 61 基线语法和样式，尚未在 Chrome 61、Android 8.1、iOS 真机或小红书平台模拟器实测。浏览器和模拟桥接检查不等同于小红书容器验收。

## 规范来源

- [当前官方在线文档](https://miniapp-sandbox.xiaohongshu.com/minitool/doc)，本任务获取的页面标注最后更新 2026-09-22，副本在 `vendor/current-official-doc.html`。
- [官方技能下载包 1.7.0](https://fe-static.xhscdn.com/minitool/20260923133933/minitool-zip-builder-1.7.0.skill)，已保存、读取全部适用 references 并运行其 Python 审计。
- 官方下载包的 `skill-package.json` 为 1.7.0，但 `SKILL.md` frontmatter 仍写 1.6.0。保留原文件未修改，版本差异已写入交付 manifest；API 以在线官方文档为准。
