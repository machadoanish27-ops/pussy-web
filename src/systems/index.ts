/**
 * PUSSY Subsystems Registry
 */

export const REGISTERED_SYSTEMS = [
  'pet-engine',
  'voice-system',
  'feeding-system',
  'stats-system',
  'soccer-game',
  'save-system',
  'ar-system',
] as const

export type SystemIdentifier = (typeof REGISTERED_SYSTEMS)[number]

export * from './pet/index.ts'
