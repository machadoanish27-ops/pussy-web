/**
 * Core types for the PUSSY interactive virtual pet application.
 */

export type AppMode = 'normal' | 'ar'

/**
 * Standard Pet State enumeration matching the 12-phase roadmap state machine:
 * IDLE, TALKING, PETTING, HAPPY, HIT, FALLING, LYING, RECOVERING, EATING, DRINKING, SOCCER
 */
export type PetState =
  | 'IDLE'
  | 'TALKING'
  | 'PETTING'
  | 'HAPPY'
  | 'HIT'
  | 'FALLING'
  | 'LYING'
  | 'RECOVERING'
  | 'EATING'
  | 'DRINKING'
  | 'SOCCER'

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
