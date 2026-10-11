import { useFrame } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import { PikachuModel } from '../components/pet/PikachuModel.tsx'
import type { PetAnimationController, PetInteractionController } from '../systems/pet'

interface PetSceneProps {
  animationController?: PetAnimationController
  interactionController?: PetInteractionController
  onTap?: () => void
}

/**
 * PetScene
 *
 * Primary 3D staging environment:
 * - Balanced, mobile-optimized lighting (ambient + key + rim)
 * - Grounding contact shadows without heavy cascaded shadow maps
 * - Updates animation mixer via PetAnimationController on each frame
 * - Hosts PikachuModel
 */
export const PetScene = ({
  animationController,
  interactionController,
  onTap,
}: PetSceneProps) => {
  useFrame((_, delta) => {
    animationController?.update(delta)
  })

  return (
    <>
      {/* Ambient Fill Light */}
      <ambientLight intensity={1.0} color="#ffffff" />

      {/* Key Directional Light */}
      <directionalLight
        position={[2.5, 4.0, 3.0]}
        intensity={1.8}
        color="#fffbf0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0001}
      />

      {/* Rim / Back Light for silhouette definition */}
      <directionalLight
        position={[-2.0, 3.0, -2.5]}
        intensity={0.6}
        color="#c7d2fe"
      />

      {/* 3D Pet Character */}
      <PikachuModel interactionController={interactionController} onTap={onTap} />

      {/* Soft Contact Shadow beneath feet */}
      <ContactShadows
        position={[0, -0.69, 0]}
        opacity={0.65}
        scale={3.2}
        blur={1.4}
        far={1.5}
        color="#050608"
      />
    </>
  )
}
