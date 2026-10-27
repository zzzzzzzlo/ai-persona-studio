# 画像 API V1

开发地址 `http://127.0.0.1:8080`。需服务端设置 `DEV_API_ENABLED=true`，否则不注册画像路由。固定开发 owner 由 `DEV_OWNER_ID` 指定；请求不接受客户端 owner、数据库 ID 或时间字段。正式认证未实现。UTF-8 JSON，未知字段返回 400。

## 接口

| 方法 / 路径 | 请求 | 成功响应 |
| --- | --- | --- |
| POST `/api/v1/profiles` | `{profile,changeReason,evidence,origin?}` | 201，ProfileResponse |
| GET `/api/v1/profiles/{profileId}` | 无 | 200，ProfileResponse（当前开发 owner 的画像） |
| POST `/api/v1/profiles/{profileId}/versions` | `{expectedCurrentVersion,profile,changeReason,evidence,origin?}` | 201，ProfileResponse |
| POST `/api/v1/profiles/validate` | `{profile}` | 200，`{valid:true,errors:[],readiness:{...}}`；不访问证据表，不写库 |

`profile` 是完整快照，不是 PATCH。`changeReason` 必填非空，最多 500 字；evidence 必须是数组，没有新证据传 `[]`。origin 默认为 USER，另可为 MODEL_INFERENCE，仅供本地开发；正式模型集成应由可信服务端路径设定，不能信任客户端标记。

`expectedCurrentVersion` 从最新 GET 读取，最小为 1。更新冲突不能简单将本地版本加一重试；必须重新读取、审查差异后提交。旧快照保留，无历史修改或删除接口。

## 请求示例

完整创建体见 `docs/examples/create-profile.json`。验证只发送其 profile 部分：

```powershell
$body = Get-Content docs/examples/create-profile.json -Raw | ConvertFrom-Json
$json = @{ profile = $body.profile } | ConvertTo-Json -Depth 60
Invoke-RestMethod http://127.0.0.1:8080/api/v1/profiles/validate -Method Post -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json))
# 第一次创建可直接发送示例；再次创建时更换 evidenceId 和画像内所有引用。
$created = Invoke-RestMethod http://127.0.0.1:8080/api/v1/profiles -Method Post -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json -Depth 60)))
$version = @{ expectedCurrentVersion = $created.currentVersion; profile = $body.profile; changeReason = '用户确认第二版'; evidence = @() }
Invoke-RestMethod "http://127.0.0.1:8080/api/v1/profiles/$($created.profileId)/versions" -Method Post -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes(($version | ConvertTo-Json -Depth 60)))
```

## 证据 DTO

```json
{
  "evidenceId": "e-questionnaire",
  "sourceType": "QUESTIONNAIRE",
  "sourceRef": "q-confirmation-001",
  "targetFieldPath": "",
  "rawExcerpt": null,
  "extractedValue": { "confirmed": true },
  "status": "CONFIRMED"
}
```

来源 QUESTIONNAIRE/FREE_TEXT/CLARIFICATION/USER_EDIT/MODEL_INFERENCE；状态 PROVISIONAL/CONFIRMED/REJECTED。ID 为 1–64 位 ASCII 字母、数字、下划线或短横线；全局唯一，不可重用覆盖。sourceRef ≤200 字，targetFieldPath ≤300 字，为合法 JSON Pointer；空字符串表示整份用户确认。rawExcerpt 可空且 ≤1000 字，extractedValue 为非空 JSON 值。单请求最多 200 条证据。

保存时 evidenceRefs 可引用本画像既有版本的有效证据和本次新证据，不能跨画像引用。证据目标必须覆盖引用条目或其字段，拒绝 REJECTED 来源。USER_CONFIRMED 条目至少需要一条 CONFIRMED 的非模型证据；模型来源不能自我确认。验证接口不能凭 JSON 确认证据的真实性，因此写入仍可能返回 400。

## 响应 DTO

```json
{
  "profileId": "UUID",
  "ownerUserId": "dev-user-local",
  "currentVersion": 1,
  "status": "READY",
  "createdAt": "2026-10-27T00:00:00Z",
  "updatedAt": "2026-10-27T00:00:00Z",
  "current": {
    "version": 1,
    "schemaVersion": "1.0.0",
    "readyForCompilation": true,
    "changeReason": "用户确认",
    "profile": { "说明": "此处为完整画像，结构见 profile-schema.md" },
    "createdAt": "2026-10-27T00:00:00Z"
  }
}
```

此响应片段用于说明外壳，不能将 profile 的说明字段当作合法画像。数据库自增 ID、JSON 字符串、Mapper 和 Entity 不暴露。返回时间为 UTC ISO-8601。

## 统一错误

```json
{
  "code": "VALIDATION_FAILED",
  "message": "画像校验失败",
  "errors": [{ "path": "/dimensions/teasingIntensity/value", "message": "必须小于等于 5" }],
  "timestamp": "2026-10-27T00:00:00Z"
}
```

画像内部路径相对于 profile 根，外壳错误指向请求字段。Schema 条件错误可能返回同一路径的多条原因。readiness 不一致时错误说明包含后端计算的期望值；前端不得默默补齐缺失偏好。

| HTTP | code | 处理 |
| --- | --- | --- |
| 400 | VALIDATION_FAILED | 字段/Schema/业务规则/证据/推断保护失败，查看 errors |
| 400 | MALFORMED_JSON | JSON、枚举、请求字段无法解析 |
| 404 | PROFILE_NOT_FOUND | 不存在或不属于当前开发 owner |
| 409 | VERSION_CONFLICT | 预期版本过期，重新读取 |
| 409 | DATA_CONFLICT | 证据 ID 等唯一性/完整性冲突，事务回滚 |
| 500 | INTERNAL_ERROR | 服务错误，不返回数据库细节或用户原文 |

无效画像校验返回 400 和统一错误体，不以 `valid:false` 的 200 响应伪装成功。Swagger UI 为 `/swagger-ui/index.html`，机器 OpenAPI 为 `/v3/api-docs`，均只在开发开关开启时可用。
