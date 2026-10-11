import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import type { FoodType } from '../../types'

interface FoodPropsProps {
  food: FoodType
  progress: number // 0 (just served) to 1 (fully consumed)
}

/**
 * 3D Food Props (Milk Bowl & Stylized Fish)
 * Appears dynamically in front of Pikachu during feeding interactions.
 */
export const FoodProps = ({ food, progress }: FoodPropsProps) => {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (!groupRef.current) return
    // Scale down gently as food is consumed
    const s = Math.max(0, 1 - progress * 0.95)
    groupRef.current.scale.set(s, s, s)
  })

  if (!food) return null

  return (
    <group ref={groupRef} position={[0, -0.68, 0.52]}>
      {food === 'milk' ? (
        // Milk Bowl
        <group>
          {/* Bowl Dish */}
          <mesh castShadow receiveShadow position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.22, 0.15, 0.1, 24]} />
            <meshStandardMaterial color="#3b82f6" roughness={0.3} metalness={0.1} />
          </mesh>
          {/* White Milk Surface */}
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.04, 24]} />
            <meshStandardMaterial color="#ffffff" roughness={0.1} />
          </mesh>
        </group>
      ) : (
        // Fresh Fish on Plate
        <group>
          {/* Plate */}
          <mesh castShadow receiveShadow position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.28, 0.22, 0.04, 24]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.2} />
          </mesh>
          {/* Fish Body */}
          <mesh castShadow position={[0, 0.06, 0]} rotation={[0, Math.PI / 6, 0]}>
            <capsuleGeometry args={[0.06, 0.22, 12, 16]} />
            <meshStandardMaterial color="#f97316" roughness={0.3} />
          </mesh>
          {/* Fish Tail */}
          <mesh position={[-0.18, 0.06, -0.05]} rotation={[0, 0, Math.PI / 4]}>
            <coneGeometry args={[0.08, 0.12, 8]} />
            <meshStandardMaterial color="#ea580c" roughness={0.3} />
          </mesh>
          {/* Fish Eye */}
          <mesh position={[0.12, 0.09, 0.04]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color="#0f172a" roughness={0.1} />
          </mesh>
        </group>
      )}
    </group>
  )
}
