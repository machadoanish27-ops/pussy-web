import * as THREE from 'three'
import type { PetState } from '../../types'

export interface RigBones {
  head: THREE.Object3D | null
  spine: THREE.Object3D | null
  hips: THREE.Object3D | null
  lEar: THREE.Object3D | null
  rEar: THREE.Object3D | null
  tail1: THREE.Object3D | null
  tail2: THREE.Object3D | null
  lArm: THREE.Object3D | null
  rArm: THREE.Object3D | null
  lLeg: THREE.Object3D | null
  rLeg: THREE.Object3D | null
}

/**
 * ProceduralAnimator
 *
 * Implements high-fidelity living procedural animations on Pikachu's
 * 49-bone skeleton and root transform.
 *
 * Covers:
 * - Living idle breathing, ear twitches, tail wags, head sways
 * - P0 Hit -> Fall -> Lie -> Stand -> Recover
 * - Voice repeating head nods & volume pulse
 * - Eating & drinking bowl-reaching bobs
 * - Happy petting hops & ear perks
 * - Soccer jump header strike
 */
export class ProceduralAnimator {
  private bones: RigBones = {
    head: null,
    spine: null,
    hips: null,
    lEar: null,
    rEar: null,
    tail1: null,
    tail2: null,
    lArm: null,
    rArm: null,
    lLeg: null,
    rLeg: null,
  }

  // Base bone rotations recorded at load time to preserve model posture
  private baseRotations: Map<THREE.Object3D, THREE.Euler> = new Map()

  // Facial meshes and cached resting vertices
  private eyeMesh: THREE.SkinnedMesh | null = null
  private mouthMesh: THREE.SkinnedMesh | null = null
  private initialEyeY: Float32Array | null = null
  private initialMouthY: Float32Array | null = null
  private initialMouthZ: Float32Array | null = null

  // Natural living timers
  private earTwitchTimer = 0
  private earTwitchActive = 0

  // Natural blinking timers
  private blinkTimer = 0
  private blinkInterval = 3.8
  private isBlinking = false
  private blinkProgress = 0

  // Natural mouth opening
  private mouthOpenProgress = 0

  // Local procedural offsets (normalized around (0, 0, 0) and unit scale (1, 1, 1))
  private currentPos = new THREE.Vector3(0, 0, 0)
  private currentScale = new THREE.Vector3(1, 1, 1)

  // Target local offsets
  private targetPos = new THREE.Vector3(0, 0, 0)
  private targetRot = new THREE.Euler(0, 0, 0)
  private targetScale = new THREE.Vector3(1, 1, 1)

  public bindModel(scene: THREE.Object3D): void {
    this.baseRotations.clear()

    const findBone = (name: string): THREE.Object3D | null => {
      let found: THREE.Object3D | null = null
      scene.traverse((node) => {
        if (!found && node.name === name) {
          found = node
        }
      })
      if (found) {
        this.baseRotations.set(found, (found as THREE.Object3D).rotation.clone())
      }
      return found
    }

    this.bones = {
      head: findBone('Head_025'),
      spine: findBone('Spine2_024') || findBone('Spine1_023'),
      hips: findBone('Hips_04') || findBone('Origin_02'),
      lEar: findBone('LEar1_027'),
      rEar: findBone('REar1_031'),
      tail1: findBone('Tail1_019'),
      tail2: findBone('Tail2_020'),
      lArm: findBone('LArm_036'),
      rArm: findBone('RArm_041'),
      lLeg: findBone('LLeg_08'),
      rLeg: findBone('RLeg_014'),
    }

    // Bind facial meshes (Object_9 = Eyes, Object_8 = Mouth)
    scene.traverse((node) => {
      const mesh = node as THREE.SkinnedMesh
      if (mesh.isMesh) {
        if (mesh.name === 'Object_9') {
          this.eyeMesh = mesh
          const pos = mesh.geometry.attributes.position
          this.initialEyeY = new Float32Array(pos.count)
          for (let i = 0; i < pos.count; i++) {
            this.initialEyeY[i] = pos.getY(i)
          }
        } else if (mesh.name === 'Object_8') {
          this.mouthMesh = mesh
          const pos = mesh.geometry.attributes.position
          this.initialMouthY = new Float32Array(pos.count)
          this.initialMouthZ = new Float32Array(pos.count)
          for (let i = 0; i < pos.count; i++) {
            this.initialMouthY[i] = pos.getY(i)
            this.initialMouthZ[i] = pos.getZ(i)
          }
        }
      }
    })
  }

