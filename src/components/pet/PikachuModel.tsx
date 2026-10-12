import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { PetState, HitLocation } from '../../types'
import type { ProceduralAnimator } from '../../systems/pet/ProceduralAnimator.ts'

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

    if (relY > 1.2) return 'EAR'
    if (relY > 0.8) return 'HEAD'
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
          }
        }}
        onPointerMove={(e) => {
          if (!pointerStartRef.current) return
          e.stopPropagation()

          const tracker = pointerStartRef.current
          const dy = e.clientY - tracker.lastY

          // Detect vertical swipe reversals for petting gesture
          if (Math.abs(dy) > 12) {
            const currentDir = dy > 0 ? 1 : -1
            if (tracker.lastDir !== 0 && tracker.lastDir !== currentDir) {
              tracker.reversals++
            }
            tracker.lastDir = currentDir
            tracker.lastY = e.clientY

            // 2 reversals (up -> down -> up) triggers continuous petting!
            if (tracker.reversals >= 2) {
              tracker.isPetting = true
              onPetSwipe?.()
            }
          }
        }}
        onPointerUp={(e) => {
          if (!pointerStartRef.current) return
          e.stopPropagation()

          const tracker = pointerStartRef.current
          const dist = Math.hypot(
            e.clientX - tracker.x,
            e.clientY - tracker.y
          )
          const duration = Date.now() - tracker.time
          pointerStartRef.current = null

          // If not a petting swipe and tap was quick, trigger deliberate location hit!
          if (!tracker.isPetting && dist < 16 && duration < 400) {
            if (onHitLocation) {
              onHitLocation(tracker.location)
            } else {
              onTap?.()
            }
          }
        }}
      >
        <primitive object={scene} />
      </group>
    </group>
  )
}

useGLTF.preload('/models/pikachu.glb')
