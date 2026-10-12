import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { CartoonEffectType } from '../../types'

export interface ActiveDamageEffect {
  id: string
  type: CartoonEffectType
  position?: [number, number, number]
  createdAt: number
  durationMs: number
}

interface CartoonDamageOverlayProps {
  effects: ActiveDamageEffect[]
  petPosition: [number, number, number]
  petRotationY: number
  petScale: number
}

/**
 * Cartoon Cross Bandage Component
 * Renders a stylized medical cross bandage on Pikachu's head or cheek.
 */
const CrossBandage = ({
  position,
  rotation = [0, 0, 0],
  scale = 1,
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
}) => {
  return (
    <group position={position} rotation={rotation} scale={[scale, scale, scale]}>
      {/* Horizontal strip */}
      <mesh castShadow={false}>
        <boxGeometry args={[0.16, 0.05, 0.015]} />
        <meshStandardMaterial
          color="#fef08a"
          roughness={0.6}
          emissive="#ca8a04"
          emissiveIntensity={0.15}
        />
      </mesh>
      {/* Vertical strip */}
      <mesh castShadow={false}>
        <boxGeometry args={[0.05, 0.16, 0.018]} />
        <meshStandardMaterial
          color="#fef08a"
          roughness={0.6}
          emissive="#ca8a04"
          emissiveIntensity={0.15}
        />
      </mesh>
      {/* Center gauze pad dot */}
      <mesh position={[0, 0, 0.012]} castShadow={false}>
        <circleGeometry args={[0.02, 8]} />
        <meshBasicMaterial color="#ffffff" opacity={0.8} transparent />
      </mesh>
    </group>
  )
}

/**
 * Orbiting Dizzy Stars Halo
 * Cartoon stars circulating over Pikachu's head when dazed.
 */
const DizzyStarsHalo = ({
  headHeight = 0.55,
}: {
  headHeight?: number
}) => {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 3.5
    }
  })

  return (
    <group ref={groupRef} position={[0, headHeight, 0]}>
      {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((angle, i) => {
        const radius = 0.28
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        return (
          <group key={`dizzy-star-${i}`} position={[x, Math.sin(angle * 2) * 0.04, z]}>
            <mesh rotation={[0, 0, Math.PI / 4]}>
              <octahedronGeometry args={[0.04, 0]} />
              <meshStandardMaterial
                color="#facc15"
                emissive="#eab308"
                emissiveIntensity={0.8}
                roughness={0.2}
              />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

/**
 * Floating Petting Heart
 * Adorable pink heart drifting upward when user pets Pikachu.
 */
const FloatingHeart = ({
  startTime,
  index = 0,
}: {
  startTime: number
  index?: number
}) => {
  const heartRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (!heartRef.current) return
    const elapsed = (Date.now() - startTime) / 1000
    const floatY = 0.3 + elapsed * 0.4
    const wobbleX = Math.sin(elapsed * 5 + index) * 0.08
    const scale = Math.max(0, 1 - elapsed * 0.6)
    heartRef.current.position.set(wobbleX, floatY, 0.2)
    heartRef.current.scale.set(scale, scale, scale)
  })

  return (
    <group ref={heartRef}>
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.06, 0.06, 0.02]} />
        <meshStandardMaterial
          color="#f43f5e"
          emissive="#fb7185"
          emissiveIntensity={0.6}
          roughness={0.3}
        />
      </mesh>
    </group>
  )
}

/**
 * CartoonDamageOverlay
 *
 * Renders temporary cartoon damage effects in world space, anchored
 * to Pikachu's current position, orientation, and scale:
 * - Cross bandages (Head, Left Cheek, Right Cheek)
 * - Orbiting dizzy stars
 * - Floating petting hearts
 */
export const CartoonDamageOverlay = ({
  effects,
  petPosition,
  petRotationY,
  petScale,
}: CartoonDamageOverlayProps) => {
  if (effects.length === 0) return null

  // Scale relative to Pikachu's natural scale
  const effectScale = petScale / 0.034

  return (
    <group
      position={petPosition}
      rotation={[0, petRotationY, 0]}
      scale={[effectScale, effectScale, effectScale]}
    >
      {effects.map((fx) => {
        switch (fx.type) {
          case 'BANDAGE_HEAD':
            return (
              <CrossBandage
                key={fx.id}
                position={[0, 0.48, 0.28]}
                rotation={[-0.2, 0, 0.15]}
                scale={0.9}
              />
            )

          case 'BANDAGE_LEFT':
            return (
              <CrossBandage
                key={fx.id}
                position={[-0.24, 0.32, 0.26]}
                rotation={[0.1, -0.4, 0.3]}
                scale={0.8}
              />
            )

          case 'BANDAGE_RIGHT':
            return (
              <CrossBandage
                key={fx.id}
                position={[0.24, 0.32, 0.26]}
                rotation={[0.1, 0.4, -0.3]}
                scale={0.8}
              />
            )

          case 'DIZZY_STARS':
            return <DizzyStarsHalo key={fx.id} headHeight={0.62} />

          case 'HEART_FLOAT':
            return (
              <FloatingHeart
                key={fx.id}
                startTime={fx.createdAt}
                index={Number(fx.id.slice(-1)) || 0}
              />
            )

          default:
            return null
        }
      })}
    </group>
  )
}