  public update(
    rootGroup: THREE.Object3D,
    state: PetState,
    delta: number,
    time: number,
    voiceVolume: number = 0
  ): void {
    // 1. Natural living random ear twitch generator
    this.earTwitchTimer += delta
    if (this.earTwitchTimer > 3.5 + Math.sin(time) * 1.5) {
      this.earTwitchTimer = 0
      this.earTwitchActive = 0.35 // twitch for 0.35s
    }
    if (this.earTwitchActive > 0) {
      this.earTwitchActive -= delta
    }

    // 2. Compute Root Transform targets by PetState (local offsets relative to parent)
    switch (state) {
      case 'IDLE': {
        const breath = Math.sin(time * 2.8) * 0.015
        this.targetPos.set(0, breath, 0)
        this.targetRot.set(0, Math.sin(time * 0.8) * 0.06, 0)
        this.targetScale.set(
          1 + breath * 0.01,
          1 - breath * 0.01,
          1 + breath * 0.01
        )
        break
      }

      case 'TALKING': {
        const talkPulse = Math.sin(time * 10) * 0.02
        this.targetPos.set(0, talkPulse, 0)
        this.targetRot.set(0, Math.sin(time * 3) * 0.08, 0)
        const vScale = 1 + voiceVolume * 0.12
        this.targetScale.set(vScale, vScale * (1 + talkPulse * 0.05), vScale)
        break
      }

      case 'PETTING':
      case 'HAPPY': {
        const hop = Math.abs(Math.sin(time * 7)) * 0.05
        this.targetPos.set(0, hop, 0)
        this.targetRot.set(0, 0, Math.sin(time * 7) * 0.06)
        this.targetScale.set(1.05, 0.96, 1.05)
        break
      }

      case 'HIT': {
        // Instant recoil backwards and slight squash
        this.targetPos.set(0, 0.04, -0.16)
        this.targetRot.set(-0.35, 0, 0.12)
        this.targetScale.set(1.08, 0.88, 1.08)
        break
      }

      case 'FALLING': {
        // Tipping backwards toward the floor
        this.targetPos.set(0, -0.12, -0.28)
        this.targetRot.set(-1.1, 0, 0.22)
        this.targetScale.set(1, 1, 1)
        break
      }

      case 'LYING': {
        // Flat on ground for 2.5 seconds
        this.targetPos.set(0, -0.22, -0.32)
        this.targetRot.set(-1.54, 0, 0.18)
        this.targetScale.set(1, 1, 1)
        break
      }

      case 'RECOVERING': {
        // Shaking off dizziness, pushing back up
        const standProgress = Math.sin(time * 6) * 0.04
        this.targetPos.set(0, -0.02 + standProgress, 0)
        this.targetRot.set(-0.1, Math.sin(time * 12) * 0.14, 0)
        this.targetScale.set(1, 1, 1)
        break
      }

      case 'EATING': {
        const chew = Math.sin(time * 12) * 0.02
        this.targetPos.set(0, -0.06 + chew, 0.08)
        this.targetRot.set(0.24 + chew * 2, 0, 0)
        this.targetScale.set(1, 1, 1)
        break
      }

      case 'DRINKING': {
        const sip = Math.sin(time * 10) * 0.015
        this.targetPos.set(0, -0.08 + sip, 0.08)
        this.targetRot.set(0.28 + sip * 2, 0, 0)
        this.targetScale.set(1, 1, 1)
        break
      }

      case 'SOCCER': {
        // Jump header thrust into air!
        const jump = Math.sin(time * 8) * 0.25
        this.targetPos.set(0, 0.15 + Math.max(0, jump), 0.15)
        this.targetRot.set(0.35, 0, 0)
        this.targetScale.set(1.04, 1.04, 1.04)
        break
      }

      case 'ANGRY': {
        this.targetPos.set(0, 0, 0)
        this.targetRot.set(0.18, Math.sin(time * 14) * 0.04, 0)
        this.targetScale.set(1, 1, 1)
        break
      }

      case 'SLEEPING': {
        const sleepBreath = Math.sin(time * 1.8) * 0.01
        this.targetPos.set(0, -0.18 + sleepBreath, 0)
        this.targetRot.set(0.2, 0, 1.4)
        this.targetScale.set(1, 1, 1)
        break
      }
    }

    // 3. Smooth Lerp on Root Group Transforms
    const lerpRate = state === 'HIT' ? 24 : 10
    const alpha = 1 - Math.exp(-lerpRate * delta)

    this.currentPos.lerp(this.targetPos, alpha)
    this.currentScale.lerp(this.targetScale, alpha)
    rootGroup.position.copy(this.currentPos)
    rootGroup.scale.copy(this.currentScale)

    // Smooth spherical/angular rotation lerp
    rootGroup.rotation.x = THREE.MathUtils.lerp(rootGroup.rotation.x, this.targetRot.x, alpha)
    rootGroup.rotation.y = THREE.MathUtils.lerp(rootGroup.rotation.y, this.targetRot.y, alpha)
    rootGroup.rotation.z = THREE.MathUtils.lerp(rootGroup.rotation.z, this.targetRot.z, alpha)

    // 4. Update Rigged Skeleton Bones
    this.updateBones(state, time, delta, voiceVolume)

    // 5. Update Facial Procedural Animation (Eyes Blinking & Mouth Open/Sync)
    this.updateFacialAnimation(state, time, delta, voiceVolume)
  }

