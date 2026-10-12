import { Suspense, useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { PetScene } from './PetScene.tsx'
import { ARCameraBackground } from '../components/ar/ARCameraBackground.tsx'
import { ARControlOverlay } from '../components/ar/ARControlOverlay.tsx'
import type { AppMode, PetState, FoodType } from '../types'
import type { ProceduralAnimator } from '../systems/pet/ProceduralAnimator.ts'

interface PetSceneContainerProps {
  mode: AppMode
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
 * InteractiveGround
 * Invisible horizontal ground plane at Y = -0.69.
 * Handles 1-finger dragging for repositioning and floor tap-to-place anchoring.
 */
interface InteractiveGroundProps {
  onDragPoint: (point: THREE.Vector3) => void
  onTapPoint: (point: THREE.Vector3) => void
}

const InteractiveGround = ({
  onDragPoint,
  onTapPoint,
}: InteractiveGroundProps) => {
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null)

  return (
    <mesh
      position={[0, -0.69, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={(e) => {
        pointerDownRef.current = { x: e.clientX, y: e.clientY }
      }}
      onPointerMove={(e) => {
        if (!pointerDownRef.current) return
        const dx = e.clientX - pointerDownRef.current.x
        const dy = e.clientY - pointerDownRef.current.y
        if (Math.hypot(dx, dy) > 8) {
          onDragPoint(e.point)
        }
      }}
      onPointerUp={(e) => {
        if (!pointerDownRef.current) return
        const dx = e.clientX - pointerDownRef.current.x
        const dy = e.clientY - pointerDownRef.current.y
        const dist = Math.hypot(dx, dy)
        pointerDownRef.current = null
        if (dist <= 8) {
          onTapPoint(e.point)
        }
      }}
    >
      <planeGeometry args={[60, 60]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  )
}

/**
 * PetSceneContainer
 *
 * Full-viewport 3D interactive host supporting:
 * - Real camera background passthrough for AR mode
 * - Multi-touch gestures (Pinch-to-zoom, Twist-to-rotate, Drag-to-reposition)
 * - Ground plane raycasting & surface anchoring
 * - AR placement reticle & one-handed quick controls
 * - Responsive camera framing for normal 3D and AR modes
 */
export const PetSceneContainer = ({
  mode,
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
  const containerRef = useRef<HTMLDivElement>(null)

  // Relative Transform Offsets
  const [userOffset, setUserOffset] = useState<[number, number]>([0, 0])
  const [userRotation, setUserRotation] = useState<number>(0)
  const [scaleMultiplier, setScaleMultiplier] = useState<number>(1.0)
  const [isPlaced, setIsPlaced] = useState<boolean>(true)

  // Derive effective world transforms cleanly during render
  const baseScale = mode === 'ar' ? 0.017 : 0.034
  const minScale = mode === 'ar' ? 0.008 : 0.02
  const maxScale = mode === 'ar' ? 0.045 : 0.055
  const petScale = THREE.MathUtils.clamp(
    baseScale * scaleMultiplier,
    minScale,
    maxScale
  )

  const basePos = useMemo<[number, number, number]>(
    () => (mode === 'ar' ? [0, -0.69, -0.3] : [0, -0.69, 0]),
    [mode]
  )

  const petPosition: [number, number, number] = [
    THREE.MathUtils.clamp(basePos[0] + userOffset[0], -1.6, 1.6),
    -0.69,
    THREE.MathUtils.clamp(basePos[2] + userOffset[1], -2.2, 0.8),
  ]

  // Multi-Touch Event Handlers for 2-finger Pinch Zoom & Twist Rotation
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let startDist = 0
    let startAngle = 0

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const t1 = e.touches[0]
        const t2 = e.touches[1]
        startDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
        startAngle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX)
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && startDist > 0) {
        if (e.cancelable) e.preventDefault()
        const t1 = e.touches[0]
        const t2 = e.touches[1]
        const currDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
        const currAngle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX)

        const ratio = currDist / startDist
        startDist = currDist

        // Pinch-to-zoom
        setScaleMultiplier((prev) =>
          THREE.MathUtils.clamp(prev * ratio, 0.4, 2.5)
        )

        // Two-finger twist rotation
        const deltaAngle = currAngle - startAngle
        startAngle = currAngle
        setUserRotation((prev) => prev - deltaAngle)
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        startDist = 0
      }
    }

    container.addEventListener('touchstart', onTouchStart, { passive: true })
    container.addEventListener('touchmove', onTouchMove, { passive: false })
    container.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchmove', onTouchMove)
      container.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  // Ground drag repositioning
  const handleDragPoint = useCallback(
    (point: THREE.Vector3) => {
      setUserOffset([point.x - basePos[0], point.z - basePos[2]])
      if (mode === 'ar') {
        setIsPlaced(true)
      }
    },
    [basePos, mode]
  )

  // Ground tap anchoring
  const handleTapPoint = useCallback(
    (point: THREE.Vector3) => {
      if (mode === 'ar') {
        setUserOffset([point.x - basePos[0], point.z - basePos[2]])
        setIsPlaced(true)
      }
    },
    [basePos, mode]
  )

  // AR quick action handlers
  const handleRotateLeft = useCallback(() => {
    setUserRotation((prev) => prev + Math.PI / 4)
  }, [])

  const handleRotateRight = useCallback(() => {
    setUserRotation((prev) => prev - Math.PI / 4)
  }, [])

  const handleZoomIn = useCallback(() => {
    setScaleMultiplier((prev) => Math.min(2.5, prev * 1.2))
  }, [])

  const handleZoomOut = useCallback(() => {
    setScaleMultiplier((prev) => Math.max(0.4, prev * 0.8))
  }, [])

  const handleResetTransform = useCallback(() => {
    setScaleMultiplier(1.0)
    setUserOffset([0, 0])
    setUserRotation(0)
    setIsPlaced(true)
  }, [])

  const handleRelocate = useCallback(() => {
    setIsPlaced(false)
  }, [])

  return (
    <main
      ref={containerRef}
      className="scene-viewport"
      aria-label="3D pet viewport"
    >
      {/* Real Camera Feed for AR Mode */}
      <ARCameraBackground stream={cameraStream} />

      {/* AR Guidance & Floating Controls */}
      {mode === 'ar' && (
        <ARControlOverlay
          isPlaced={isPlaced}
          onRotateLeft={handleRotateLeft}
          onRotateRight={handleRotateRight}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleResetTransform}
          onRelocate={handleRelocate}
        />
      )}

      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          key={mode}
          shadows
          dpr={[1, 2]}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
          }}
          camera={{
            position: mode === 'ar' ? [0, 0.45, 2.5] : [0, 0.35, 3.4],
            fov: mode === 'ar' ? 48 : 38,
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
          <InteractiveGround
            onDragPoint={handleDragPoint}
            onTapPoint={handleTapPoint}
          />

          <PetScene
            state={state}
            animator={animator}
            voiceVolume={voiceVolume}
            food={food}
            foodProgress={foodProgress}
            soccerActive={soccerActive}
            petPosition={petPosition}
            petRotationY={userRotation}
            petScale={petScale}
            isAR={mode === 'ar'}
            isPlaced={isPlaced}
            onTapPet={onTapPet}
            onPlaceReticle={() => setIsPlaced(true)}
            onScoreSoccerGoal={onScoreSoccerGoal}
            onTriggerHeader={onTriggerHeader}
          />
        </Canvas>
      </Suspense>
    </main>
  )
}
