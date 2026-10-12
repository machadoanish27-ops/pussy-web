import * as THREE from 'three'
import type { PetState, HitLocation, IdlePoseType } from '../../types'

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
 * 49-bone skeleton, facial meshes, and root transform.
 *
 * Covers:
 * - Living autonomous idle behavior: breathing, ear twitches, tail wags
 * - Multiple autonomous idle poses (Tilt Left/Right, Curious Lean, Weight Shift, Sleepy Slump, Happy Bounce)
 * - Look-at camera & room awareness (smooth gaze yaw)
 * - Location-aware cartoon hit reactions (Head, Left/Right Cheek, Eyes, Body, Ear, Tail)
 * - Repeated-hit combo escalation & dazed recovery
 * - Procedural facial animation: blinking, happy squinting, speech sync, eating/drinking
 * - Procedural cartoon cheek swelling on cheek impacts
 * - P0 Hit -> Fall -> Lie (2.5s) -> Stand -> Recover
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
  private cheekMesh: THREE.SkinnedMesh | null = null
  private initialEyeY: Float32Array | null = null
  private initialMouthY: Float32Array | null = null
  private initialMouthZ: Float32Array | null = null
  private initialCheekX: Float32Array | null = null
  private initialCheekZ: Float32Array | null = null

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

  // Autonomous Idle Pose Variations
  private idlePose: IdlePoseType = 'STAND'
  private idlePoseTimer = 0
  private idlePoseInterval = 8.0

  // Look-at awareness (gaze yaw)
  private lookAroundTimer = 0
  private lookAroundInterval = 6.5
  private targetLookYaw = 0
  private currentLookYaw = 0

  // Idle Vocalization Timer
  private idleVocalTimer = 0
  private idleVocalInterval = 40.0

  // Location-Specific Hit & Damage Reaction State
  private activeHitLocation: HitLocation | null = null
  private hitRecoilTimer = 0
  private hitComboScale = 1.0
  private leftCheekSwelling = 0
  private rightCheekSwelling = 0
  private dazedTimer = 0

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

    // Bind facial meshes (Object_9 = Eyes, Object_8 = Mouth, Object_7 = Cheeks)
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
        } else if (mesh.name === 'Object_7') {
          this.cheekMesh = mesh
          const pos = mesh.geometry.attributes.position
          this.initialCheekX = new Float32Array(pos.count)
          this.initialCheekZ = new Float32Array(pos.count)
          for (let i = 0; i < pos.count; i++) {
            this.initialCheekX[i] = pos.getX(i)
            this.initialCheekZ[i] = pos.getZ(i)
          }
        }
      }
    })
  }

  /**
   * Triggers a location-specific cartoon hit reaction with combo scaling
   */
  public triggerLocationHit(location: HitLocation, comboCount: number = 1): void {
    this.activeHitLocation = location
    this.hitRecoilTimer = 0.42
    this.hitComboScale = 1.0 + Math.min(comboCount * 0.25, 0.8)

    if (location === 'LEFT_CHEEK') {
      this.leftCheekSwelling = 1.0
    } else if (location === 'RIGHT_CHEEK') {
      this.rightCheekSwelling = 1.0
    } else if (location === 'HEAD' || location === 'EYES') {
      this.dazedTimer = 2.4
    }
  }

  /**
   * Periodic check for autonomous idle vocalization after prolonged inactivity
   */
  public checkIdleVocalization(
    delta: number,
    isEngaged: boolean,
    onTriggerVocal: () => void
  ): void {
    if (isEngaged) {
      this.idleVocalTimer = 0
      return
    }

    this.idleVocalTimer += delta
    if (this.idleVocalTimer >= this.idleVocalInterval) {
      this.idleVocalTimer = 0
      this.idleVocalInterval = 35.0 + Math.random() * 45.0 // 35s to 80s
      onTriggerVocal()
    }
  }

  public getActiveHitLocation(): HitLocation | null {
    return this.activeHitLocation
  }

  public getIdlePose(): IdlePoseType {
    return this.idlePose
  }

  public isDazed(): boolean {
    return this.dazedTimer > 0
  }

  public clearDamageEffects(): void {
    this.leftCheekSwelling = 0
    this.rightCheekSwelling = 0
    this.dazedTimer = 0
    this.activeHitLocation = null
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

    // 2. Autonomous Idle Pose & Look-At Awareness update
    if (state === 'IDLE') {
      this.idlePoseTimer += delta
      if (this.idlePoseTimer >= this.idlePoseInterval) {
        this.idlePoseTimer = 0
        this.idlePoseInterval = 6.5 + Math.random() * 5.5
        const poses: IdlePoseType[] = [
          'STAND',
          'HEAD_TILT_LEFT',
          'HEAD_TILT_RIGHT',
          'LEAN_FORWARD',
          'WEIGHT_SHIFT',
          'SLEEPY_SLUMP',
          'HAPPY_BOUNCE',
        ]
        this.idlePose = poses[Math.floor(Math.random() * poses.length)]
      }

      this.lookAroundTimer += delta
      if (this.lookAroundTimer >= this.lookAroundInterval) {
        this.lookAroundTimer = 0
        this.lookAroundInterval = 5.0 + Math.random() * 4.5
        const targets = [-0.3, 0.3, 0, 0] // 50% chance center, 25% left, 25% right
        this.targetLookYaw = targets[Math.floor(Math.random() * targets.length)]
      }
    } else {
      this.idlePose = 'STAND'
      this.targetLookYaw = 0
    }

    // Smooth look-at yaw interpolation
    this.currentLookYaw = THREE.MathUtils.lerp(
      this.currentLookYaw,
      this.targetLookYaw,
      1 - Math.exp(-4 * delta)
    )

    // Decay active hit recoil timer
    if (this.hitRecoilTimer > 0) {
      this.hitRecoilTimer -= delta
    }

    // 3. Compute Root Transform targets by PetState (local offsets relative to parent)
    switch (state) {
      case 'IDLE': {
        const breath = Math.sin(time * 2.8) * 0.015
        let posePosX = 0
        let posePosY = breath
        let posePosZ = 0
        let poseRotX = 0
        const poseRotY = Math.sin(time * 0.8) * 0.05
        let poseRotZ = 0
        let poseScaleY = 1 - breath * 0.01

        switch (this.idlePose) {
          case 'HEAD_TILT_LEFT':
            poseRotZ = -0.06
            posePosX = -0.015
            break
          case 'HEAD_TILT_RIGHT':
            poseRotZ = 0.06
            posePosX = 0.015
            break
          case 'LEAN_FORWARD':
            poseRotX = 0.08
            posePosZ = 0.04
            break
          case 'WEIGHT_SHIFT':
            poseRotZ = Math.sin(time * 1.5) * 0.04
            posePosX = Math.sin(time * 1.5) * 0.02
            break
          case 'SLEEPY_SLUMP':
            posePosY = breath - 0.04
            poseRotX = 0.06
            break
          case 'HAPPY_BOUNCE': {
            const bounce = Math.abs(Math.sin(time * 6)) * 0.03
            posePosY = breath + bounce
            poseScaleY = 1 + bounce * 0.5
            break
          }
          default:
            break
        }

        this.targetPos.set(posePosX, posePosY, posePosZ)
        this.targetRot.set(poseRotX, poseRotY, poseRotZ)
        this.targetScale.set(1 + breath * 0.01, poseScaleY, 1 + breath * 0.01)
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
        // Location-specific cartoon recoil vector scaled by combo
        const scale = this.hitComboScale
        switch (this.activeHitLocation) {
          case 'LEFT_CHEEK':
            this.targetPos.set(0.06 * scale, 0.02, -0.1 * scale)
            this.targetRot.set(-0.15, 0.22 * scale, -0.28 * scale)
            this.targetScale.set(1.06, 0.92, 1.06)
            break
          case 'RIGHT_CHEEK':
            this.targetPos.set(-0.06 * scale, 0.02, -0.1 * scale)
            this.targetRot.set(-0.15, -0.22 * scale, 0.28 * scale)
            this.targetScale.set(1.06, 0.92, 1.06)
            break
          case 'HEAD':
            this.targetPos.set(0, 0.06 * scale, -0.2 * scale)
            this.targetRot.set(-0.45 * scale, 0, 0.12)
            this.targetScale.set(1.1, 0.85, 1.1)
            break
          case 'EYES':
            this.targetPos.set(0, 0.02, -0.14 * scale)
            this.targetRot.set(-0.25, Math.sin(time * 30) * 0.12, 0)
            this.targetScale.set(1.05, 0.9, 1.05)
            break
          case 'EAR':
            this.targetPos.set(0.04, 0.03, -0.08)
            this.targetRot.set(-0.1, 0.15, 0.25)
            this.targetScale.set(1.04, 0.94, 1.04)
            break
          case 'TAIL':
            this.targetPos.set(0, 0.05, 0.12)
            this.targetRot.set(0.2, 0, 0)
            this.targetScale.set(1.05, 0.95, 1.05)
            break
          default:
            // Standard body hit
            this.targetPos.set(0, 0.04 * scale, -0.18 * scale)
            this.targetRot.set(-0.35 * scale, 0, 0.12)
            this.targetScale.set(1.08, 0.88, 1.08)
            break
        }
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

    // 4. Smooth Lerp on Root Group Transforms
    const lerpRate = state === 'HIT' ? 26 : 10
    const alpha = 1 - Math.exp(-lerpRate * delta)

    this.currentPos.lerp(this.targetPos, alpha)
    this.currentScale.lerp(this.targetScale, alpha)
    rootGroup.position.copy(this.currentPos)
    rootGroup.scale.copy(this.currentScale)

    // Smooth spherical/angular rotation lerp
    rootGroup.rotation.x = THREE.MathUtils.lerp(rootGroup.rotation.x, this.targetRot.x, alpha)
    rootGroup.rotation.y = THREE.MathUtils.lerp(rootGroup.rotation.y, this.targetRot.y, alpha)
    rootGroup.rotation.z = THREE.MathUtils.lerp(rootGroup.rotation.z, this.targetRot.z, alpha)

    // 5. Update Rigged Skeleton Bones
    this.updateBones(state, time, delta, voiceVolume)

    // 6. Update Facial Procedural Animation (Eyes Blinking, Cheek Swelling, Mouth Sync)
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
    if (this.dazedTimer > 0) {
      this.dazedTimer -= delta
      // Alternating dazed comic eye wobble
      blinkFactor = Math.max(blinkFactor, 0.45 + Math.sin(time * 16) * 0.4)
    } else if (state === 'PETTING' || state === 'HAPPY') {
      blinkFactor = Math.max(blinkFactor, 0.72) // Blissful happy squint
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

    // --- CHEEK SWELLING ANIMATION (Object_7) ---
    if (this.cheekMesh && this.initialCheekX && this.initialCheekZ) {
      const pos = this.cheekMesh.geometry.attributes.position

      // Decay swelling
      if (this.leftCheekSwelling > 0) {
        this.leftCheekSwelling = Math.max(0, this.leftCheekSwelling - delta * 0.35)
      }
      if (this.rightCheekSwelling > 0) {
        this.rightCheekSwelling = Math.max(0, this.rightCheekSwelling - delta * 0.35)
      }

      if (this.leftCheekSwelling > 0 || this.rightCheekSwelling > 0) {
        for (let i = 0; i < pos.count; i++) {
          const origX = this.initialCheekX[i]
          const origZ = this.initialCheekZ[i]
          if (origX < 0 && this.leftCheekSwelling > 0) {
            // Left cheek puffed out
            pos.setX(i, origX - this.leftCheekSwelling * 0.85)
            pos.setZ(i, origZ + this.leftCheekSwelling * 0.65)
          } else if (origX > 0 && this.rightCheekSwelling > 0) {
            // Right cheek puffed out
            pos.setX(i, origX + this.rightCheekSwelling * 0.85)
            pos.setZ(i, origZ + this.rightCheekSwelling * 0.65)
          } else {
            pos.setX(i, origX)
            pos.setZ(i, origZ)
          }
        }
        pos.needsUpdate = true
      }
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
      headY = Math.sin(time * 1.2) * 0.08 + this.currentLookYaw
      headX = Math.cos(time * 0.9) * 0.04
      if (this.idlePose === 'HEAD_TILT_LEFT') headZ = -0.14
      if (this.idlePose === 'HEAD_TILT_RIGHT') headZ = 0.14
      if (this.idlePose === 'LEAN_FORWARD') headX = 0.12
    } else if (state === 'TALKING') {
      headX = Math.sin(time * 14) * 0.16 * (0.5 + voiceVolume)
      headY = Math.cos(time * 5) * 0.06
    } else if (state === 'PETTING' || state === 'HAPPY') {
      headX = -0.22 // tilted up with pleasure
      headZ = Math.sin(time * 6) * 0.08
    } else if (state === 'HIT') {
      if (this.activeHitLocation === 'HEAD') {
        headX = -0.55 * this.hitComboScale
      } else if (this.activeHitLocation === 'LEFT_CHEEK') {
        headY = 0.25 * this.hitComboScale
        headZ = -0.2
      } else if (this.activeHitLocation === 'RIGHT_CHEEK') {
        headY = -0.25 * this.hitComboScale
        headZ = 0.2
      } else {
        headX = -0.45 * this.hitComboScale
      }
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
      lEarZ = 0.28 + Math.sin(time * 8) * 0.12
      rEarZ = -0.28 - Math.sin(time * 8) * 0.12
    } else if (state === 'HIT' || state === 'FALLING') {
      lEarX = -0.35
      rEarX = -0.35
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
      tailY = Math.sin(time * 11) * 0.5 // ecstatic rapid wag!
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
      armX = 0.22 // little arms raised with joy
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
