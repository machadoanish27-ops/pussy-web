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
        // High-Fidelity Stylized Milk Glass / Cup with Coaster & Straw
        <group position={[0, 0, 0]}>
          {/* Ceramic / Wood Coaster Base */}
          <mesh castShadow receiveShadow position={[0, 0.008, 0]}>
            <cylinderGeometry args={[0.13, 0.12, 0.016, 24]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.05} />
          </mesh>

          {/* Outer Glass Container (Tapered, Translucent Tumbler) */}
          <mesh castShadow position={[0, 0.105, 0]}>
            <cylinderGeometry args={[0.098, 0.078, 0.18, 24]} />
            <meshStandardMaterial
              color="#e0f2fe"
              roughness={0.08}
              metalness={0.15}
              transparent
              opacity={0.5}
            />
          </mesh>

          {/* Thick Solid Glass Base */}
          <mesh position={[0, 0.026, 0]}>
            <cylinderGeometry args={[0.08, 0.076, 0.025, 24]} />
            <meshStandardMaterial
              color="#bae6fd"
              roughness={0.05}
              transparent
              opacity={0.65}
            />
          </mesh>

          {/* Pure White Milk Liquid Volume Inside */}
          <mesh position={[0, 0.092, 0]}>
            <cylinderGeometry args={[0.092, 0.076, 0.14, 24]} />
            <meshStandardMaterial
              color="#ffffff"
              roughness={0.2}
              metalness={0.02}
              emissive="#ffffff"
              emissiveIntensity={0.12}
            />
          </mesh>

          {/* Creamy Milk Top Surface with Specular Highlight */}
          <mesh position={[0, 0.162, 0]}>
            <cylinderGeometry args={[0.091, 0.091, 0.008, 24]} />
            <meshStandardMaterial
              color="#ffffff"
              roughness={0.12}
              emissive="#ffffff"
              emissiveIntensity={0.22}
            />
          </mesh>

          {/* Smooth Glass Rim Top Ring */}
          <mesh position={[0, 0.195, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.096, 0.007, 10, 24]} />
            <meshStandardMaterial
              color="#e0f2fe"
              roughness={0.05}
              transparent
              opacity={0.6}
            />
          </mesh>

          {/* Cute Drinking Straw Popping Out */}
          <group position={[0.025, 0.15, 0.015]} rotation={[0.12, 0, -0.2]}>
            {/* Straw Tube */}
            <mesh position={[0, 0.04, 0]}>
              <cylinderGeometry args={[0.011, 0.011, 0.18, 14]} />
              <meshStandardMaterial
                color="#f43f5e"
                roughness={0.25}
                emissive="#fb7185"
                emissiveIntensity={0.15}
              />
            </mesh>
            {/* White Decorative Stripe 1 */}
            <mesh position={[0, 0.055, 0]}>
              <cylinderGeometry args={[0.0115, 0.0115, 0.025, 14]} />
              <meshStandardMaterial color="#ffffff" roughness={0.2} />
            </mesh>
            {/* White Decorative Stripe 2 */}
            <mesh position={[0, 0.105, 0]}>
              <cylinderGeometry args={[0.0115, 0.0115, 0.025, 14]} />
              <meshStandardMaterial color="#ffffff" roughness={0.2} />
            </mesh>
          </group>
        </group>
      ) : (
        // Fresh Cute Cartoon Whole Fish on Porcelain Plate
        <group position={[0, 0, 0]}>
          {/* Ceramic Serving Plate */}
          <mesh castShadow receiveShadow position={[0, 0.012, 0]}>
            <cylinderGeometry args={[0.20, 0.16, 0.02, 28]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.18} metalness={0.05} />
          </mesh>
          {/* Plate Inner Rim */}
          <mesh position={[0, 0.022, 0]}>
            <cylinderGeometry args={[0.17, 0.17, 0.005, 28]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.25} />
          </mesh>

          {/* Fish Character Model */}
          <group position={[0, 0.052, 0]}>
            {/* Streamlined Fish Main Body */}
            <mesh castShadow position={[0.015, 0, 0]} scale={[1.45, 0.88, 0.62]}>
              <sphereGeometry args={[0.09, 20, 16]} />
              <meshStandardMaterial
                color="#0284c7" // Vibrant aquatic ocean blue
                roughness={0.25}
                metalness={0.12}
              />
            </mesh>

            {/* Bright White Fish Belly (Underbelly) */}
            <mesh position={[0.015, -0.022, 0]} scale={[1.35, 0.52, 0.58]}>
              <sphereGeometry args={[0.085, 18, 14]} />
              <meshStandardMaterial
                color="#ffffff"
                roughness={0.3}
                emissive="#f8fafc"
                emissiveIntensity={0.1}
              />
            </mesh>

            {/* Fish Snout & Cute Rounded Lips */}
            <mesh position={[0.14, -0.004, 0]} scale={[0.5, 0.55, 0.45]}>
              <sphereGeometry args={[0.05, 14, 12]} />
              <meshStandardMaterial color="#0369a1" roughness={0.3} />
            </mesh>
            <mesh position={[0.165, -0.01, 0]} rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[0.014, 0.005, 8, 16]} />
              <meshStandardMaterial color="#fb7185" roughness={0.3} />
            </mesh>

            {/* Cartoon Eyes on Both Sides */}
            {/* Right Eye (+Z) */}
            <group position={[0.095, 0.024, 0.046]}>
              {/* Sclera */}
              <mesh>
                <sphereGeometry args={[0.022, 14, 12]} />
                <meshStandardMaterial color="#ffffff" roughness={0.1} />
              </mesh>
              {/* Pupil */}
              <mesh position={[0.008, 0, 0.01]}>
                <sphereGeometry args={[0.013, 12, 10]} />
                <meshStandardMaterial color="#0f172a" roughness={0.1} />
              </mesh>
              {/* Specular Highlight */}
              <mesh position={[0.013, 0.006, 0.016]}>
                <sphereGeometry args={[0.005, 8, 8]} />
                <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} />
              </mesh>
            </group>

            {/* Left Eye (-Z) */}
            <group position={[0.095, 0.024, -0.046]}>
              {/* Sclera */}
              <mesh>
                <sphereGeometry args={[0.022, 14, 12]} />
                <meshStandardMaterial color="#ffffff" roughness={0.1} />
              </mesh>
              {/* Pupil */}
              <mesh position={[0.008, 0, -0.01]}>
                <sphereGeometry args={[0.013, 12, 10]} />
                <meshStandardMaterial color="#0f172a" roughness={0.1} />
              </mesh>
              {/* Specular Highlight */}
              <mesh position={[0.013, 0.006, -0.016]}>
                <sphereGeometry args={[0.005, 8, 8]} />
                <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} />
              </mesh>
            </group>

            {/* Dorsal Fin (Top Fin) */}
            <mesh position={[-0.01, 0.082, 0]} rotation={[0, 0, -0.25]} scale={[1.4, 0.55, 0.14]}>
              <coneGeometry args={[0.042, 0.085, 12]} />
              <meshStandardMaterial color="#0369a1" roughness={0.3} />
            </mesh>

            {/* Right Pectoral Fin (+Z) */}
            <mesh position={[0.035, -0.018, 0.058]} rotation={[0.4, 0.2, -0.5]} scale={[1.2, 0.5, 0.14]}>
              <coneGeometry args={[0.028, 0.058, 8]} />
              <meshStandardMaterial color="#38bdf8" roughness={0.3} />
            </mesh>

            {/* Left Pectoral Fin (-Z) */}
            <mesh position={[0.035, -0.018, -0.058]} rotation={[-0.4, -0.2, -0.5]} scale={[1.2, 0.5, 0.14]}>
              <coneGeometry args={[0.028, 0.058, 8]} />
              <meshStandardMaterial color="#38bdf8" roughness={0.3} />
            </mesh>

            {/* Tail Peduncle */}
            <mesh position={[-0.095, 0, 0]} scale={[0.8, 0.45, 0.35]}>
              <cylinderGeometry args={[0.028, 0.048, 0.075, 12]} />
              <meshStandardMaterial color="#0369a1" roughness={0.3} />
            </mesh>

            {/* Distinctive Forked Tail Fin */}
            <group position={[-0.14, 0, 0]}>
              {/* Top Tail Lobe */}
              <mesh position={[-0.022, 0.03, 0]} rotation={[0, 0, 0.7]} scale={[1, 0.5, 0.14]}>
                <coneGeometry args={[0.038, 0.08, 10]} />
                <meshStandardMaterial color="#0369a1" roughness={0.3} />
              </mesh>
              {/* Bottom Tail Lobe */}
              <mesh position={[-0.022, -0.03, 0]} rotation={[0, 0, -0.7]} scale={[1, 0.5, 0.14]}>
                <coneGeometry args={[0.038, 0.08, 10]} />
                <meshStandardMaterial color="#0369a1" roughness={0.3} />
              </mesh>
              {/* Center Tail Joint */}
              <mesh position={[-0.005, 0, 0]}>
                <sphereGeometry args={[0.02, 10, 8]} />
                <meshStandardMaterial color="#0369a1" roughness={0.3} />
              </mesh>
            </group>

            {/* Fresh Lemon Garnish on Plate */}
            <mesh position={[0.02, -0.032, 0.105]} rotation={[Math.PI / 2, 0, 0.4]}>
              <cylinderGeometry args={[0.032, 0.032, 0.014, 12, 1, false, 0, Math.PI]} />
              <meshStandardMaterial color="#facc15" roughness={0.2} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  )
}
