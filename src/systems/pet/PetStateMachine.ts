import type { PetState } from '../../types'

export interface StateMachineListener {
  onStateChange: (state: PetState, prevState: PetState) => void
}

/**
 * PetStateMachine
 *
 * Manages atomic state transitions, state locks, and timers.
 * Guarantees the P0 Hit -> Fall -> Lie (2.5s) -> Stand -> Recover -> Idle sequence
 * cannot be broken by rapid clicks or race conditions.
 */
export class PetStateMachine {
  private currentState: PetState = 'IDLE'
  private recoveryTimer: ReturnType<typeof setTimeout> | null = null
  private lyingDurationTimer: ReturnType<typeof setTimeout> | null = null
  private listeners: Set<(state: PetState, prev: PetState) => void> = new Set()

  public getState(): PetState {
    return this.currentState
  }

  public subscribe(listener: (state: PetState, prev: PetState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(nextState: PetState, prevState: PetState): void {
    this.listeners.forEach((fn) => fn(nextState, prevState))
  }

  /**
   * Check whether current state locks user from overriding it
   */
  public isLocked(): boolean {
    return (
      this.currentState === 'FALLING' ||
      this.currentState === 'LYING' ||
      this.currentState === 'RECOVERING'
    )
  }

  /**
   * Safe transition handler
   */
  public setState(nextState: PetState, force: boolean = false): boolean {
    if (this.currentState === nextState) return true
    if (!force && this.isLocked()) {
      return false
    }

    const prev = this.currentState
    this.currentState = nextState
    this.notify(nextState, prev)
    return true
  }

  /**
   * Trigger the Hit -> Fall -> Lie (2.5s) -> Stand Up -> Recover -> Idle cycle
   */
  public triggerHitSequence(
    onFall?: () => void,
    onRecover?: () => void,
    onComplete?: () => void
  ): boolean {
    // If already in hit/fall/recovery, do not corrupt the active sequence
    if (this.isLocked()) {
      return false
    }

    this.clearTimers()

    // 1. Instant HIT reaction
    this.setState('HIT', true)

    // 2. Transition into FALLING after 0.25s
    this.recoveryTimer = setTimeout(() => {
      this.setState('FALLING', true)
      onFall?.()

      // 3. Arrive at ground in LYING state after 0.35s
      this.recoveryTimer = setTimeout(() => {
        this.setState('LYING', true)

        // 4. Lie on ground for 2.5 seconds (meeting the 2-3s requirement)
        this.lyingDurationTimer = setTimeout(() => {
          // 5. Stand up and recover
          this.setState('RECOVERING', true)
          onRecover?.()

          // 6. Return cleanly to IDLE after recovery stand-up motion (0.9s)
          this.recoveryTimer = setTimeout(() => {
            this.setState('IDLE', true)
            onComplete?.()
          }, 900)
        }, 2500)
      }, 350)
    }, 250)

    return true
  }

  /**
   * Temporary action state (e.g. Pet, Eat, Drink, Talk) returning to IDLE
   */
  public triggerTemporaryState(
    state: PetState,
    durationMs: number,
    onComplete?: () => void
  ): boolean {
    if (this.isLocked()) return false

    this.clearTimers()
    this.setState(state)

    this.recoveryTimer = setTimeout(() => {
      if (this.currentState === state) {
        this.setState('IDLE')
        onComplete?.()
      }
    }, durationMs)

    return true
  }

  public clearTimers(): void {
    if (this.recoveryTimer !== null) {
      clearTimeout(this.recoveryTimer)
      this.recoveryTimer = null
    }
    if (this.lyingDurationTimer !== null) {
      clearTimeout(this.lyingDurationTimer)
      this.lyingDurationTimer = null
    }
  }

  public reset(): void {
    this.clearTimers()
    this.setState('IDLE', true)
  }
}
