import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface PlacementReticleProps {
  position: [number, number, number]
  visible: boolean
  onPlace?: () => void
}

/**
 * PlacementReticle
 *
 * Visual 3D target ring on the detected ground plane in AR mode.
 * Pulses softly to invite user tap-to-place anchoring.
 */
export const PlacementReticle = ({
  position,
  visible,
  onPlace,
}: PlacementReticleProps) => {
  const ringRef = useRef<THREE.Group>(null)
  const outerRingRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (!ringRef.current || !visible) return
    ringRef.current.rotation.y += delta * 0.8

    if (outerRingRef.current) {
      const scale = 1 + Math.sin(Date.now() * 0.005) * 0.08
      outerRingRef.current.scale.set(scale, scale, 1)
    }
  })

  if (!visible) return null

  return (
    <group
      position={[position[0], -0.688, position[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(e) => {
        e.stopPropagation()
        onPlace?.()
      }}
    >
      <group ref={ringRef}>
        {/* Outer Pulsing Ring */}
        <mesh ref={outerRingRef}>
          <ringGeometry args={[0.34, 0.38, 32]} />
          <meshBasicMaterial
            color="#ec4899"
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Inner Solid Ring */}
        <mesh>
          <ringGeometry args={[0.22, 0.25, 32]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Center Target Dot */}
        <mesh>
          <circleGeometry args={[0.06, 16]} />
          <meshBasicMaterial
            color="#ec4899"
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* 4 Targeting Crosshair Ticks */}
        {[-0.42, 0.42].map((x) => (
          <mesh key={`tick-x-${x}`} position={[x, 0, 0]}>
            <planeGeometry args={[0.08, 0.02]} />
            <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
          </mesh>
        ))}
        {[-0.42, 0.42].map((y) => (
          <mesh key={`tick-y-${y}`} position={[0, y, 0]}>
            <planeGeometry args={[0.02, 0.08]} />
            <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
