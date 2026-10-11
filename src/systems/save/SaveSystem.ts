import type { PetStats } from '../../types'
import { INITIAL_PET_STATS } from '../../data/constants.ts'

export interface SaveData {
  version: number
  stats: PetStats
  lastSavedAt: number
}

const SAVE_KEY = 'pussy_web_pet_save_v1'
const SAVE_VERSION = 1

export class SaveSystem {
  public static load(): PetStats {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return { ...INITIAL_PET_STATS }

      const parsed: SaveData = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object' || parsed.version !== SAVE_VERSION) {
        return { ...INITIAL_PET_STATS }
      }

      // Validate all required numeric stats are present and valid
      const s = parsed.stats
      if (
        typeof s.hunger !== 'number' ||
        typeof s.happiness !== 'number' ||
        typeof s.energy !== 'number' ||
        typeof s.xp !== 'number' ||
        typeof s.coins !== 'number'
      ) {
        return { ...INITIAL_PET_STATS }
      }

      // Calculate offline decay (e.g. 1 point of hunger per 2 minutes offline, max -30)
      const now = Date.now()
      const elapsedMinutes = Math.max(0, (now - (parsed.lastSavedAt || now)) / (1000 * 60))
      const hungerDecay = Math.min(30, Math.floor(elapsedMinutes / 2))

      return {
        hunger: Math.max(0, Math.min(100, s.hunger - hungerDecay)),
        happiness: Math.max(0, Math.min(100, s.happiness)),
        energy: Math.max(0, Math.min(100, s.energy)),
        xp: Math.max(0, s.xp),
        coins: Math.max(0, s.coins),
      }
    } catch {
      // Fallback on corrupt storage
      return { ...INITIAL_PET_STATS }
    }
  }

  public static save(stats: PetStats): void {
    try {
      const payload: SaveData = {
        version: SAVE_VERSION,
        stats: {
          hunger: Math.max(0, Math.min(100, stats.hunger)),
          happiness: Math.max(0, Math.min(100, stats.happiness)),
          energy: Math.max(0, Math.min(100, stats.energy)),
          xp: Math.max(0, stats.xp),
          coins: Math.max(0, stats.coins),
        },
        lastSavedAt: Date.now(),
      }
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload))
    } catch {
      // Ignore quota exceeded or private browsing errors gracefully
    }
  }

  public static clear(): void {
    try {
      localStorage.removeItem(SAVE_KEY)
    } catch {
      // Ignore
    }
  }
}