  private updateFacialAnimation(
    state: PetState,
    time: number,
    delta: number,
    voiceVolume: number
  ): void {
    // --- BLINKING LOGIC (Object_9) ---
    this.blinkTimer += delta
    if (!this.isBlinking && this.blinkTimer >= this.blinkInterval) {
      this.isBlinking = true
      this.blinkProgress = 0
      this.blinkTimer = 0
      this.blinkInterval = 3.0 + Math.random() * 2.2 // Next blink in 3.0 - 5.2s
    }

    if (this.isBlinking) {
      this.blinkProgress += delta / 0.16 // 160ms blink duration
      if (this.blinkProgress >= 1) {
        this.isBlinking = false
        this.blinkProgress = 0
      }
    }

    let blinkFactor = this.isBlinking ? Math.sin(this.blinkProgress * Math.PI) : 0

    // Specific state overrides for eyes
    if (state === 'PETTING' || state === 'HAPPY') {
      blinkFactor = Math.max(blinkFactor, 0.7) // Happy squint
    } else if (state === 'LYING' || state === 'SLEEPING') {
      blinkFactor = 1.0 // Fully closed asleep
    } else if (state === 'FALLING') {
      blinkFactor = 0.85 // Dizzy closed
    } else if (state === 'HIT') {
      blinkFactor = 0.95 // Shock squeeze
    } else if (state === 'RECOVERING') {
      blinkFactor = Math.sin(time * 18) > 0 ? 0.9 : 0 // Rapid waking blinks
    }

    if (this.eyeMesh && this.initialEyeY) {
      const pos = this.eyeMesh.geometry.attributes.position
      const centerY = 38.86 // Midpoint of Pikachu's eyes
      for (let i = 0; i < pos.count; i++) {
        const origY = this.initialEyeY[i]
        // Squashes eye vertices toward centerY (thin horizontal slit)
        pos.setY(i, origY + (centerY - origY) * blinkFactor * 0.92)
      }
      pos.needsUpdate = true
    }

    // --- MOUTH LOGIC (Object_8) ---
    let targetMouthOpen: number

    switch (state) {
      case 'TALKING': {
        const speechWave = Math.max(0, Math.sin(time * 16) * 0.7 + Math.sin(time * 26) * 0.3)
        targetMouthOpen = speechWave * (0.35 + Math.min(1, voiceVolume * 1.8) * 0.65)
        break
      }
      case 'EATING': {
        targetMouthOpen = Math.max(0, Math.sin(time * 13)) * 0.75
        break
      }
      case 'DRINKING': {
        targetMouthOpen = Math.max(0, Math.sin(time * 10)) * 0.6
        break
      }
      case 'PETTING':
      case 'HAPPY': {
        targetMouthOpen = 0.22 // Pleasant little smile
        break
      }
      case 'HIT': {
        targetMouthOpen = 0.85 // Shock gasp
        break
      }
      case 'SOCCER': {
        targetMouthOpen = 0.65 // Determined header roar
        break
      }
      case 'FALLING': {
        targetMouthOpen = 0.4
        break
      }
      case 'LYING':
      case 'SLEEPING': {
        targetMouthOpen = 0.05
        break
      }
      case 'ANGRY': {
        targetMouthOpen = 0.3
        break
      }
      case 'RECOVERING': {
        targetMouthOpen = Math.max(0, Math.sin(time * 8)) * 0.3
        break
      }
      default: {
        targetMouthOpen = 0
        break
      }
    }

    // Smooth mouth interpolation
    this.mouthOpenProgress = THREE.MathUtils.lerp(
      this.mouthOpenProgress,
      targetMouthOpen,
      1 - Math.exp(-22 * delta)
    )

    if (this.mouthMesh && this.initialMouthY && this.initialMouthZ) {
      const pos = this.mouthMesh.geometry.attributes.position
      for (let i = 0; i < pos.count; i++) {
        const origY = this.initialMouthY[i]
        const origZ = this.initialMouthZ[i]
        if (origY <= 33.85) {
          // Lower lip & jaw drop down and slightly inwards
          const drop = this.mouthOpenProgress * (33.85 - origY + 0.8) * 0.65
          pos.setY(i, origY - drop)
          pos.setZ(i, origZ - this.mouthOpenProgress * 0.35)
        } else {
          // Upper lip lifts slightly
          pos.setY(i, origY + this.mouthOpenProgress * 0.2)
        }
      }
      pos.needsUpdate = true
    }
  }

