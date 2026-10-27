<script setup lang="ts">
import { ref } from 'vue'
import { Check, Play, RotateCcw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { validateProfile, type ValidationResult } from '@/api/profiles'
import { ApiError, type FieldError } from '@/api/client'
import { globalError } from '@/lib/errors'
import draft from '@/examples/profile-draft.json'
const text = ref(JSON.stringify(draft, null, 2))
const busy = ref(false)
const result = ref<ValidationResult | null>(null)
const errors = ref<FieldError[]>([])
function resetResult() { result.value = null; errors.value = []; globalError.value = '' }
function reset() { text.value = JSON.stringify(draft, null, 2); resetResult() }
async function validate() {
  resetResult()
  let profile: unknown
  try { profile = JSON.parse(text.value) }
  catch { errors.value = [{ path: '/', message: 'JSON 语法错误，请检查引号、逗号与括号' }]; return }
  busy.value = true
  try { result.value = await validateProfile(profile) }
  catch (error) { errors.value = error instanceof ApiError && error.response.errors.length ? error.response.errors : [{ path: '/', message: error instanceof Error ? error.message : '校验请求失败' }] }
  finally { busy.value = false }
}
</script>
<template>
  <div class="page-heading"><span class="eyebrow">DEVELOPER TOOLS / 开发工具</span><h1>画像 JSON 校验</h1><p>检查结构与业务规则，不写入数据库。证据引用的归属和有效性在保存时检查。</p></div>
  <section class="surface editor-panel"><div class="editor-toolbar"><label for="profile-json">user-preference-profile.json</label><span>Schema 1.0.0</span></div><textarea id="profile-json" v-model="text" spellcheck="false" aria-label="画像 JSON" @input="resetResult" /><div class="editor-actions"><Button :disabled="busy" @click="validate"><Play :size="15" />{{ busy ? '正在校验…' : '校验画像' }}</Button><Button variant="outline" :disabled="busy" @click="reset"><RotateCcw :size="15" />恢复草稿示例</Button></div></section>
  <section v-if="result" role="status" class="result-panel"><h2><Check :size="20" />画像结构与业务规则通过</h2><p>{{ result.readiness.readyForCompilation ? '已满足当前版本的编译条件。' : `可以保存草稿；距离编译就绪仍有 ${result.readiness.blockers.length} 个阻断项。` }}</p><ul v-if="result.readiness.blockers.length"><li v-for="blocker in result.readiness.blockers" :key="blocker">{{ blocker }}</li></ul><ul v-if="result.readiness.warnings.length"><li v-for="warning in result.readiness.warnings" :key="warning">{{ warning }}</li></ul></section>
  <section v-if="errors.length" role="alert" class="validation-errors"><h2>发现 {{ errors.length }} 项问题</h2><ul><li v-for="(error, i) in errors" :key="i"><code>{{ error.path || '/' }}</code><span>{{ error.message }}</span></li></ul></section>
</template>
