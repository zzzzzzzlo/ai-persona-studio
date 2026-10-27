import { client, type FieldError } from './client'
export interface Readiness { readyForCompilation: boolean; blockers: string[]; warnings: string[] }
export interface ValidationResult { valid: boolean; errors: FieldError[]; readiness: Readiness }
// Unknown JSON enters only the validation boundary; future editors should use generated typed contracts.
export async function validateProfile(profile: unknown) {
  return (await client.post<ValidationResult>('/profiles/validate', { profile })).data
}