  private updateBones(
    state: PetState,
    time: number,
    delta: number,
    voiceVolume: number
  ): void {
    const applyRot = (
      bone: THREE.Object3D | null,
      xOffset: number,
      yOffset: number,
      zOffset: number,
      speed: number = 10
    ) => {
      if (!bone) return
      const base = this.baseRotations.get(bone)
      const baseEuler = base ? base : new THREE.Euler(0, 0, 0)
      const a = 1 - Math.exp(-speed * delta)

      bone.rotation.x = THREE.MathUtils.lerp(bone.rotation.x, baseEuler.x + xOffset, a)
      bone.rotation.y = THREE.MathUtils.lerp(bone.rotation.y, baseEuler.y + yOffset, a)
      bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, baseEuler.z + zOffset, a)
    }

    // --- HEAD BONE ---
    let headX = 0
    let headY = 0
    let headZ = 0

    if (state === 'IDLE') {
      headY = Math.sin(time * 1.2) * 0.08
      headX = Math.cos(time * 0.9) * 0.04
    } else if (state === 'TALKING') {
      headX = Math.sin(time * 14) * 0.16 * (0.5 + voiceVolume)
      headY = Math.cos(time * 5) * 0.06
    } else if (state === 'PETTING' || state === 'HAPPY') {
      headX = -0.25 // tilted up with pleasure
      headZ = Math.sin(time * 6) * 0.08
    } else if (state === 'HIT') {
      headX = -0.45 // snapped back
    } else if (state === 'LYING') {
      headY = Math.sin(time * 4) * 0.06 // faint dizzy wobble
    } else if (state === 'RECOVERING') {
      headY = Math.sin(time * 16) * 0.25 // rapid head shake
    } else if (state === 'EATING' || state === 'DRINKING') {
      headX = 0.35 + Math.sin(time * 12) * 0.12 // bobbing down to food
    } else if (state === 'SOCCER') {
      headX = 0.45 // powerful headbutt forward
    } else if (state === 'ANGRY') {
      headX = 0.18
      headY = Math.sin(time * 12) * 0.06
    }
    applyRot(this.bones.head, headX, headY, headZ, 14)

