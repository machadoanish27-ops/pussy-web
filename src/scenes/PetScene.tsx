import { ContactShadows } from '@react-three/drei'
import { PikachuModel } from '../components/pet/PikachuModel.tsx'
import { FoodProps } from '../components/pet/FoodProps.tsx'
import { SoccerFieldProps } from '../components/pet/SoccerFieldProps.tsx'
import { PlacementReticle } from '../components/ar/PlacementReticle.tsx'
import type { PetState, FoodType } from '../types'
import type { ProceduralAnimator } from '../systems/pet/ProceduralAnimator.ts'

interface PetSceneProps {
  state: PetState
  animator: ProceduralAnimator
  voiceVolume?: number
  food: FoodType
  foodProgress: number
  soccerActive: boolean
  petPosition: [number, number, number]
  petRotationY: number
  petScale: number
  isAR: boolean
  isPlaced: boolean
  onTapPet?: () => void
  onPlaceReticle?: () => void
  onScoreSoccerGoal?: () => void
  onTriggerHeader?: () => void
}

/**
 * PetScene
 *
 * Staging 3D environment coordinating Pikachu, Food Props,
 * Soccer Mini-Game Arena, AR Surface Placement Reticle, lighting,
 * and ground contact shadows anchored to Pikachu.
 */
export const PetScene = ({
  state,
  animator,
  voiceVolume = 0,
  food,
  foodProgress,
  soccerActive,
  petPosition,
  petRotationY,
  petScale,
  isAR,
  isPlaced,
  onTapPet,
  onPlaceReticle,
  onScoreSoccerGoal,
  onTriggerHeader,
}: PetSceneProps) => {
  return (
    <>
      {/* Balanced 3-Point Lighting */}
      <ambientLight intensity={isAR ? 1.3 : 1.1} color="#ffffff" />

      <directionalLight
        position={[2.5, 4.0, 3.0]}
        intensity={isAR ? 1.8 : 1.7}
        color="#fffbf0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0001}
      />

      <directionalLight
        position={[-2.0, 3.0, -2.5]}
        intensity={0.65}
        color="#c7d2fe"
      />

      {/* AR Surface Placement Reticle */}
      <PlacementReticle
        position={petPosition}
        visible={isAR && !isPlaced}
        onPlace={onPlaceReticle}
      />

      {/* 3D Pikachu Virtual Pet */}
      <PikachuModel
        state={state}
        animator={animator}
        voiceVolume={voiceVolume}
        position={petPosition}
        rotationY={petRotationY}
        scale={petScale}
        onTap={onTapPet}
      />

      {/* Interactive 3D Food Props (Milk Bowl / Fish) */}
      <FoodProps
        food={food}
        progress={foodProgress}
        petPosition={petPosition}
        petRotationY={petRotationY}
      />

      {/* 3D Head Soccer Arena & Ball */}
      <SoccerFieldProps
        active={soccerActive}
        onScoreGoal={() => onScoreSoccerGoal?.()}
        onTriggerHeader={() => onTriggerHeader?.()}
      />

      {/* Ground Contact Shadow (tracks Pikachu's world position and size) */}
      <ContactShadows
        position={[petPosition[0], -0.689, petPosition[2]]}
        opacity={isAR ? 0.75 : 0.65}
        scale={Math.max(1.5, 3.4 * (petScale / 0.034))}
        blur={1.4}
        far={1.5}
        color="#030712"
      />
    </>
  )
}
