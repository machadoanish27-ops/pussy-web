import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { FoodType } from '../../types'

interface FoodPropsProps {
  food: FoodType
  progress: number // 0 (served) to 1 (consumed)
  petPosition?: [number, number, number]
  petRotationY?: number
  petScale?: number
}

/**
 * 3D Food Props (Milk Bowl & Stylized Fresh Fish)
 *
 * Implements smooth cartoon presentation on mobile viewports:
 * 1. Spawns cleanly at ground level in front of Pikachu.
 * 2. Floats up toward Pikachu's mouth as chewing / sipping begins.
 * 3. Shrinks into the mouth during active consumption.
 * 4. Cleans up cleanly without clipping or dock overlap.
 */
export const FoodProps = ({
  food,
  progress,
  petPosition = [0, -0.69, 0],
  petRotationY = 0,
  petScale = 0.034,
}: FoodPropsProps) => {
  const groupRef = useRef<THREE.Group>(null)

  // Scale multiplier relative to default pet size
  const relativeScale = petScale / 0.034

  // Dynamic ground level and mouth level relative to Pikachu's placed 3D/AR position
  const baseY = petPosition[1] + 0.01 * relativeScale
  const mouthY = petPosition[1] + 0.38 * relativeScale

  const { currentY, currentTilt, scale } = (() => {
    if (progress < 0.2) {
      // Pop in on floor
      const enter = progress / 0.2
      return {
        currentY: baseY,
        currentTilt: 0,
        scale: THREE.MathUtils.lerp(0.01, 1.0, enter),
      }
    } else if (progress < 0.75) {
      // Float up toward mouth
      const floatProgress = (progress - 0.2) / 0.55
      return {
        currentY: THREE.MathUtils.lerp(baseY, mouthY, floatProgress),
        currentTilt: THREE.MathUtils.lerp(0, -0.28, floatProgress),
        scale: 1.0,
      }
    } else {
      // Consumed into mouth
      const consumeProgress = (progress - 0.75) / 0.25
      return {
        currentY: mouthY,
        currentTilt: -0.28,
        scale: Math.max(0, 1.0 - consumeProgress),
      }
    }
  })()

  useFrame(() => {
    if (!groupRef.current) return
    const s = scale * relativeScale
    groupRef.current.scale.set(s, s, s)
  })

  if (!food) return null

  // Anchored in front of Pikachu based on rotation
  const forwardDist = 0.38 * relativeScale
  const foodX = petPosition[0] + Math.sin(petRotationY) * forwardDist
  const foodZ = petPosition[2] + Math.cos(petRotationY) * forwardDist

  return (
    <group
      ref={groupRef}
      position={[foodX, currentY, foodZ]}
      rotation={[currentTilt, petRotationY, 0]}
    >
      {food === 'milk' ? (
        // Stylized Cute Milk Bowl
        <group>
          {/* Bowl Dish */}
          <mesh castShadow receiveShadow position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.14, 0.09, 0.08, 20]} />
            <meshStandardMaterial
              color="#3b82f6"
              roughness={0.25}
              metalness={0.1}
            />
          </mesh>
          {/* White Milk Surface */}
          <mesh position={[0, 0.065, 0]}>
            <cylinderGeometry args={[0.125, 0.125, 0.03, 20]} />
            <meshStandardMaterial
              color="#ffffff"
              roughness={0.1}
              emissive="#ffffff"
              emissiveIntensity={0.08}
            />
          </mesh>
        </group>
      ) : (
        // Fresh Cartoon Fish on Plate
        <group>
          {/* Small Serving Plate */}
          <mesh castShadow receiveShadow position={[0, 0.015, 0]}>
            <cylinderGeometry args={[0.18, 0.14, 0.025, 20]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.2} />
          </mesh>
          {/* Fish Body */}
          <mesh
            castShadow
            position={[0, 0.045, 0]}
            rotation={[0, Math.PI / 6, 0]}
          >
            <capsuleGeometry args={[0.04, 0.14, 10, 14]} />
            <meshStandardMaterial color="#f97316" roughness={0.3} />
          </mesh>
          {/* Fish Tail */}
          <mesh
            position={[-0.12, 0.045, -0.03]}
            rotation={[0, 0, Math.PI / 4]}
          >
            <coneGeometry args={[0.05, 0.08, 8]} />
            <meshStandardMaterial color="#ea580c" roughness={0.3} />
          </mesh>
          {/* Fish Eye */}
          <mesh position={[0.08, 0.065, 0.03]}>
            <sphereGeometry args={[0.014, 8, 8]} />
            <meshStandardMaterial color="#0f172a" roughness={0.1} />
          </mesh>
        </group>
      )}
    </group>
  )
}
