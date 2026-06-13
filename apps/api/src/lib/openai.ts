import OpenAI from 'openai'
import { env } from '../env.js'

export const openai = env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
  : null

export const RECAP_MODEL = 'gpt-4.1-nano'

export function isRecapAIEnabled(): boolean {
  return !!openai
}
