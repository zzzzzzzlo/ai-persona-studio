import { ref } from 'vue'
export const globalError = ref('')
export function reportError(error: unknown) {
  globalError.value = error instanceof Error ? error.message : '出现未知错误，请稍后重试'
}
