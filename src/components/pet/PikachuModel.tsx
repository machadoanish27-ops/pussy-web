import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import type * as THREE from 'three'
import type { PetInteractionController } from '../../systems/pet'

interface PikachuModelProps {
  interactionController?: PetInteractionController
  onTap?: () => void
}

/**
 * PikachuModel
 *
 * Loads public/models/pikachu.glb.
 * Ensures shadows are cast/received on all skinned meshes.
 * Accommodates the rigged skeleton while gracefully holding a static IDLE pose (0 clips in GLB).
 * Connects to PetInteractionController to respond to touch/pointer interaction with a playful bounce.
 */
export const PikachuModel = ({ interactionController, onTap }: PikachuModelProps) => {
  const modelRef = useRef<THREE.Group>(null)
  const { scene } = useGLTF('/models/pikachu.glb')

  useEffect(() => {
    scene.traverse((node) => {
      // Configure mesh shadow rendering
      const mesh = node as THREE.Mesh
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })
  }, [scene])

  useFrame(() => {
    if (!modelRef.current) return

    const baseScale = 0.044
    if (interactionController) {
      const reaction = interactionController.getVisualReaction()
      modelRef.current.scale.set(
        baseScale * reaction.scaleModifier[0],
        baseScale * reaction.scaleModifier[1],
        baseScale * reaction.scaleModifier[2]
      )
      modelRef.current.rotation.y = reaction.rotationNudge[1]
    } else {
      modelRef.current.scale.set(baseScale, baseScale, baseScale)
      modelRef.current.rotation.y = 0
    }
  })

  return (
    <group
      position={[0, -0.7, 0]}
      onPointerDown={(e) => {
        e.stopPropagation()
        interactionController?.handleTap()
        onTap?.()
      }}
    >
      <primitive ref={modelRef} object={scene} />
    </group>
  )
}

useGLTF.preload('/models/pikachu.glb')
