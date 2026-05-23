import { z } from 'zod'

export const PlayerRoleSchema = z.enum(['never_trade', 'conditional', 'hold', 'surplus'])
export type PlayerRole = z.infer<typeof PlayerRoleSchema>

export const TimelineSchema = z.object({
  stance: z.enum(['rebuild', 'consolidate', 'contend']),
  contendYear: z.number().int().min(2024).max(2040),
})
export type Timeline = z.infer<typeof TimelineSchema>

export const TargetSchema = z.object({
  id: z.string(),
  sleeperId: z.string().optional(),
  position: z.string().optional(),
  maxAge: z.number().int().optional(),
  note: z.string(),
})
export type Target = z.infer<typeof TargetSchema>

export const ConstraintsSchema = z.object({
  maxAcquireAge: z.number().int().optional(),
  flagAddsOlderThanContendWindow: z.boolean(),
})
export type Constraints = z.infer<typeof ConstraintsSchema>

export const StrategySchema = z.object({
  timeline: TimelineSchema,
  playerRoles: z.record(z.string(), PlayerRoleSchema),
  conditionalReturn: z.record(z.string(), z.string()),
  targets: z.array(TargetSchema),
  constraints: ConstraintsSchema,
})
export type Strategy = z.infer<typeof StrategySchema>
