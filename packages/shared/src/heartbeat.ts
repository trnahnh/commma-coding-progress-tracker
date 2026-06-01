import { z } from 'zod'
import { keyLabelSchema } from './keyLabels.js'

export const keyFreqSchema = z.record(
  keyLabelSchema,
  z.number().int().nonnegative(),
)

export type KeyFreq = z.infer<typeof keyFreqSchema>

const MAX_TS = 4_102_444_800_000
const MAX_COUNT = 1_000_000

export const heartbeatEventSchema = z.object({
  id: z.string().uuid(),
  ts: z.number().int().positive().max(MAX_TS),
  lang: z.string().max(64).optional(),
  file: z.string().max(1024).optional(),
  project: z.string().max(256).optional(),
  keystrokes: z.number().int().nonnegative().max(MAX_COUNT),
  lines: z.number().int().min(-MAX_COUNT).max(MAX_COUNT),
  key_freq: keyFreqSchema.optional(),
})

export type HeartbeatEvent = z.infer<typeof heartbeatEventSchema>

export const heartbeatBatchSchema = z.object({
  events: z.array(heartbeatEventSchema).min(1).max(500),
})

export type HeartbeatBatch = z.infer<typeof heartbeatBatchSchema>

export const ingestResponseSchema = z.object({
  received: z.number().int().nonnegative(),
  duplicate: z.number().int().nonnegative(),
})

export type IngestResponse = z.infer<typeof ingestResponseSchema>
