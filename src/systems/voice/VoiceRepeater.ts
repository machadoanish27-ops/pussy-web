import { SoundEffects } from '../audio/SoundEffects.ts'

export type VoiceStatus =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'processing'
  | 'speaking'
  | 'denied'
  | 'unsupported'

export interface VoiceRepeaterCallbacks {
  onStatusChange: (status: VoiceStatus, message?: string) => void
  onVolumeChange?: (volume: number) => void
  onPlaybackComplete?: () => void
}

/**
 * VoiceRepeater
 *
 * Captures user speech using browser MediaRecorder, applies a playful
 * pitch-shifted Web Audio playback, and feeds voice volume envelopes
 * to pet facial/head animations.
 */
export class VoiceRepeater {
  private status: VoiceStatus = 'idle'
  private mediaStream: MediaStream | null = null
  private mediaRecorder: MediaRecorder | null = null
  private recordedChunks: Blob[] = []
  private audioCtx: AudioContext | null = null
  private currentSource: AudioBufferSourceNode | null = null
  private maxDurationTimer: number | null = null
  private callbacks: VoiceRepeaterCallbacks

  constructor(callbacks: VoiceRepeaterCallbacks) {
    this.callbacks = callbacks
  }

  public getStatus(): VoiceStatus {
    return this.status
  }

  private setStatus(status: VoiceStatus, message?: string): void {
    this.status = status
    this.callbacks.onStatusChange(status, message)
  }

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.audioCtx = new AudioCtx()
    }
    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume()
    }
    return this.audioCtx
  }

  public async startListening(maxSeconds: number = 5): Promise<void> {
    if (this.status === 'recording' || this.status === 'speaking') {
      this.stop()
      return
    }

    if (typeof navigator.mediaDevices?.getUserMedia !== 'function') {
      this.setStatus('unsupported', 'Microphone not supported on this browser')
      return
    }

    try {
      this.setStatus('requesting', 'Requesting microphone permission...')
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.recordedChunks = []

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : ''

      this.mediaRecorder = mimeType
        ? new MediaRecorder(this.mediaStream, { mimeType })
        : new MediaRecorder(this.mediaStream)

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data)
        }
      }

      this.mediaRecorder.onstop = () => {
        void this.processAndRepeat()
      }

      this.mediaRecorder.start()
      SoundEffects.playRecordBeep(true)
      this.setStatus('recording', 'Listening... speak to Pikachu!')

      // Auto stop after max seconds
      this.maxDurationTimer = window.setTimeout(() => {
        this.stopRecording()
      }, maxSeconds * 1000)
    } catch (err: unknown) {
      const error = err as Error
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        this.setStatus('denied', 'Microphone access was denied')
      } else {
        this.setStatus('unsupported', `Mic error: ${error.message || 'unknown'}`)
      }
    }
  }

  public stopRecording(): void {
    if (this.maxDurationTimer !== null) {
      clearTimeout(this.maxDurationTimer)
      this.maxDurationTimer = null
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      SoundEffects.playRecordBeep(false)
      this.mediaRecorder.stop()
      this.setStatus('processing', 'Pikachu is getting ready to repeat...')
    }

    // Clean up tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop())
      this.mediaStream = null
    }
  }

  private async processAndRepeat(): Promise<void> {
    if (this.recordedChunks.length === 0) {
      this.setStatus('idle')
      return
    }

    try {
      const audioBlob = new Blob(this.recordedChunks, {
        type: this.mediaRecorder?.mimeType || 'audio/webm',
      })
      const arrayBuffer = await audioBlob.arrayBuffer()
      const ctx = this.getAudioContext()

      const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
      // Attentive pause (280ms) keeping the listening/curious posture before starting speech
      await new Promise((resolve) => setTimeout(resolve, 280))
      if (this.status === 'processing') {
        this.playPitchShifted(audioBuffer)
      }
    } catch {
      this.setStatus('idle', 'Could not process audio')
    }
  }

  private playPitchShifted(buffer: AudioBuffer): void {
    const ctx = this.getAudioContext()
    const source = ctx.createBufferSource()
    source.buffer = buffer

    // Talking-Tom style playful chipmunk pitch increase
    source.playbackRate.value = 1.35

    // Gain node for clean volume
    const gain = ctx.createGain()
    gain.gain.value = SoundEffects.isMuted() ? 0 : 1.2

    // Analyser node for mouth animation reactive envelope
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 64

    source.connect(analyser)
    analyser.connect(gain)
    gain.connect(ctx.destination)

    this.currentSource = source
    this.setStatus('speaking', 'Pikachu is repeating!')

    // Volume envelope polling for procedural mouth/ear bounces
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    let animId: number

    const trackVolume = () => {
      if (this.status !== 'speaking') return
      analyser.getByteFrequencyData(dataArray)
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i]
      }
      const avg = sum / dataArray.length / 255
      this.callbacks.onVolumeChange?.(avg)
      animId = requestAnimationFrame(trackVolume)
    }
    trackVolume()

    source.onended = () => {
      cancelAnimationFrame(animId)
      this.callbacks.onVolumeChange?.(0)
      this.currentSource = null
      this.setStatus('idle')
      this.callbacks.onPlaybackComplete?.()
    }

    source.start(0)
  }

  public stop(): void {
    if (this.maxDurationTimer !== null) {
      clearTimeout(this.maxDurationTimer)
      this.maxDurationTimer = null
    }
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop()
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop())
      this.mediaStream = null
    }
    if (this.currentSource) {
      try {
        this.currentSource.stop()
      } catch {
        // already stopped
      }
      this.currentSource = null
    }
    this.setStatus('idle')
  }
}
