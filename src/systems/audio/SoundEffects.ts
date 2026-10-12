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

  public ensureAudioUnlocked(): AudioContext | null {
    if (this.muted) return null
    if (!this.ctx && typeof window !== 'undefined') {
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

  private getContext(): AudioContext | null {
    return this.ensureAudioUnlocked()
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

  /**
   * Synthesized cute original vocalization: "Pi-ka!"
   * Two cheerful syllables using formant-filtered sine/triangle sweeps.
   */
  public playPika(): void {
    const ctx = this.getContext()
    if (!ctx) return
    const now = ctx.currentTime

    // Syllable 1: "Pi-" (high rising chirp)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'triangle'
    osc1.frequency.setValueAtTime(950, now)
    osc1.frequency.exponentialRampToValueAtTime(1420, now + 0.08)

    gain1.gain.setValueAtTime(0.22, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.08)

    // Syllable 2: "-ka!" (punchy cute drop)
    const t2 = now + 0.09
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(840, t2)
    osc2.frequency.exponentialRampToValueAtTime(510, t2 + 0.12)

    gain2.gain.setValueAtTime(0.26, t2)
    gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.12)

    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(t2)
    osc2.stop(t2 + 0.12)
  }

  /**
   * Synthesized enthusiastic double chirp: "Pi-ka... Pi-ka!"
   * Scheduled entirely via Web Audio ctx.currentTime for iOS Safari reliability.
   */
  public playPikaPika(): void {
    this.playPettingPika()
  }

  /**
   * Synthesized single cute cartoon vocal: "Pi-ka!"
   * Clearly distinguishable syllables on phone speakers.
   */
  public playPettingPikaSingle(pitchFactor: number = 1.0): void {
    const ctx = this.ensureAudioUnlocked()
    if (!ctx) return
    const now = ctx.currentTime

    // Syllable: "Pi-"
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'triangle'
    osc1.frequency.setValueAtTime(880 * pitchFactor, now)
    osc1.frequency.exponentialRampToValueAtTime(1400 * pitchFactor, now + 0.08)
    gain1.gain.setValueAtTime(0.40, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.08)

    // Syllable: "-ka!"
    const t2 = now + 0.085
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(850 * pitchFactor, t2)
    osc2.frequency.exponentialRampToValueAtTime(500 * pitchFactor, t2 + 0.12)
    gain2.gain.setValueAtTime(0.44, t2)
    gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.12)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(t2)
    osc2.stop(t2 + 0.12)
  }

  /**
   * Synthesized three-syllable cartoon vocal: "Pi-ka-chu!"
   * Syllable 1: "Pi-" (high sweep)
   * Syllable 2: "-ka-" (mid accent)
   * Syllable 3: "-chu!" (sweet high flutter)
   */
  public playPettingPikachu(pitchFactor: number = 1.0): void {
    const ctx = this.ensureAudioUnlocked()
    if (!ctx) return
    const now = ctx.currentTime

    // 1. "Pi-"
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'triangle'
    osc1.frequency.setValueAtTime(860 * pitchFactor, now)
    osc1.frequency.exponentialRampToValueAtTime(1360 * pitchFactor, now + 0.075)
    gain1.gain.setValueAtTime(0.38, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.075)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.075)

    // 2. "-ka-"
    const t2 = now + 0.08
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(820 * pitchFactor, t2)
    osc2.frequency.exponentialRampToValueAtTime(540 * pitchFactor, t2 + 0.085)
    gain2.gain.setValueAtTime(0.40, t2)
    gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.085)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(t2)
    osc2.stop(t2 + 0.085)

    // 3. "-chu!"
    const t3 = now + 0.175
    const osc3 = ctx.createOscillator()
    const gain3 = ctx.createGain()
    osc3.type = 'triangle'
    osc3.frequency.setValueAtTime(980 * pitchFactor, t3)
    osc3.frequency.exponentialRampToValueAtTime(1520 * pitchFactor, t3 + 0.07)
    osc3.frequency.exponentialRampToValueAtTime(880 * pitchFactor, t3 + 0.16)
    gain3.gain.setValueAtTime(0.42, t3)
    gain3.gain.exponentialRampToValueAtTime(0.001, t3 + 0.16)
    osc3.connect(gain3)
    gain3.connect(ctx.destination)
    osc3.start(t3)
    osc3.stop(t3 + 0.16)
  }

  /**
   * Synthesized sweet petting vocal reaction: "Pi-ka... Pi-ka!"
   * Guaranteed clear, audible cartoon syllables on iPhone speakers.
   * Syllable 1 ("Pi-ka") -> short pause (0.04s) -> Syllable 2 ("Pi-ka!").
   */
  public playPettingPika(pitchFactor: number = 1.0): void {
    const ctx = this.ensureAudioUnlocked()
    if (!ctx) return
    const now = ctx.currentTime

    // Distinct two-syllable "Pi-ka... Pi-ka!" structure
    // Syllable 1: "Pi-"
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'triangle'
    osc1.frequency.setValueAtTime(860 * pitchFactor, now)
    osc1.frequency.exponentialRampToValueAtTime(1380 * pitchFactor, now + 0.08)
    gain1.gain.setValueAtTime(0.38, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.08)

    // Syllable 1: "-ka"
    const t1b = now + 0.085
    const osc1b = ctx.createOscillator()
    const gain1b = ctx.createGain()
    osc1b.type = 'sine'
    osc1b.frequency.setValueAtTime(820 * pitchFactor, t1b)
    osc1b.frequency.exponentialRampToValueAtTime(490 * pitchFactor, t1b + 0.11)
    gain1b.gain.setValueAtTime(0.42, t1b)
    gain1b.gain.exponentialRampToValueAtTime(0.001, t1b + 0.11)
    osc1b.connect(gain1b)
    gain1b.connect(ctx.destination)
    osc1b.start(t1b)
    osc1b.stop(t1b + 0.11)

    // Short pause: 0.04s (between t1b + 0.11 = now + 0.195 and now + 0.235)

    // Syllable 2: "Pi-"
    const t2a = now + 0.235
    const osc2a = ctx.createOscillator()
    const gain2a = ctx.createGain()
    osc2a.type = 'triangle'
    osc2a.frequency.setValueAtTime(940 * pitchFactor, t2a)
    osc2a.frequency.exponentialRampToValueAtTime(1480 * pitchFactor, t2a + 0.08)
    gain2a.gain.setValueAtTime(0.40, t2a)
    gain2a.gain.exponentialRampToValueAtTime(0.001, t2a + 0.08)
    osc2a.connect(gain2a)
    gain2a.connect(ctx.destination)
    osc2a.start(t2a)
    osc2a.stop(t2a + 0.08)

    // Syllable 2: "-ka!"
    const t2b = now + 0.32
    const osc2b = ctx.createOscillator()
    const gain2b = ctx.createGain()
    osc2b.type = 'sine'
    osc2b.frequency.setValueAtTime(880 * pitchFactor, t2b)
    osc2b.frequency.exponentialRampToValueAtTime(510 * pitchFactor, t2b + 0.14)
    gain2b.gain.setValueAtTime(0.44, t2b)
    gain2b.gain.exponentialRampToValueAtTime(0.001, t2b + 0.14)
    osc2b.connect(gain2b)
    gain2b.connect(ctx.destination)
    osc2b.start(t2b)
    osc2b.stop(t2b + 0.14)
  }

  /**
   * Randomly triggers one vocal reaction from the synthesized pet vocal pool:
   * "Pika Pika", "Pika!", "Pikachu!", "Pika Pika!"
   * with natural organic pitch and timing nuances.
   */
  public playRandomPetVocal(): void {
    const pitch = 0.96 + Math.random() * 0.1 // 0.96 to 1.06
    const choice = Math.floor(Math.random() * 4)
    switch (choice) {
      case 0:
        this.playPettingPika(pitch)
        break
      case 1:
        this.playPettingPikaSingle(pitch * 1.02)
        break
      case 2:
        this.playPettingPikachu(pitch)
        break
      case 3:
      default:
        this.playPettingPika(pitch * 1.04)
        break
    }
  }

  /** Curious high-pitched squeak / chirp */
  public playCurious(): void {
    const ctx = this.getContext()
    if (!ctx) return
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(620, now)
    osc.frequency.exponentialRampToValueAtTime(1260, now + 0.16)

    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.16)
  }

  /** Soft rhythmic purr / chirp for continuous petting */
  public playPurr(): void {
    const ctx = this.getContext()
    if (!ctx) return
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(360, now)
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.14)

    gain.gain.setValueAtTime(0.16, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.14)
  }

  /** Crisp comical cartoon slap / impact */
  public playSlap(): void {
    const ctx = this.getContext()
    if (!ctx) return
    const now = ctx.currentTime

    // Snappy mid-high impact
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(320, now)
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.15)

    gain.gain.setValueAtTime(0.35, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.15)
  }

  /** Wobbly comical dazed sound with vibrato */
  public playDizzy(): void {
    const ctx = this.getContext()
    if (!ctx) return
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(540, now)
    // Wobble down
    for (let i = 0; i < 6; i++) {
      const stepTime = now + i * 0.08
      const freq = 500 - i * 50 + (i % 2 === 0 ? 40 : -40)
      osc.frequency.setValueAtTime(freq, stepTime)
    }

    gain.gain.setValueAtTime(0.22, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.5)
  }

  /** Heavy cartoon combo impact burst */
  public playCombo(): void {
    const ctx = this.getContext()
    if (!ctx) return
    const now = ctx.currentTime

    // Chord + punch
    const chord = [340, 520, 780]
    chord.forEach((freq) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(freq, now)
      osc.frequency.exponentialRampToValueAtTime(freq * 0.4, now + 0.3)

      gain.gain.setValueAtTime(0.25, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.3)
    })
  }
}

export const SoundEffects = new SoundEffectsEngine()
