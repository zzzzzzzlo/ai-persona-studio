<script setup lang="ts">
import { ArrowRight, FileJson, GitBranch, ShieldCheck } from 'lucide-vue-next'
import { devToolsEnabled } from '@/router'
</script>
<template>
  <div class="page-heading"><span class="eyebrow">PROJECT OVERVIEW / 项目概览</span><h1>先理解偏好，再构建人格。</h1><p>将问卷、自由表达与追问结果，整理为可以校验、追溯和更新的结构化画像。</p></div>
  <section class="intro-panel"><div><span class="pill">当前里程碑</span><h2>用户偏好画像 V1.0</h2><p>基础工程已经就位。当前工作台提供画像 JSON 校验，后续将逐步接入需求提取与人格提示词编译。</p><RouterLink v-if="devToolsEnabled" class="text-link" to="/dev/validate">打开画像校验工具 <ArrowRight :size="16" /></RouterLink></div><div class="schema-preview"><span>{</span><br>&nbsp;&nbsp;偏好维度：程度 / 枚举 / 多选<br>&nbsp;&nbsp;情境规则：跨维度行为覆盖<br>&nbsp;&nbsp;硬约束：明确的关系边界<br><span>}</span></div></section>
  <div class="feature-grid"><article class="surface"><FileJson :size="23" /><h3>结构可校验</h3><p>独立 Schema 版本，区分未知、推断与用户确认。</p></article><article class="surface"><GitBranch :size="23" /><h3>每次更新留痕</h3><p>完整快照和证据引用，保留历史并检查版本冲突。</p></article><article class="surface"><ShieldCheck :size="23" /><h3>用户边界优先</h3><p>模型候选经过后端校验，不能自动覆盖已确认内容。</p></article></div>
  <p class="boundary-note">本阶段只提供开发基础能力。静态记忆锚点用于提示词设定，不代表外部聊天软件具有跨会话记忆或主动联系能力。</p>
</template>
