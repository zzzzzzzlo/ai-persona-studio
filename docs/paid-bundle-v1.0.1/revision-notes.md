# AI 伴侣付费版深度问卷 V1.0.1 修订记录与验证报告

## 本次修订范围

本次基于用户上传的 V1.0 全套交付物进行定向修订，保留 26 道题和原有 7 个模块，不重做整份问卷。

### 已完成

1. 将 `required` 与 `allowSkip` 统一：`allowSkip=true` 时 `required=false`；`allowSkip=false` 时 `required=true`。当前为 15 道必答题、11 道选填题。
2. Q06 明确为建议选 1–3 项、最多 4 项；Q12 明确选择 2–3 项；Q22 语气标签上限调整为 4 项。
3. Q12 被选中的重要性维度设为 `CRITICAL`；未选中维度统一使用 `MEDIUM` 产品默认值，并明确该默认值不是用户证据，不再根据偏好强度自动推断重要性。
4. Q19 增加 `HC_OPT_00`“以上都没有固定禁区”，与其他禁区互斥，避免强迫用户认领不适用的禁区。
5. 移除画像中不存在的 `/behaviors/unsolicitedAdvice` 写入目标。`unsolicitedAdvice` 保留为映射层逻辑目标，最终通过 `contextualPolicies[].instruction` 生成自然语言行为指令。
6. 为 Q13 的四个权衡代码补齐确定性映射。
7. 修订 Q16 的拥抱选项，明确身体接触须尊重用户当下同意。
8. 修订 Q19 的“角色沉浸”与“冷暴力”约束，区分自然角色表达、身份事实回应、惩罚性沉默与合理暂停/独处。
9. 修订追问跳过后的回退规则，避免把“跳过追问”误当成用户确认，也避免在已有有效答案时错误地清空维度值。
10. 更新示例画像的情境规则、重要性默认值和证据引用，并同步更新研究与工程规范。

## 内部一致性检查

通过随包提供的 `validate_bundle.py` 执行：

- 所有配套 JSON 可解析。
- 题目 ID、选项 ID 无重复。
- `totalQuestions` 与实际题数一致。
- `required` / `allowSkip` 语义一致。
- Q12 的选择数量和未选中默认值一致。
- Q19 的无禁区选项存在且具有互斥配置。
- Q13 四个权衡代码与映射规则一一对应。
- 评分映射引用的问题/子题 ID 存在。
- 配套画像和问卷映射中不存在把 `/behaviors/unsolicitedAdvice` 当作有效目标的活动写入操作。

## 尚未验证的内容

**本 ZIP 未包含项目仓库中的以下真实文件：**

- `user-preference-profile.schema.json`
- `profile-schema.md`
- `dimension-catalog.json`

因此，本报告不宣称 `sample-valid-profile-v1.json` 已通过真实项目的 JSON Schema、Java `ProfileRules` 或数据库集成测试。示例画像只是经过内部结构修订的示例。将配置交给 Codex 前，仍需用实际项目文件执行 Schema 校验，并根据结果调整不兼容字段。

本次没有运行前端、后端、MySQL 或真实大模型测试；这些属于工程接入阶段的验收任务。
