import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { PetState } from '../../types'
import type { ProceduralAnimator } from '../../systems/pet/ProceduralAnimator.ts'

interface PikachuModelProps {
  state: PetState
  animator: ProceduralAnimator
  voiceVolume?: number
  position?: [number, number, number]
  rotationY?: number
  scale?: number
  onTap?: () => void
}

/**
 * PikachuModel
 *
 * Renders the 3D Pikachu GLB model.
 * Outer group applies world transform (AR surface placement, drag position, rotation, scale).
 * Inner group is driven by the ProceduralAnimator (living idle, facial blinking, mouth sync,
 * and P0 Hit -> Fall -> Lie -> Stand -> Recover sequence).
 */
export const PikachuModel = ({
  state,
  animator,
  voiceVolume = 0,
  position = [0, -0.69, 0],
  rotationY = 0,
  scale = 0.034,
  onTap,
}: PikachuModelProps) => {
  const rootGroupRef = useRef<THREE.Group>(null)
  const { scene } = useGLTF('/models/pikachu.glb')
  const elapsedTimeRef = useRef(0)

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
          onTap?.()
        }}
      >
        <primitive object={scene} />
      </group>
    </group>
  )
}

useGLTF.preload('/models/pikachu.glb')
