import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { PetState, HitLocation } from '../../types'
import type { ProceduralAnimator } from '../../systems/pet/ProceduralAnimator.ts'
import { SoundEffects } from '../../systems/audio/SoundEffects.ts'

interface PikachuModelProps {
  state: PetState
  animator: ProceduralAnimator
  voiceVolume?: number
  position?: [number, number, number]
  rotationY?: number
  scale?: number
  onHitLocation?: (location: HitLocation) => void
  onPetSwipe?: () => void
  onTap?: () => void
}

/**
 * PikachuModel
 *
 * Renders the 3D Pikachu GLB model.
 * Outer group applies world transform (AR surface placement, drag position, rotation, scale).
 * Inner group is driven by ProceduralAnimator (living idle, facial blinking, mouth sync,
 * location-aware cartoon reactions, and P0 Hit -> Fall -> Lie -> Stand -> Recover sequence).
 *
 * Handles location-aware hit detection & vertical swipe gesture recognition for petting.
 */
export const PikachuModel = ({
  state,
  animator,
  voiceVolume = 0,
  position = [0, -0.69, 0],
  rotationY = 0,
  scale = 0.034,
  onHitLocation,
  onPetSwipe,
  onTap,
}: PikachuModelProps) => {
  const rootGroupRef = useRef<THREE.Group>(null)
  const { scene } = useGLTF('/models/pikachu.glb')
  const elapsedTimeRef = useRef(0)

  // Pointer gesture tracking refs
  const pointerStartRef = useRef<{
    x: number
    y: number
    time: number
    location: HitLocation
    lastY: number
    lastDir: number
    reversals: number
    isPetting: boolean
    petSwipeTriggered: boolean
  } | null>(null)

  // Configure shadows and bind skeleton to procedural animator
  useEffect(() => {
    scene.traverse((node) => {
      const mesh = node as THREE.Mesh
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })
    animator.bindModel(scene)
  }, [scene, animator])

  useFrame((_, delta) => {
    if (!rootGroupRef.current) return
    elapsedTimeRef.current += delta

    animator.update(
      rootGroupRef.current,
      state,
      delta,
      elapsedTimeRef.current,
      voiceVolume
    )
  })

  // Detect approximate hit region from raycast intersection
  const classifyHitLocation = (
    objectName: string,
    point: THREE.Vector3
  ): HitLocation => {
    if (objectName === 'Object_9') return 'EYES'
    if (objectName === 'Object_8') return 'HEAD'

    // Model space relative coordinates
    const scaleFactor = scale / 0.034
    const relX = (point.x - position[0]) / scaleFactor
    const relY = (point.y - position[1]) / scaleFactor
    const relZ = (point.z - position[2]) / scaleFactor

    if (objectName === 'Object_7') {
      return relX < 0 ? 'LEFT_CHEEK' : 'RIGHT_CHEEK'
    }

    if (relY > 1.15) return 'EAR'
    if (relY > 0.88) return 'HEAD'
    if (relY > 0.72 && relZ > 0.12) return 'FOREHEAD'
    if (Math.abs(relX) > 0.38) return 'SIDES'
    if (relZ < -0.15 && relY < 0.7) return 'TAIL'

    return 'BODY'
  }

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      scale={[scale, scale, scale]}
    >
      <group
        ref={rootGroupRef}
        onPointerDown={(e) => {
          e.stopPropagation()
          // Synchronously unlock/resume Web Audio context on user gesture for iOS Safari
          SoundEffects.ensureAudioUnlocked()

          const loc = classifyHitLocation(e.object.name, e.point)
          pointerStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            time: Date.now(),
            location: loc,
            lastY: e.clientY,
            lastDir: 0,
            reversals: 0,
            isPetting: false,
            petSwipeTriggered: false,
          }
        }}
        onPointerMove={(e) => {
          if (!pointerStartRef.current) return
          e.stopPropagation()

          const tracker = pointerStartRef.current
          const totalDy = e.clientY - tracker.y
          const dy = e.clientY - tracker.lastY

          // 1. Natural top-to-bottom sliding stroke (> 20px downward)
          if (totalDy > 20 && !tracker.isPetting) {
            tracker.isPetting = true
            if (!tracker.petSwipeTriggered) {
              tracker.petSwipeTriggered = true
              onPetSwipe?.()
            }
            const yFactor = THREE.MathUtils.clamp(totalDy / 80, -1, 1)
            animator.setPettingFollow(yFactor, true)
          }

          // 2. Continuous stroke & reversal detection (rubbing up/down)
          if (Math.abs(dy) > 10) {
            const currentDir = dy > 0 ? 1 : -1
            if (tracker.lastDir !== 0 && tracker.lastDir !== currentDir) {
              tracker.reversals++
            }
            tracker.lastDir = currentDir
            tracker.lastY = e.clientY

            if (tracker.reversals >= 2) {
              tracker.isPetting = true
              if (!tracker.petSwipeTriggered) {
                tracker.petSwipeTriggered = true
                onPetSwipe?.()
              }
              const yFactor = THREE.MathUtils.clamp(dy / 40, -1, 1)
              animator.setPettingFollow(yFactor, true)
            }
          }
        }}
        onPointerUp={(e) => {
          if (!pointerStartRef.current) return
          e.stopPropagation()

          const tracker = pointerStartRef.current
          const wasPetting = tracker.isPetting
          const dist = Math.hypot(
            e.clientX - tracker.x,
            e.clientY - tracker.y
          )
          const duration = Date.now() - tracker.time
          pointerStartRef.current = null
          animator.setPettingFollow(0, false)

          // If not a petting swipe and tap was crisp, trigger deliberate location hit!
          if (!wasPetting && dist < 18 && duration < 380) {
            if (onHitLocation) {
              onHitLocation(tracker.location)
            } else {
              onTap?.()
            }
          }
        }}
        onPointerCancel={() => {
          pointerStartRef.current = null
          animator.setPettingFollow(0, false)
        }}
      >
        {/* Generous touch proxy mesh enclosing Pikachu's head and body */}
        <mesh visible={false} position={[0, 0.65, 0]}>
          <cylinderGeometry args={[0.52, 0.46, 1.35, 16]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
        <primitive object={scene} />
      </group>
    </group>
  )
}

useGLTF.preload('/models/pikachu.glb')
