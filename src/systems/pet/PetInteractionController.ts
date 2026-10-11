export interface InteractionReaction {
  isReacting: boolean
  scaleModifier: [number, number, number]
  rotationNudge: [number, number, number]
}

/**
 * PetInteractionController
 *
 * Handles touch/click detection and temporary tactile feedback
 * (such as a springy scale bounce or subtle rotation nudge).
 * Decoupled from future deep state machines (petting/hit/feeding) which will be added in Phase 3+.
 */
export class PetInteractionController {
  private lastTapTime: number = 0
  private reactionDuration: number = 0.45 // seconds

  public handleTap(): void {
    this.lastTapTime = performance.now()
  }

  public getVisualReaction(currentTime: number = performance.now()): InteractionReaction {
    if (this.lastTapTime === 0) {
      return {
        isReacting: false,
        scaleModifier: [1, 1, 1],
        rotationNudge: [0, 0, 0],
      }
    }

    const elapsed = (currentTime - this.lastTapTime) / 1000
    if (elapsed > this.reactionDuration) {
      return {
        isReacting: false,
        scaleModifier: [1, 1, 1],
        rotationNudge: [0, 0, 0],
      }
    }

    // Smooth squish-bounce curve that decays quickly
    const progress = elapsed / this.reactionDuration
    const decay = 1 - progress
    const wave = Math.sin(progress * Math.PI * 2) * decay

    return {
      isReacting: true,
      scaleModifier: [1 + wave * 0.1, 1 - wave * 0.1, 1 + wave * 0.1],
      rotationNudge: [0, Math.sin(progress * Math.PI) * 0.12, 0],
    }
  }
}
