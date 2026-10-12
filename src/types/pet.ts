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
  | 'LISTENING'
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

export type MouthState =
  | 'MOUTH_CLOSED'
  | 'MOUTH_SMALL'
  | 'MOUTH_OPEN'
  | 'MOUTH_WIDE'

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

export type HitLocation =
  | 'HEAD'
  | 'FOREHEAD'
  | 'LEFT_CHEEK'
  | 'RIGHT_CHEEK'
  | 'EYES'
  | 'BODY'
  | 'SIDES'
  | 'EAR'
  | 'TAIL'

export type CartoonEffectType =
  | 'BANDAGE_HEAD'
  | 'BANDAGE_LEFT'
  | 'BANDAGE_RIGHT'
  | 'DIZZY_STARS'
  | 'SPARK_BURST'
  | 'HEART_FLOAT'

export type IdlePoseType =
  | 'STAND'
  | 'HEAD_TILT_LEFT'
  | 'HEAD_TILT_RIGHT'
  | 'LEAN_FORWARD'
  | 'WEIGHT_SHIFT'
  | 'SLEEPY_SLUMP'
  | 'HAPPY_BOUNCE'