    // --- EARS BONES ---
    let lEarX = 0
    let rEarX = 0
    let lEarZ = 0
    let rEarZ = 0

    const twitch = this.earTwitchActive > 0 ? Math.sin(time * 40) * 0.18 : 0

    if (state === 'IDLE') {
      lEarZ = Math.sin(time * 3) * 0.05 + twitch
      rEarZ = -Math.sin(time * 3) * 0.05 - twitch
    } else if (state === 'TALKING') {
      lEarZ = Math.sin(time * 12) * 0.12
      rEarZ = -Math.sin(time * 12) * 0.12
    } else if (state === 'PETTING' || state === 'HAPPY') {
      lEarZ = 0.25 + Math.sin(time * 8) * 0.1
      rEarZ = -0.25 - Math.sin(time * 8) * 0.1
    } else if (state === 'HIT' || state === 'FALLING') {
      lEarX = -0.3
      rEarX = -0.3
    } else if (state === 'LYING') {
      lEarX = -0.15 + Math.sin(time * 3) * 0.05
      rEarX = -0.15 + Math.cos(time * 3) * 0.05
    } else if (state === 'ANGRY') {
      lEarX = -0.25
      rEarX = -0.25
    }

    applyRot(this.bones.lEar, lEarX, 0, lEarZ, 12)
    applyRot(this.bones.rEar, rEarX, 0, rEarZ, 12)

    // --- TAIL BONES ---
    let tailY = 0
    let tailX = 0

    if (state === 'IDLE') {
      tailY = Math.sin(time * 3.8) * 0.22
      tailX = Math.cos(time * 1.9) * 0.05
    } else if (state === 'PETTING' || state === 'HAPPY') {
      tailY = Math.sin(time * 10) * 0.45 // happy rapid wag!
    } else if (state === 'TALKING') {
      tailY = Math.sin(time * 5) * 0.2
    } else if (state === 'HIT' || state === 'FALLING' || state === 'LYING') {
      tailY = 0
      tailX = 0.1
    }

    applyRot(this.bones.tail1, tailX, tailY, 0, 10)
    applyRot(this.bones.tail2, tailX * 0.8, tailY * 1.3, 0, 10)

    // --- ARMS & SPINE ---
    let armX = 0
    if (state === 'SOCCER') {
      armX = -0.35 // arms back during header jump
    } else if (state === 'PETTING' || state === 'HAPPY') {
      armX = 0.2 // little arms raised with joy
    } else if (state === 'ANGRY') {
      armX = 0.35
    }
    applyRot(this.bones.lArm, armX, 0, 0, 10)
    applyRot(this.bones.rArm, armX, 0, 0, 10)

    // Spine breathing
    const spineX = state === 'IDLE' ? Math.sin(time * 2.8) * 0.02 : 0
    applyRot(this.bones.spine, spineX, 0, 0, 8)
  }
}
