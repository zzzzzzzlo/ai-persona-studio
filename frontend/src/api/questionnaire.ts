import {client} from './client'
import type {Questionnaire,Answer,Receipt} from '@/questionnaire/model'
export const questionnaireId='paid-deep-persona-questionnaire-v1'
export async function getQuestionnaire(){return (await client.get<Questionnaire>(`/questionnaires/${questionnaireId}`)).data}
export async function submitQuestionnaire(body:{submissionId:string;questionnaireId:string;questionnaireVersion:string;answers:Record<string,Answer>}){return (await client.post<Receipt>('/questionnaire-submissions',body)).data}
export async function getSavedProfile(id:string){return (await client.get(`/profiles/${encodeURIComponent(id)}`)).data}
