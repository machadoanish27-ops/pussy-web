import type { PetStats } from '../types'

export const INITIAL_PET_STATS: PetStats = {
  hunger: 80,
  happiness: 90,
  energy: 100,
  xp: 0,
  coins: 50,
}

export const APP_CONFIG = {
  name: 'PUSSY',
  version: '0.1.0',
} as const
