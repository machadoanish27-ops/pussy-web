import type { PetStats } from '../../types'
import { SaveSystem } from '../save/SaveSystem.ts'

export class PetStatsManager {
  private stats: PetStats

  constructor(initialStats?: PetStats) {
    this.stats = initialStats ?? SaveSystem.load()
  }

  public getStats(): PetStats {
    return { ...this.stats }
  }

  public getLevel(): number {
    return Math.floor(this.stats.xp / 100) + 1
  }

  private clamp(val: number, min: number = 0, max: number = 100): number {
    return Math.max(min, Math.min(max, Math.round(val)))
  }

  private commit(notify?: (stats: PetStats) => void): PetStats {
    SaveSystem.save(this.stats)
    notify?.({ ...this.stats })
    return { ...this.stats }
  }

  public feedMilk(notify?: (stats: PetStats) => void): PetStats {
    this.stats.hunger = this.clamp(this.stats.hunger + 22)
    this.stats.happiness = this.clamp(this.stats.happiness + 10)
    this.stats.xp += 5
    return this.commit(notify)
  }

  public feedFish(notify?: (stats: PetStats) => void): PetStats {
    this.stats.hunger = this.clamp(this.stats.hunger + 35)
    this.stats.happiness = this.clamp(this.stats.happiness + 15)
    this.stats.xp += 8
    return this.commit(notify)
  }

  public pet(notify?: (stats: PetStats) => void): PetStats {
    this.stats.happiness = this.clamp(this.stats.happiness + 8)
    this.stats.xp += 3
    return this.commit(notify)
  }

  public hit(notify?: (stats: PetStats) => void): PetStats {
    this.stats.happiness = this.clamp(this.stats.happiness - 15)
    return this.commit(notify)
  }

  public talk(notify?: (stats: PetStats) => void): PetStats {
    this.stats.happiness = this.clamp(this.stats.happiness + 12)
    this.stats.xp += 6
    return this.commit(notify)
  }

  public soccerGoal(notify?: (stats: PetStats) => void): PetStats {
    this.stats.happiness = this.clamp(this.stats.happiness + 15)
    this.stats.energy = this.clamp(this.stats.energy - 8)
    this.stats.xp += 20
    this.stats.coins += 10
    return this.commit(notify)
  }

  public tickDecay(notify?: (stats: PetStats) => void): PetStats {
    // Subtle periodic decay (every 45s)
    this.stats.hunger = this.clamp(this.stats.hunger - 1)
    if (this.stats.hunger < 30) {
      this.stats.happiness = this.clamp(this.stats.happiness - 1)
    }
    return this.commit(notify)
  }
}
