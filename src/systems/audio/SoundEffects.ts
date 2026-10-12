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
   */
  public playPikaPika(): void {
    const ctx = this.getContext()
    if (!ctx) return

    this.playPika()
    setTimeout(() => {
      this.playPika()
    }, 280)
  }

  /**
   * Synthesized sweet petting vocal reaction: "Pi-ka... pi-ka~"
   * Specially calibrated with pitch and tempo variations for gentle tactile feedback.
   */
  public playPettingPika(): void {
    const ctx = this.getContext()
    if (!ctx) return
    const now = ctx.currentTime

    // Subtle pitch variation between strokes for living character feel
    const pitchFactor = 0.95 + Math.random() * 0.16
    const isTriple = Math.random() < 0.28 // 28% chance of sweet 3-chirp "pika-pika-pika"

    const playChirp = (startTime: number, baseFreq: number, dropFreq: number, vol: number) => {
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'triangle'
      osc1.frequency.setValueAtTime(baseFreq * pitchFactor, startTime)
      osc1.frequency.exponentialRampToValueAtTime((baseFreq * 1.35) * pitchFactor, startTime + 0.07)

      gain1.gain.setValueAtTime(vol, startTime)
      gain1.gain.exponentialRampToValueAtTime(0.001, startTime + 0.07)

      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(startTime)
      osc1.stop(startTime + 0.07)

      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime((dropFreq * 1.15) * pitchFactor, startTime + 0.075)
      osc2.frequency.exponentialRampToValueAtTime(dropFreq * pitchFactor, startTime + 0.16)

      gain2.gain.setValueAtTime(vol * 1.1, startTime + 0.075)
      gain2.gain.exponentialRampToValueAtTime(0.001, startTime + 0.16)

      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(startTime + 0.075)
      osc2.stop(startTime + 0.16)
    }

    // First cheerful "Pi-ka"
    playChirp(now, 920, 560, 0.2)

    // Second cheerful "pi-ka~"
    playChirp(now + 0.22, 1020, 620, 0.24)

    // Optional third mini chirp
    if (isTriple) {
      playChirp(now + 0.44, 1140, 700, 0.22)
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
