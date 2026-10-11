/**
 * Core types for the PUSSY interactive virtual pet application.
 */

export type AppMode = 'normal' | 'ar'

export type PetBehaviorState =
  | 'idle'
  | 'blinking'
  | 'breathing'
  | 'happy'
  | 'hit'
  | 'fallen'
  | 'recovering'
  | 'eating'
  | 'listening'
  | 'repeating'
  | 'playing'

export interface PetStats {
  hunger: number
  happiness: number
  energy: number
  xp: number
  coins: number
}

export type InteractionType =
  | 'touch'
  | 'pet'
  | 'hit'
  | 'feed_milk'
  | 'feed_fish'
  | 'voice'
