import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { PetScene } from './PetScene.tsx'
import type { AppMode } from '../types'
import type { PetAnimationController, PetInteractionController } from '../systems/pet'

interface PetSceneContainerProps {
  mode: AppMode
  animationController?: PetAnimationController
  interactionController?: PetInteractionController
  onTap?: () => void
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
 * Fullscreen viewport host for the Three.js / React Three Fiber canvas.
 * Manages responsive camera positioning, shadow maps, and mobile DPR limits.
 */
export const PetSceneContainer = ({
  animationController,
  interactionController,
  onTap,
}: PetSceneContainerProps) => {
  return (
    <main className="scene-viewport" aria-label="3D pet viewport">
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
          style={{ width: '100%', height: '100%' }}
        >
          <PetScene
            animationController={animationController}
            interactionController={interactionController}
            onTap={onTap}
          />
        </Canvas>
      </Suspense>
    </main>
  )
}
