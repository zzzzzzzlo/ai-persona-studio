# AI 人格定制

## 付费深度问卷闭环（2026-10-28）

已接入提供的 1.0.1 问卷：26 题 / 7 模块、逐题卡片、本地草稿、最终一次提交、确定性候选画像、证据与事务持久化、幂等重试及历史版本读取。前端入口 `/questionnaire`，沿用归档 V2 的浅粉视觉；原推广文件未修改。

完整接入说明、API、配置差异和测试结果见 [付费问卷实现说明](docs/paid-questionnaire-implementation-v1.md)。浏览器实填并从 MySQL 重新读取的答卷、画像、39 条证据和回执在 [docs/examples](docs/examples/paid-browser-profile.json)。默认仍关闭开发接口，运行前沿用下方 DEV_API_ENABLED 和数据库配置。

```powershell
npm --prefix frontend test
npm --prefix frontend run build
mvn -f backend/pom.xml test
mvn -f backend/pom.xml package
```

新增迁移为 `V2__questionnaire_submission.sql`，不改既有 V1。没有支付、大模型或最终提示词生成；提交后是待确认候选画像。

## AI 人格定制工程 V1.0

当前开发内容为 Vue + Spring Boot 的 AI 人格定制应用。此前用于推广的人格问卷已完整归档到 [推广问卷/](推广问卷/README.md)，不属于现阶段开发范围，也不直接作为已确认用户画像的数据来源。

新增内容：版本化用户偏好画像、Draft 2020-12 校验、证据引用、MySQL 三表持久化、并发版本检查与开发 JSON 校验页面。最终商品计划是可复制到外部软件的自包含人格提示词；当前没有大模型调用、人格生成、支付或正式账号系统。

| 路径 | 用途 |
| --- | --- |
| `frontend/` | Vue 3 + TypeScript + Vite + Router + Axios + Tailwind 4 + shadcn-vue Button 开发骨架 |
| `backend/` | Java 21、Spring Boot 3.5.16、Maven、MyBatis-Plus 3.5.17、Flyway、Jackson、Validation、springdoc 2.8.17、networknt 1.5.6 |
| `docs/profile-schema.md` | 画像正式规则、状态、等级锚点与示例说明 |
| `docs/architecture.md` / `docs/api.md` | 事务、身份边界、证据最小化、接口与错误格式 |
| `docs/implementation-v1.md` | 本次文件清单、验收结果与后续复用点 |
| `推广问卷/` | 独立归档的推广问卷：源码、发布包、测试、构建工具及历史资料 |

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


## 推广问卷归档

旧问卷的所有入口、源码、发布包及资料均在 `推广问卷/`，使用说明见 [推广问卷/README.md](推广问卷/README.md)。当前应用的构建和启动不依赖该目录。

如需单独维护推广资料，在仓库根目录执行：

```powershell
npm --prefix "./推广问卷" test
npm --prefix "./推广问卷" run dev
# 问卷预览端口 5173；当前应用前端端口 5180。
```
