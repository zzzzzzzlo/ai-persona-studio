import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
export const devToolsEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_TOOLS === 'true'
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomeView },
    ...(devToolsEnabled ? [{ path: '/dev/validate', component: () => import('@/views/ValidateView.vue') }] : []),
    { path: '/:pathMatch(.*)*', component: () => import('@/views/NotFoundView.vue') },
  ],
})
