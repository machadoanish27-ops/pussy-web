import type { AnimationClip, AnimationMixer } from 'three'
import type { PetState } from '../../types'

export interface AnimationControllerConfig {
  defaultState?: PetState
  mixer?: AnimationMixer | null
  clips?: AnimationClip[]
}

/**
 * PetAnimationController
 *
 * Clean abstraction decoupling 3D animation clip playback from the pet state machine.
 * Designed to seamlessly receive and crossfade GLB/FBX clips in future phases
 * while gracefully maintaining a safe, static IDLE pose when clips are absent.
 */
export class PetAnimationController {
  private currentState: PetState = 'IDLE'
  private mixer: AnimationMixer | null = null
  private availableClips: Map<string, AnimationClip> = new Map()
  private stateClipMapping: Partial<Record<PetState, string>> = {}

  constructor(config?: AnimationControllerConfig) {
    if (config?.defaultState) {
      this.currentState = config.defaultState
    }
    if (config?.mixer) {
      this.mixer = config.mixer
    }
    if (config?.clips) {
      this.registerClips(config.clips)
    }
  }

  public registerClips(clips: AnimationClip[]): void {
    for (const clip of clips) {
      this.availableClips.set(clip.name, clip)
    }
  }

  public bindStateClip(state: PetState, clipName: string): void {
    this.stateClipMapping[state] = clipName
  }

  public setMixer(mixer: AnimationMixer | null): void {
    this.mixer = mixer
  }

  public getState(): PetState {
    return this.currentState
  }

  public hasClipFor(state: PetState): boolean {
    const clipName = this.stateClipMapping[state]
    return clipName !== undefined && this.availableClips.has(clipName)
  }

  public transitionTo(nextState: PetState): void {
    this.currentState = nextState
    if (this.mixer && this.hasClipFor(nextState)) {
      const clipName = this.stateClipMapping[nextState]
      if (clipName) {
        const clip = this.availableClips.get(clipName)
        if (clip) {
          const action = this.mixer.clipAction(clip)
          action.reset().fadeIn(0.2).play()
        }
      }
    }
  }

  public update(delta: number): void {
    if (this.mixer) {
      this.mixer.update(delta)
    }
  }

  public getAvailableClipNames(): string[] {
    return Array.from(this.availableClips.keys())
  }
}
