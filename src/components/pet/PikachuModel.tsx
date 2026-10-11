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
  onTap?: () => void
}

/**
 * PikachuModel
 *
 * Renders the 3D Pikachu GLB model.
 * Connects the 49-bone skeleton and root group to the ProceduralAnimator,
 * driving living idle behavior, talking reactions, happy petting,
 * and the complete P0 Hit -> Fall -> Lie -> Stand -> Recover cycle.
 */
export const PikachuModel = ({
  state,
  animator,
  voiceVolume = 0,
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
      ref={rootGroupRef}
      position={[0, -0.7, 0]}
      onPointerDown={(e) => {
        e.stopPropagation()
        onTap?.()
      }}
    >
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload('/models/pikachu.glb')
