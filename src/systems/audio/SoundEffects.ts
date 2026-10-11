/**
 * SoundEffects
 *
 * Lightweight, zero-external-dependency sound synthesis engine using Web Audio API.
 * Provides original, playful cartoon sound effects with built-in mute control.
 */
class SoundEffectsEngine {
  private ctx: AudioContext | null = null
  private muted: boolean = false

  constructor() {
    // AudioContext will be initialized or resumed on first user interaction
    const savedMute = localStorage.getItem('pussy_web_muted')
    if (savedMute !== null) {
      this.muted = savedMute === 'true'
    }
  }

  private getContext(): AudioContext | null {
    if (this.muted) return null
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume()
    }
    return this.ctx
  }

  public isMuted(): boolean {
    return this.muted
  }

  public setMuted(muted: boolean): void {
    this.muted = muted
    localStorage.setItem('pussy_web_muted', String(muted))
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted)
    return this.muted
  }

  /** Gentle tactile UI or touch tap */
  public playTap(): void {
    const ctx = this.getContext()
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const now = ctx.currentTime

    osc.type = 'sine'
    osc.frequency.setValueAtTime(440, now)
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08)

    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.08)
  }

  /** Joyful purr / chirp when pet */
  public playPet(): void {
    const ctx = this.getContext()
    if (!ctx) return
    const now = ctx.currentTime
    const notes = [587.33, 739.99, 880.0, 1174.66] // D5, F#5, A5, D6

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const noteTime = now + idx * 0.06

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, noteTime)
      osc.frequency.exponentialRampToValueAtTime(freq * 1.05, noteTime + 0.12)

      gain.gain.setValueAtTime(0.2, noteTime)
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.12)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(noteTime)
      osc.stop(noteTime + 0.12)
    })
  }

  /** Comical cartoon hit / thud */
  public playHit(): void {
    const ctx = this.getContext()
    if (!ctx) return
    const now = ctx.currentTime

    // Punchy low thud
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(180, now)
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.25)

    gain.gain.setValueAtTime(0.4, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.25)
  }

  /** Comical downward slide / dizzy fall */
  public playFall(): void {
    const ctx = this.getContext()
    if (!ctx) return
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(400, now)
    osc.frequency.linearRampToValueAtTime(100, now + 0.6)

    gain.gain.setValueAtTime(0.25, now)
    gain.gain.linearRampToValueAtTime(0.01, now + 0.6)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.6)
  }

  /** Joyful recover / stand-up chime */
  public playRecover(): void {
    const ctx = this.getContext()
    if (!ctx) return
    const now = ctx.currentTime
    const notes = [329.63, 440.0, 554.37, 659.25] // E4, A4, C#5, E5

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const noteTime = now + idx * 0.08

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, noteTime)

      gain.gain.setValueAtTime(0.2, noteTime)
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.2)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(noteTime)
      osc.stop(noteTime + 0.2)
    })
  }

  /** Cute munching sounds */
  public playEat(): void {
    const ctx = this.getContext()
    if (!ctx) return
    const now = ctx.currentTime

    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const t = now + i * 0.12

      osc.type = 'sine'
      osc.frequency.setValueAtTime(500 + (i % 2) * 120, t)
      osc.frequency.exponentialRampToValueAtTime(250, t + 0.08)

      gain.gain.setValueAtTime(0.25, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.08)
    }
  }

  /** Bubbling sipping sounds */
  public playDrink(): void {
    const ctx = this.getContext()
    if (!ctx) return
    const now = ctx.currentTime

    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const t = now + i * 0.1

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(400 + i * 60, t)
      osc.frequency.exponentialRampToValueAtTime(600 + i * 80, t + 0.07)

      gain.gain.setValueAtTime(0.2, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.07)
    }
  }

  /** Soccer ball kick impact */
  public playKick(): void {
    const ctx = this.getContext()
    if (!ctx) return
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(220, now)
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.18)

    gain.gain.setValueAtTime(0.45, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.18)
  }

  /** Goal celebration fanfare */
  public playGoal(): void {
    const ctx = this.getContext()
    if (!ctx) return
    const now = ctx.currentTime
    const chord = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6

    chord.forEach((freq) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now)

      gain.gain.setValueAtTime(0.25, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.8)
    })
  }

  /** Voice recording beep */
  public playRecordBeep(start: boolean = true): void {
    const ctx = this.getContext()
    if (!ctx) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(start ? 880 : 440, now)

    gain.gain.setValueAtTime(0.18, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.15)
  }
}

export const SoundEffects = new SoundEffectsEngine()
