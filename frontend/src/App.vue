<script setup lang="ts">
import { Braces, Compass, ArrowUpRight } from 'lucide-vue-next'
import { devToolsEnabled } from './router'
import { globalError } from './lib/errors'
</script>
<template>
  <div class="shell">
    <header class="site-header"><RouterLink to="/" class="brand"><span class="brand-mark"><Compass :size="22" /></span><span>人格工坊<small>PERSONA STUDIO</small></span></RouterLink><span class="stage">V1.0 · 工程开发阶段</span></header>
    <div class="workspace">
      <aside><p class="eyebrow">工作台</p><nav aria-label="主导航"><RouterLink to="/"><Compass :size="17" />项目概览</RouterLink><RouterLink v-if="devToolsEnabled" to="/dev/validate"><Braces :size="17" />画像校验</RouterLink></nav><div class="aside-note"><span class="status-dot" />本地开发环境<p>从偏好到设定，<br>让每一条需求有据可循。</p></div></aside>
      <main><div v-if="globalError" role="alert" class="error-banner"><span>{{ globalError }}</span><button aria-label="关闭错误提示" @click="globalError = ''">关闭</button></div><RouterView /></main>
    </div>
    <footer><span>AI 人格定制 · 偏好画像基础工程</span><span>输出目标：可携带的人格提示词 <ArrowUpRight :size="13" /></span></footer>
  </div>
</template>
