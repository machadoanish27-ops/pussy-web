import { ContactShadows } from '@react-three/drei'
import { PikachuModel } from '../components/pet/PikachuModel.tsx'
import { FoodProps } from '../components/pet/FoodProps.tsx'
import { SoccerFieldProps } from '../components/pet/SoccerFieldProps.tsx'
import type { PetState, FoodType } from '../types'
import type { ProceduralAnimator } from '../systems/pet/ProceduralAnimator.ts'

interface PetSceneProps {
  state: PetState
  animator: ProceduralAnimator
  voiceVolume?: number
  food: FoodType
  foodProgress: number
  soccerActive: boolean
  onTapPet?: () => void
  onScoreSoccerGoal?: () => void
  onTriggerHeader?: () => void
}

/**
 * PetScene
 *
 * Staging 3D environment coordinating Pikachu, Food Props,
 * Soccer Mini-Game Arena, lighting, and soft ground contact shadows.
 */
export const PetScene = ({
  state,
  animator,
  voiceVolume = 0,
  food,
  foodProgress,
  soccerActive,
  onTapPet,
  onScoreSoccerGoal,
  onTriggerHeader,
}: PetSceneProps) => {
  return (
    <>
      {/* Balanced 3-Point Lighting */}
      <ambientLight intensity={1.1} color="#ffffff" />

      <directionalLight
        position={[2.5, 4.0, 3.0]}
        intensity={1.7}
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

      {/* 3D Pikachu Virtual Pet */}
      <PikachuModel
        state={state}
        animator={animator}
        voiceVolume={voiceVolume}
        onTap={onTapPet}
      />

      {/* Interactive 3D Food Props (Milk Bowl / Fish) */}
      <FoodProps food={food} progress={foodProgress} />

      {/* 3D Head Soccer Arena & Ball */}
      <SoccerFieldProps
        active={soccerActive}
        onScoreGoal={() => onScoreSoccerGoal?.()}
        onTriggerHeader={() => onTriggerHeader?.()}
      />

      {/* Ground Contact Shadow */}
      <ContactShadows
        position={[0, -0.69, 0]}
        opacity={0.65}
        scale={3.4}
        blur={1.4}
        far={1.5}
        color="#030712"
      />
    </>
  )
}
