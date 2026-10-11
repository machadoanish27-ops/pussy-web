/**
 * Core types for the PUSSY interactive virtual pet application.
 */

export type AppMode = 'normal' | 'ar'

export type ARModeState =
  | 'inactive'
  | 'detecting'
  | 'webxr'
  | 'camera_fallback'
  | 'unsupported'
  | 'denied'

/**
 * Pet State Machine enumeration matching the final master execution specification:
 * IDLE, TALKING, PETTING, HAPPY, ANGRY, HIT, FALLING, LYING, RECOVERING, EATING, DRINKING, SOCCER, SLEEPING
 */
export type PetState =
  | 'IDLE'
  | 'TALKING'
  | 'PETTING'
  | 'HAPPY'
  | 'ANGRY'
  | 'HIT'
  | 'FALLING'
  | 'LYING'
  | 'RECOVERING'
  | 'EATING'
  | 'DRINKING'
  | 'SOCCER'
  | 'SLEEPING'

export interface PetStats {
  hunger: number
  happiness: number
  energy: number
  xp: number
  coins: number
}

export type FoodType = 'milk' | 'fish' | null

export type MiniGameMode = 'none' | 'soccer'

export type InteractionType =
  | 'touch'
  | 'pet'
  | 'hit'
  | 'feed_milk'
  | 'feed_fish'
  | 'voice'
  | 'soccer'
