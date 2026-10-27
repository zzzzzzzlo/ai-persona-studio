import axios from 'axios'
import { reportError } from '@/lib/errors'
export interface FieldError { path: string; message: string }
export interface ErrorResponse { code: string; message: string; errors: FieldError[]; timestamp: string }
export class ApiError extends Error {
  constructor(public readonly response: ErrorResponse, public readonly status?: number) { super(response.message) }
}
export const client = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1', timeout: 15000, headers: { 'Content-Type': 'application/json' } })
client.interceptors.response.use(response => response, error => {
  const body = error.response?.data
  const formatted = new ApiError(body?.code ? body : { code: 'NETWORK_ERROR', message: '无法连接后端，请检查服务和 API 地址', errors: [], timestamp: new Date().toISOString() }, error.response?.status)
  reportError(formatted)
  return Promise.reject(formatted)
})
