import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SoundEffects } from '../../systems/audio/SoundEffects.ts'

interface SoccerProps {
  active: boolean
  onScoreGoal: () => void
  onTriggerHeader: () => void
}

/**
 * 3D Soccer Field Elements & Interactive Ball
 * Features a physics-lite bouncing ball and background goal.
 * Tapping headers the ball into the net to score!
 */
export const SoccerFieldProps = ({ active, onScoreGoal, onTriggerHeader }: SoccerProps) => {
  const ballRef = useRef<THREE.Mesh>(null)

  // Ball physics state
  const ballPos = useRef(new THREE.Vector3(0, 0.4, 1.6))
  const ballVel = useRef(new THREE.Vector3(0, 0, -1.2))
  const ballInGoal = useRef(false)

  // Reset ball position when active or scored
  const resetBall = () => {
    ballPos.current.set(
      (Math.random() - 0.5) * 0.4,
      0.5,
      1.8
    )
    ballVel.current.set(
      (Math.random() - 0.5) * 0.2,
      -0.2,
      -1.4
    )
    ballInGoal.current = false
  }

  useEffect(() => {
    if (active) {
      resetBall()
    }
  }, [active])

  const hitBall = () => {
    if (!active || ballInGoal.current) return
    // Check if ball is in reachable header zone (Z between -0.2 and 1.2)
    if (ballPos.current.z > -0.2 && ballPos.current.z < 1.4) {
      onTriggerHeader()
      SoundEffects.playKick()

      // Launch ball towards goal
      ballVel.current.set((Math.random() - 0.5) * 0.5, 2.2, -4.5)
      ballInGoal.current = true

      setTimeout(() => {
        SoundEffects.playGoal()
        onScoreGoal()
        setTimeout(() => {
          resetBall()
        }, 1200)
      }, 700)
    }
  }

  useFrame((_, delta) => {
    if (!active || !ballRef.current) return

    // Apply simple gravity
    ballVel.current.y -= 3.5 * delta
    ballPos.current.addScaledVector(ballVel.current, delta)

    // Floor bounce
    if (ballPos.current.y < -0.55) {
      ballPos.current.y = -0.55
      ballVel.current.y = Math.abs(ballVel.current.y) * 0.72
    }

    // Goal line reached without hit
    if (ballPos.current.z < -2.5 && !ballInGoal.current) {
      resetBall()
    }

    // Ball passed player without hit
    if (ballPos.current.z < -0.5 && !ballInGoal.current) {
      resetBall()
    }

    // Rotate ball as it rolls
    ballRef.current.position.copy(ballPos.current)
    ballRef.current.rotation.x += ballVel.current.z * delta * 4
    ballRef.current.rotation.y += ballVel.current.x * delta * 4
  })

  if (!active) return null

  return (
    <group>
      {/* 3D Soccer Ball */}
      <mesh
        ref={ballRef}
        castShadow
        onPointerDown={(e) => {
          e.stopPropagation()
          hitBall()
        }}
      >
        <sphereGeometry args={[0.15, 24, 24]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.1} />
      </mesh>

      {/* Goal Post in Background */}
      <group position={[0, -0.7, -3.2]}>
        {/* Left Post */}
        <mesh position={[-1.2, 0.75, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 1.5, 12]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        {/* Right Post */}
        <mesh position={[1.2, 0.75, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 1.5, 12]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        {/* Crossbar */}
        <mesh position={[0, 1.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 2.44, 12]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        {/* Goal Net Backdrop */}
        <mesh position={[0, 0.75, -0.4]}>
          <planeGeometry args={[2.4, 1.5]} />
          <meshStandardMaterial
            color="#94a3b8"
            transparent
            opacity={0.3}
            wireframe
          />
        </mesh>
      </group>

      {/* Tap anywhere prompt button in 3D */}
      <mesh
        position={[0, -0.68, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={() => hitBall()}
        visible={false}
      >
        <planeGeometry args={[10, 10]} />
      </mesh>
    </group>
  )
}
