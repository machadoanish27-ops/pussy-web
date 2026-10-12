import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import type { AppMode, PetState, PetStats, FoodType, HitLocation, CartoonEffectType } from './types'
import { AppShell } from './components/ui/AppShell.tsx'
import { StatusBar } from './components/ui/StatusBar.tsx'
import { ControlDock } from './components/controls/ControlDock.tsx'
import { PetSceneContainer } from './scenes/PetSceneContainer.tsx'
import type { ActiveDamageEffect } from './components/pet/CartoonDamageOverlay.tsx'
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

  // Cartoon Damage & Temporary Effects
  const [damageEffects, setDamageEffects] = useState<ActiveDamageEffect[]>([])

  // Interaction & Combo Tracking Refs
  const hitComboRef = useRef(0)
  const lastHitTimeRef = useRef(0)
  const lastPetTimeRef = useRef(0)
  const lastInteractionTimeRef = useRef(0)
  const hitCountsByLocationRef = useRef<Record<HitLocation, number>>({
    HEAD: 0,
    LEFT_CHEEK: 0,
    RIGHT_CHEEK: 0,
    EYES: 0,
    BODY: 0,
    EAR: 0,
    TAIL: 0,
  })

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

  // Automatic cleanup of expired cartoon damage effects & idle vocalization
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now()

      // 1. Clean expired damage effects
      setDamageEffects((prev) =>
        prev.filter((fx) => now - fx.createdAt < fx.durationMs)
      )

      // 2. Autonomous cute idle vocalization after 35–80s of inactivity
      const isEngaged =
        petState !== 'IDLE' ||
        now - lastInteractionTimeRef.current < 35000 ||
        voiceStatus !== 'idle' ||
        isSoccer

      proceduralAnimator.checkIdleVocalization(1.0, isEngaged, () => {
        if (Math.random() < 0.5) {
          SoundEffects.playPika()
        } else {
          SoundEffects.playPikaPika()
        }
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [petState, voiceStatus, isSoccer, proceduralAnimator])

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

  // --- HELPER: SPAWN CARTOON EFFECT ---
  const spawnDamageEffect = useCallback(
    (type: CartoonEffectType, durationMs: number = 4000) => {
      const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      setDamageEffects((prev) => [
        ...prev.filter((e) => e.type !== type), // replace existing effect of same type
        {
          id,
          type,
          createdAt: Date.now(),
          durationMs,
        },
      ])
    },
    []
  )

  // --- INTERACTION HANDLERS ---

  /** Location-Aware Hit Detection & Combo Escalation */
  const handleHitLocation = useCallback(
    (location: HitLocation) => {
      if (stateMachine.isLocked()) return

      const now = Date.now()
      lastInteractionTimeRef.current = now

      // 1. Combo window check (within 2.2s)
      const isCombo = now - lastHitTimeRef.current < 2200
      const nextCombo = isCombo ? hitComboRef.current + 1 : 1
      hitComboRef.current = nextCombo
      lastHitTimeRef.current = now

      // 2. Increment location strike counts
      hitCountsByLocationRef.current[location] =
        (hitCountsByLocationRef.current[location] || 0) + 1

      // 3. Trigger procedural recoil on animator
      proceduralAnimator.triggerLocationHit(location, nextCombo)

      // 4. Synthesized Cartoon Audio
      if (nextCombo === 1) {
        SoundEffects.playSlap()
      } else {
        SoundEffects.playCombo()
      }
      if (location === 'HEAD' || location === 'EYES') {
        SoundEffects.playDizzy()
      }

      // 5. Spawn Cartoon Bandages & Visual Effects on repeated regional hits
      if (location === 'HEAD' && hitCountsByLocationRef.current.HEAD >= 2) {
        spawnDamageEffect('BANDAGE_HEAD', 5000)
      } else if (
        location === 'LEFT_CHEEK' &&
        hitCountsByLocationRef.current.LEFT_CHEEK >= 2
      ) {
        spawnDamageEffect('BANDAGE_LEFT', 5000)
      } else if (
        location === 'RIGHT_CHEEK' &&
        hitCountsByLocationRef.current.RIGHT_CHEEK >= 2
      ) {
        spawnDamageEffect('BANDAGE_RIGHT', 5000)
      }

      // Combo dizzy stars
      if (nextCombo >= 2) {
        spawnDamageEffect('DIZZY_STARS', 3500)
      }

      // 6. Deduct stats
      statsManager.hit((updated) => setStats(updated))

      // 7. Threshold check: Combo >= 3 triggers full Fall -> Lie (2.5s) -> Stand -> Recover
      if (nextCombo >= 3) {
        hitComboRef.current = 0
        hitCountsByLocationRef.current = {
          HEAD: 0,
          LEFT_CHEEK: 0,
          RIGHT_CHEEK: 0,
          EYES: 0,
          BODY: 0,
          EAR: 0,
          TAIL: 0,
        }

        stateMachine.triggerHitSequence(
          () => {
            SoundEffects.playFall()
          },
          () => {
            SoundEffects.playRecover()
          },
          () => {
            // Recovery complete: clean up damage effects
            setDamageEffects([])
            proceduralAnimator.clearDamageEffects()
          }
        )
      } else {
        // Single or light hit: short cartoon recoil
        stateMachine.triggerTemporaryState('HIT', 450)
      }
    },
    [stateMachine, statsManager, proceduralAnimator, spawnDamageEffect]
  )

  /** Continuous Vertical Petting Gesture */
  const handlePetSwipe = useCallback(() => {
    if (stateMachine.isLocked()) return

    const now = Date.now()
    lastInteractionTimeRef.current = now

    // Throttle during continuous swiping
    if (now - lastPetTimeRef.current < 450) return
    lastPetTimeRef.current = now

    SoundEffects.playPurr()
    statsManager.pet((updated) => setStats(updated))
    stateMachine.triggerTemporaryState('PETTING', 1200)

    // Spawn floating heart particle
    spawnDamageEffect('HEART_FLOAT', 1500)
  }, [stateMachine, statsManager, spawnDamageEffect])

  /** Fallback Pet Tap */
  const handlePetTap = useCallback(() => {
    handlePetSwipe()
  }, [handlePetSwipe])

  /** Pet button (💖) in Dock */
  const handlePetAction = useCallback(() => {
    handlePetSwipe()
  }, [handlePetSwipe])

  /** Hit button (💥) in Dock */
  const handleHitAction = useCallback(() => {
    handleHitLocation('HEAD')
  }, [handleHitLocation])

  /** Talk button (🎤) */
  const handleTalkAction = useCallback(() => {
    if (stateMachine.isLocked()) return
    lastInteractionTimeRef.current = Date.now()

    if (voiceStatus === 'recording') {
      voiceRepeater.stopRecording()
    } else {
      void voiceRepeater.startListening(5)
    }
  }, [stateMachine, voiceStatus, voiceRepeater])

  /** Feed Milk (🥛) */
  const handleFeedMilk = useCallback(() => {
    if (stateMachine.isLocked() || activeFood !== null) return
    lastInteractionTimeRef.current = Date.now()

    setActiveFood('milk')
    setFoodProgress(0)
    SoundEffects.playDrink()
    stateMachine.triggerTemporaryState('DRINKING', 2200, () => {
      setActiveFood(null)
      setFoodProgress(0)
    })

    statsManager.feedMilk((updated) => setStats(updated))

    // Animate consumption progress
    const startTime = performance.now()
    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(1, elapsed / 2200)
      setFoodProgress(progress)
      if (progress >= 1) clearInterval(interval)
    }, 50)
  }, [stateMachine, activeFood, statsManager])

  /** Feed Fish (🐟) */
  const handleFeedFish = useCallback(() => {
    if (stateMachine.isLocked() || activeFood !== null) return
    lastInteractionTimeRef.current = Date.now()

    setActiveFood('fish')
    setFoodProgress(0)
    SoundEffects.playEat()
    stateMachine.triggerTemporaryState('EATING', 2400, () => {
      setActiveFood(null)
      setFoodProgress(0)
    })

    statsManager.feedFish((updated) => setStats(updated))

    // Animate consumption progress
    const startTime = performance.now()
    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(1, elapsed / 2400)
      setFoodProgress(progress)
      if (progress >= 1) clearInterval(interval)
    }, 50)
  }, [stateMachine, activeFood, statsManager])

  /** Soccer mini-game toggle (⚽) */
  const handleToggleSoccer = useCallback(() => {
    if (stateMachine.isLocked()) return
    lastInteractionTimeRef.current = Date.now()
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
    lastInteractionTimeRef.current = Date.now()
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
        damageEffects={damageEffects}
        onHitLocation={handleHitLocation}
        onPetSwipe={handlePetSwipe}
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
