/**
 * PUSSY Subsystems Registry
 *
 * Foundation entry point for engine systems:
 * - Pet Animation & State Engine (Phase 2, 3, 4)
 * - Audio & Voice Repeater System (Phase 5)
 * - Feeding System (Phase 6)
 * - Pet Stats & Economy System (Phase 7)
 * - Head Soccer Mini-Game (Phase 8)
 * - Save & Persistence System (Phase 9)
 * - WebXR / Camera AR System (Phase 10)
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
