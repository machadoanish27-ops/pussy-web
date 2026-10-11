import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { PetScene } from './PetScene.tsx'
import { ARCameraBackground } from '../components/ar/ARCameraBackground.tsx'
import type { PetState, FoodType } from '../types'
import type { ProceduralAnimator } from '../systems/pet/ProceduralAnimator.ts'

interface PetSceneContainerProps {
  state: PetState
  animator: ProceduralAnimator
  voiceVolume?: number
  food: FoodType
  foodProgress: number
  soccerActive: boolean
  cameraStream: MediaStream | null
  onTapPet?: () => void
  onScoreSoccerGoal?: () => void
  onTriggerHeader?: () => void
}

const LoadingFallback = () => (
  <div className="scene-foundation-placeholder">
    <div className="foundation-icon-circle">
      <span style={{ fontSize: '24px' }}>⚡</span>
    </div>
    <span className="foundation-tag">Loading 3D Pet...</span>
  </div>
)

/**
 * PetSceneContainer
 *
 * Viewport container supporting:
 * - Real camera stream background for AR Mode
 * - R3F Canvas with mobile-optimized DPR limits and lighting
 * - Multi-mode 3D Pet staging (Normal, Feeding, Soccer, AR)
 */
export const PetSceneContainer = ({
  state,
  animator,
  voiceVolume = 0,
  food,
  foodProgress,
  soccerActive,
  cameraStream,
  onTapPet,
  onScoreSoccerGoal,
  onTriggerHeader,
}: PetSceneContainerProps) => {
  return (
    <main className="scene-viewport" aria-label="3D pet viewport">
      {/* Camera Video Stream for AR Mode */}
      <ARCameraBackground stream={cameraStream} />

      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
          }}
          camera={{
            position: [0, 0.45, 2.8],
            fov: 42,
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 1,
          }}
        >
          <PetScene
            state={state}
            animator={animator}
            voiceVolume={voiceVolume}
            food={food}
            foodProgress={foodProgress}
            soccerActive={soccerActive}
            onTapPet={onTapPet}
            onScoreSoccerGoal={onScoreSoccerGoal}
            onTriggerHeader={onTriggerHeader}
          />
        </Canvas>
      </Suspense>
    </main>
  )
}
