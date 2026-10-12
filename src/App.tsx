import { useState, useCallback, useMemo, useEffect } from 'react'
import type { AppMode, PetState, PetStats, FoodType } from './types'
import { AppShell } from './components/ui/AppShell.tsx'
import { StatusBar } from './components/ui/StatusBar.tsx'
import { ControlDock } from './components/controls/ControlDock.tsx'
import { PetSceneContainer } from './scenes/PetSceneContainer.tsx'
import { ProceduralAnimator } from './systems/pet/ProceduralAnimator.ts'
import { PetStateMachine } from './systems/pet/PetStateMachine.ts'
import { PetStatsManager } from './systems/stats/PetStatsManager.ts'
import { SoundEffects } from './systems/audio/SoundEffects.ts'
import { VoiceRepeater, type VoiceStatus } from './systems/voice/VoiceRepeater.ts'
import { ARSystem } from './systems/ar/ARSystem.ts'

export function App() {
  const [mode, setMode] = useState<AppMode>('normal')
  const [petState, setPetState] = useState<PetState>('IDLE')

  // Stats Manager (Loads from localStorage with fallback)
  const statsManager = useMemo(() => new PetStatsManager(), [])
  const [stats, setStats] = useState<PetStats>(() => statsManager.getStats())

  // State Machine and Procedural Animator
  const stateMachine = useMemo(() => new PetStateMachine(), [])
  const proceduralAnimator = useMemo(() => new ProceduralAnimator(), [])

  // Feeding State
  const [activeFood, setActiveFood] = useState<FoodType>(null)
  const [foodProgress, setFoodProgress] = useState(0)

  // Voice Repeater State
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle')
  const [voiceMessage, setVoiceMessage] = useState<string>('')
  const [voiceVolume, setVoiceVolume] = useState<number>(0)

  // Soccer Mini-Game State
  const [isSoccer, setIsSoccer] = useState(false)
  const [soccerScore, setSoccerScore] = useState(0)

  // AR Camera Stream State
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)

  // Synchronize State Machine with React state
  useEffect(() => {
    const unsubscribe = stateMachine.subscribe((next) => {
      setPetState(next)
    })
    return () => unsubscribe()
  }, [stateMachine])

  // Periodic subtle stat decay (every 45s)
  useEffect(() => {
    const timer = setInterval(() => {
      statsManager.tickDecay((updated) => setStats(updated))
    }, 45000)
    return () => clearInterval(timer)
  }, [statsManager])

  // Initialize Voice Repeater
  const voiceRepeater = useMemo(() => {
    return new VoiceRepeater({
      onStatusChange: (status, message) => {
        setVoiceStatus(status)
        setVoiceMessage(message || '')
        if (status === 'speaking') {
          stateMachine.setState('TALKING', true)
        } else if (status === 'idle') {
          if (stateMachine.getState() === 'TALKING') {
            stateMachine.setState('IDLE', true)
          }
        }
      },
      onVolumeChange: (vol) => {
        setVoiceVolume(vol)
      },
      onPlaybackComplete: () => {
        statsManager.talk((updated) => setStats(updated))
        stateMachine.setState('IDLE', true)
      },
    })
  }, [stateMachine, statsManager])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      voiceRepeater.stop()
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [voiceRepeater, cameraStream])

  // --- INTERACTION HANDLERS ---

  /** Tap / Pet Pikachu directly in 3D viewport */
  const handlePetTap = useCallback(() => {
    if (stateMachine.isLocked()) return
    SoundEffects.playTap()
    statsManager.pet((updated) => setStats(updated))
    stateMachine.triggerTemporaryState('HAPPY', 1200)
  }, [stateMachine, statsManager])

  /** Pet button (💖) */
  const handlePetAction = useCallback(() => {
    if (stateMachine.isLocked()) return
    SoundEffects.playPet()
    statsManager.pet((updated) => setStats(updated))
    stateMachine.triggerTemporaryState('PETTING', 1600)
  }, [stateMachine, statsManager])

  /** Hit button (💥) - P0 Sequence: Hit -> Fall -> Lie (2.5s) -> Stand -> Recover -> Idle */
  const handleHitAction = useCallback(() => {
    if (stateMachine.isLocked()) return

    SoundEffects.playHit()
    statsManager.hit((updated) => setStats(updated))

    stateMachine.triggerHitSequence(
      () => {
        SoundEffects.playFall()
      },
      () => {
        SoundEffects.playRecover()
      },
      () => {
        // Recovery complete
      }
    )
  }, [stateMachine, statsManager])

  /** Talk button (🎤) */
  const handleTalkAction = useCallback(() => {
    if (stateMachine.isLocked()) return

    if (voiceStatus === 'recording') {
      voiceRepeater.stopRecording()
    } else {
      void voiceRepeater.startListening(5)
    }
  }, [stateMachine, voiceStatus, voiceRepeater])

  /** Feed Milk (🥛) */
  const handleFeedMilk = useCallback(() => {
    if (stateMachine.isLocked() || activeFood !== null) return

    setActiveFood('milk')
    setFoodProgress(0)
    SoundEffects.playDrink()
    stateMachine.triggerTemporaryState('DRINKING', 2000, () => {
      setActiveFood(null)
      setFoodProgress(0)
    })

    statsManager.feedMilk((updated) => setStats(updated))

    // Animate consumption progress
    const startTime = performance.now()
    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(1, elapsed / 2000)
      setFoodProgress(progress)
      if (progress >= 1) clearInterval(interval)
    }, 50)
  }, [stateMachine, activeFood, statsManager])

  /** Feed Fish (🐟) */
  const handleFeedFish = useCallback(() => {
    if (stateMachine.isLocked() || activeFood !== null) return

    setActiveFood('fish')
    setFoodProgress(0)
    SoundEffects.playEat()
    stateMachine.triggerTemporaryState('EATING', 2200, () => {
      setActiveFood(null)
      setFoodProgress(0)
    })

    statsManager.feedFish((updated) => setStats(updated))

    // Animate consumption progress
    const startTime = performance.now()
    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(1, elapsed / 2200)
      setFoodProgress(progress)
      if (progress >= 1) clearInterval(interval)
    }, 50)
  }, [stateMachine, activeFood, statsManager])

  /** Soccer mini-game toggle (⚽) */
  const handleToggleSoccer = useCallback(() => {
    if (stateMachine.isLocked()) return
    setIsSoccer((prev) => !prev)
    if (!isSoccer) {
      setSoccerScore(0)
      SoundEffects.playTap()
    }
  }, [stateMachine, isSoccer])

  const handleScoreSoccerGoal = useCallback(() => {
    setSoccerScore((prev) => prev + 1)
    statsManager.soccerGoal((updated) => setStats(updated))
  }, [statsManager])

  const handleTriggerSoccerHeader = useCallback(() => {
    stateMachine.triggerTemporaryState('SOCCER', 600)
  }, [stateMachine])

  /** AR Camera mode toggle (📷) */
  const handleToggleAR = useCallback(async () => {
    if (mode === 'normal') {
      const result = await ARSystem.requestCameraStream()
      if (result.stream) {
        setCameraStream(result.stream)
        setMode('ar')
      } else {
        alert(result.error || 'AR camera is unavailable on this device.')
      }
    } else {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop())
        setCameraStream(null)
      }
      setMode('normal')
    }
  }, [mode, cameraStream])

  return (
    <AppShell>
      <StatusBar
        mode={mode}
        petState={petState}
        stats={stats}
        level={statsManager.getLevel()}
        isSoccer={isSoccer}
        soccerScore={soccerScore}
      />

      <PetSceneContainer
        mode={mode}
        state={petState}
        animator={proceduralAnimator}
        voiceVolume={voiceVolume}
        food={activeFood}
        foodProgress={foodProgress}
        soccerActive={isSoccer}
        cameraStream={cameraStream}
        onTapPet={handlePetTap}
        onScoreSoccerGoal={handleScoreSoccerGoal}
        onTriggerHeader={handleTriggerSoccerHeader}
      />

      <ControlDock
        mode={mode}
        petState={petState}
        voiceStatus={voiceStatus}
        voiceMessage={voiceMessage}
        isSoccer={isSoccer}
        onToggleMode={handleToggleAR}
        onTalk={handleTalkAction}
        onPet={handlePetAction}
        onHit={handleHitAction}
        onFeedMilk={handleFeedMilk}
        onFeedFish={handleFeedFish}
        onToggleSoccer={handleToggleSoccer}
      />
    </AppShell>
  )
}

export default App
