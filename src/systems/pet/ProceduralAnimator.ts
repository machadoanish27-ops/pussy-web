import * as THREE from 'three'
import type { PetState, HitLocation, IdlePoseType, MouthState } from '../../types'

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
 * - Dedicated attentive LISTENING mode with curious head tilt, perked ears, and eye awareness
 * - Location-aware cartoon hit reactions (Head, Forehead, Left/Right Cheek, Eyes, Body, Sides, Ear, Tail)
 * - 10-hit cartoon damage escalation & fresh recovery
 * - True visible mouth lip-sync via UV atlas switching & procedural jaw articulation
 * - Procedural eye awareness (attentive listening gaze, happy squinting, comic daze, natural blinking)
 * - Tactile finger-following petting reactions & procedural cheek swelling
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

  // Facial meshes, cached resting vertices, and resting UV coordinates
  private eyeMesh: THREE.SkinnedMesh | null = null
  private mouthMesh: THREE.SkinnedMesh | null = null
  private cheekMesh: THREE.SkinnedMesh | null = null
  private initialEyeY: Float32Array | null = null
  private initialEyeUV: Float32Array | null = null
  private initialMouthY: Float32Array | null = null
  private initialMouthZ: Float32Array | null = null
  private initialMouthUV: Float32Array | null = null
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

  // Lip-sync & mouth state tracking
  private currentMouthState: MouthState = 'MOUTH_CLOSED'
  private smoothedVolume = 0
  private mouthOpenProgress = 0

  // Petting tactile follow
  private pettingFollowY = 0
  private isBeingPetted = false

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

  // Centralized State Transition & World Mouth Anchor Tracking
  private lastState: PetState = 'IDLE'
  private lastRootGroup: THREE.Object3D | null = null
  private stableMouthAnchor: THREE.Vector3 = new THREE.Vector3(0, 33.85, 12.8)

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
        const mat = mesh.material as THREE.MeshStandardMaterial
        if (mat?.map) {
          mat.map.wrapS = THREE.RepeatWrapping
          mat.map.wrapT = THREE.RepeatWrapping
          mat.map.needsUpdate = true
        }

        if (mesh.name === 'Object_9') {
          this.eyeMesh = mesh
          const pos = mesh.geometry.attributes.position
          this.initialEyeY = new Float32Array(pos.count)
          for (let i = 0; i < pos.count; i++) {
            this.initialEyeY[i] = pos.getY(i)
          }
          const uv = mesh.geometry.attributes.uv
          if (uv) {
            this.initialEyeUV = new Float32Array(uv.count * 2)
            for (let i = 0; i < uv.count; i++) {
              this.initialEyeUV[i * 2] = uv.getX(i)
              this.initialEyeUV[i * 2 + 1] = uv.getY(i)
            }
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
          const uv = mesh.geometry.attributes.uv
          if (uv) {
            this.initialMouthUV = new Float32Array(uv.count * 2)
            for (let i = 0; i < uv.count; i++) {
              this.initialMouthUV[i * 2] = uv.getX(i)
              this.initialMouthUV[i * 2 + 1] = uv.getY(i)
            }
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
   * Triggers a location-specific cartoon hit reaction with progressive 10-hit scaling
   */
  public triggerLocationHit(location: HitLocation, comboCount: number = 1): void {
    this.activeHitLocation = location
    this.hitRecoilTimer = 0.42
    // Scales progressively up through 10 hits (from 1.0 up to 2.8x recoil)
    this.hitComboScale = 1.0 + Math.min(comboCount * 0.22, 1.8)

    if (location === 'LEFT_CHEEK' || location === 'SIDES') {
      this.leftCheekSwelling = 1.0
    } else if (location === 'RIGHT_CHEEK') {
      this.rightCheekSwelling = 1.0
    } else if (location === 'HEAD' || location === 'FOREHEAD' || location === 'EYES') {
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

  public getMouthState(): MouthState {
    return this.currentMouthState
  }

  public setPettingFollow(yFactor: number, isPetting: boolean): void {
    this.pettingFollowY = yFactor
    this.isBeingPetted = isPetting
  }

  public isDazed(): boolean {
    return this.dazedTimer > 0
  }

  /**
   * Derives and returns current world position of Pikachu's mouth.
   * Derived from Object_8 mouth mesh geometry transformed by world matrices,
   * dynamically tracking head tilts, translations, AR placement, drag, scale, and rotation.
   */
  public getMouthWorldPosition(outVec: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
    if (this.mouthMesh) {
      this.mouthMesh.updateWorldMatrix(true, false)
      return this.mouthMesh.localToWorld(outVec.copy(this.stableMouthAnchor))
    }
    if (this.lastRootGroup) {
      this.lastRootGroup.updateWorldMatrix(true, false)
      return this.lastRootGroup.localToWorld(outVec.copy(this.stableMouthAnchor))
    }
    return outVec.set(0, 0.46, 0.43)
  }

  /**
   * Resets all facial overrides (mouth smile/opening, eye UVs, jaw displacement, cheek effects)
   * returning character facial expressions cleanly and reliably to neutral.
   */
  public resetFacialOverrides(): void {
    this.currentMouthState = 'MOUTH_CLOSED'
    this.mouthOpenProgress = 0
    this.smoothedVolume = 0
    this.pettingFollowY = 0
    this.isBeingPetted = false

    // Instantly reset mouth resting vertices and UVs
    if (this.mouthMesh) {
      if (this.initialMouthUV) {
        const uv = this.mouthMesh.geometry.attributes.uv
        for (let i = 0; i < uv.count; i++) {
          uv.setXY(i, this.initialMouthUV[i * 2], this.initialMouthUV[i * 2 + 1])
        }
        uv.needsUpdate = true
      }
      if (this.initialMouthY && this.initialMouthZ) {
        const pos = this.mouthMesh.geometry.attributes.position
        for (let i = 0; i < pos.count; i++) {
          pos.setY(i, this.initialMouthY[i])
          pos.setZ(i, this.initialMouthZ[i])
        }
        pos.needsUpdate = true
      }
    }

    // Instantly reset eye resting vertices and UVs
    if (this.eyeMesh) {
      if (this.initialEyeUV) {
        const uv = this.eyeMesh.geometry.attributes.uv
        for (let i = 0; i < uv.count; i++) {
          uv.setXY(i, this.initialEyeUV[i * 2], this.initialEyeUV[i * 2 + 1])
        }
        uv.needsUpdate = true
      }
      if (this.initialEyeY) {
        const pos = this.eyeMesh.geometry.attributes.position
        for (let i = 0; i < pos.count; i++) {
          pos.setY(i, this.initialEyeY[i])
        }
        pos.needsUpdate = true
      }
    }
  }

  public clearDamageEffects(): void {
    this.leftCheekSwelling = 0
    this.rightCheekSwelling = 0
    this.dazedTimer = 0
    this.activeHitLocation = null
    this.resetFacialOverrides()

    // Restore cheek mesh resting positions
    if (this.cheekMesh && this.initialCheekX && this.initialCheekZ) {
      const pos = this.cheekMesh.geometry.attributes.position
      for (let i = 0; i < pos.count; i++) {
        pos.setX(i, this.initialCheekX[i])
        pos.setZ(i, this.initialCheekZ[i])
      }
      pos.needsUpdate = true
    }
  }

  public update(
    rootGroup: THREE.Object3D,
    state: PetState,
    delta: number,
    time: number,
    voiceVolume: number = 0
  ): void {
    // Record root group reference for dynamic world mouth position tracking
    this.lastRootGroup = rootGroup

    // Reset facial overrides on any state transition to prevent sticky expressions
    if (state !== this.lastState) {
      this.resetFacialOverrides()
      this.lastState = state
    }
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

      case 'LISTENING': {
        const breath = Math.sin(time * 3.2) * 0.012
        // Inquisitive forward lean & attentive posture toward user
        this.targetPos.set(0, breath, 0.035)
        this.targetRot.set(0.04, 0, 0)
        this.targetScale.set(1.02, 1 - breath * 0.01, 1.02)
        break
      }

      case 'TALKING': {
        // Subtle organic talking bounce synchronized with smoothed voice volume
        const talkPulse = Math.sin(time * 12) * (0.01 + this.smoothedVolume * 0.02)
        this.targetPos.set(0, talkPulse, 0)
        this.targetRot.set(0, Math.sin(time * 3) * 0.04, 0)
        const vScale = 1 + this.smoothedVolume * 0.06
        this.targetScale.set(vScale, vScale * (1 + talkPulse * 0.02), vScale)
        break
      }

      case 'PETTING':
      case 'HAPPY': {
        if (this.isBeingPetted) {
          // Soft squish & gentle responsive sway while finger is touching
          const squish = Math.sin(time * 6) * 0.02
          this.targetPos.set(0, squish, 0)
          this.targetRot.set(-0.04, 0, Math.sin(time * 4) * 0.03)
          this.targetScale.set(1.04, 0.96, 1.04)
        } else {
          const hop = Math.abs(Math.sin(time * 7)) * 0.04
          this.targetPos.set(0, hop, 0)
          this.targetRot.set(0, 0, Math.sin(time * 7) * 0.05)
          this.targetScale.set(1.03, 0.97, 1.03)
        }
        break
      }

      case 'HIT': {
        // Location-specific cartoon recoil vector scaled by combo
        const scale = this.hitComboScale
        switch (this.activeHitLocation) {
          case 'LEFT_CHEEK':
          case 'SIDES':
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
          case 'FOREHEAD':
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
    this.updateBones(state, time, delta)

    // 6. Update Facial Procedural Animation (Eyes Blinking, Cheek Swelling, Mouth Sync)
    this.updateFacialAnimation(state, time, delta, voiceVolume)
  }

  /**
   * Centralized Facial State Resolution System.
   * Priority hierarchy:
   * FALLING / LYING / RECOVERING > EATING / DRINKING > TALKING > LISTENING > PETTING > HAPPY > HIT > IDLE
   */
  public resolveFacialState(
    state: PetState,
    time: number = 0,
    volume: number = 0
  ): {
    targetEyeU: number
    targetEyeV: number
    targetMouthU: number
    targetMouthV: number
    mouthState: MouthState
    jawDropTarget: number
  } {
    // 1. FALLING / LYING / RECOVERING (Highest Priority)
    if (state === 'LYING' || state === 'SLEEPING') {
      return {
        targetEyeU: 0.5,
        targetEyeV: -0.25, // Closed sleeping/dizzy eyes
        targetMouthU: 0,
        targetMouthV: 0,
        mouthState: 'MOUTH_CLOSED',
        jawDropTarget: 0,
      }
    }
    if (state === 'FALLING') {
      return {
        targetEyeU: 0,
        targetEyeV: -0.75, // Dazed eyes
        targetMouthU: 0,
        targetMouthV: -0.25,
        mouthState: 'MOUTH_SMALL',
        jawDropTarget: 0.35,
      }
    }
    if (state === 'RECOVERING') {
      return {
        targetEyeU: 0,
        targetEyeV: -0.75, // Dazed comic eyes shaking off dizziness
        targetMouthU: 0,
        targetMouthV: 0,
        mouthState: 'MOUTH_CLOSED',
        jawDropTarget: 0,
      }
    }

    // 2. EATING (Chewing sequence: closed -> small open -> open -> closed -> small open -> closed)
    if (state === 'EATING') {
      const chewCycle = (time * 4.6) % 1.0
      let mouthState: MouthState
      let mouthU: number
      let mouthV: number
      let jawDrop: number

      if (chewCycle < 0.20) {
        mouthState = 'MOUTH_CLOSED'
        mouthU = 0
        mouthV = 0
        jawDrop = 0
      } else if (chewCycle < 0.45) {
        mouthState = 'MOUTH_SMALL'
        mouthU = 0
        mouthV = -0.25
        jawDrop = 0.32
      } else if (chewCycle < 0.70) {
        mouthState = 'MOUTH_OPEN'
        mouthU = 0
        mouthV = -0.50
        jawDrop = 0.62
      } else if (chewCycle < 0.85) {
        mouthState = 'MOUTH_SMALL'
        mouthU = 0
        mouthV = -0.25
        jawDrop = 0.28
      } else {
        mouthState = 'MOUTH_CLOSED'
        mouthU = 0
        mouthV = 0
        jawDrop = 0
      }

      return {
        targetEyeU: 0,
        targetEyeV: -0.5, // Comfortable happy chewing eyes
        targetMouthU: mouthU,
        targetMouthV: mouthV,
        mouthState,
        jawDropTarget: jawDrop,
      }
    }

    // 2b. DRINKING (Sipping sequence: small open -> open -> closed -> small open -> closed)
    if (state === 'DRINKING') {
      const sipCycle = (time * 3.8) % 1.0
      let mouthState: MouthState
      let mouthU: number
      let mouthV: number
      let jawDrop: number

      if (sipCycle < 0.25) {
        mouthState = 'MOUTH_SMALL'
        mouthU = 0
        mouthV = -0.25
        jawDrop = 0.28
      } else if (sipCycle < 0.50) {
        mouthState = 'MOUTH_OPEN'
        mouthU = 0
        mouthV = -0.50
        jawDrop = 0.46
      } else if (sipCycle < 0.70) {
        mouthState = 'MOUTH_CLOSED'
        mouthU = 0
        mouthV = 0
        jawDrop = 0
      } else if (sipCycle < 0.85) {
        mouthState = 'MOUTH_SMALL'
        mouthU = 0
        mouthV = -0.25
        jawDrop = 0.22
      } else {
        mouthState = 'MOUTH_CLOSED'
        mouthU = 0
        mouthV = 0
        jawDrop = 0
      }

      return {
        targetEyeU: 0,
        targetEyeV: -0.5, // Comfortable happy sipping eyes
        targetMouthU: mouthU,
        targetMouthV: mouthV,
        mouthState,
        jawDropTarget: jawDrop,
      }
    }

    // 3. TALKING (True lip-sync amplitude mapping, no locked smile)
    if (state === 'TALKING') {
      let mouthState: MouthState
      let mouthU: number
      let mouthV: number
      let jawDrop: number

      if (volume < 0.08) {
        mouthState = 'MOUTH_CLOSED'
        mouthU = 0
        mouthV = 0
        jawDrop = 0
      } else if (volume < 0.25) {
        mouthState = 'MOUTH_SMALL'
        mouthU = 0
        mouthV = -0.25
        jawDrop = 0.35 * (volume / 0.25)
      } else if (volume < 0.55) {
        mouthState = 'MOUTH_OPEN'
        mouthU = 0
        mouthV = -0.5
        jawDrop = 0.35 + 0.35 * ((volume - 0.25) / 0.3)
      } else {
        mouthState = 'MOUTH_WIDE'
        mouthU = 0.5
        mouthV = 0.0
        jawDrop = 0.7 + 0.3 * Math.min(1, (volume - 0.55) / 0.45)
      }

      return {
        targetEyeU: 0,
        targetEyeV: 0, // Normal attentive eyes while talking
        targetMouthU: mouthU,
        targetMouthV: mouthV,
        mouthState,
        jawDropTarget: jawDrop,
      }
    }

    // 4. LISTENING (Mouth closed, attentive inquisitive eyes)
    if (state === 'LISTENING') {
      return {
        targetEyeU: 0.5,
        targetEyeV: -0.5, // Attentive upward/forward gaze
        targetMouthU: 0,
        targetMouthV: 0,
        mouthState: 'MOUTH_CLOSED',
        jawDropTarget: 0,
      }
    }

    // 5. PETTING (Temporary smile & happy eyes only while active)
    if (state === 'PETTING') {
      return {
        targetEyeU: 0,
        targetEyeV: -0.5, // Blissful curved smile arc eyes (^^)
        targetMouthU: 0.5,
        targetMouthV: -0.25, // Sweet curved smile
        mouthState: 'MOUTH_SMILE',
        jawDropTarget: 0.08,
      }
    }

    // 6. HAPPY
    if (state === 'HAPPY') {
      return {
        targetEyeU: 0,
        targetEyeV: -0.5,
        targetMouthU: 0.5,
        targetMouthV: -0.25,
        mouthState: 'MOUTH_SMILE',
        jawDropTarget: 0.08,
      }
    }

    // 7. HIT (Recoil / Dazed)
    if (state === 'HIT' || this.dazedTimer > 0) {
      return {
        targetEyeU: 0,
        targetEyeV: -0.75, // Droopy dazed comic eyes
        targetMouthU: 0.5,
        targetMouthV: 0.0,
        mouthState: 'MOUTH_WIDE',
        jawDropTarget: 0.85,
      }
    }

    // 8. SOCCER / ANGRY
    if (state === 'SOCCER') {
      return {
        targetEyeU: 0,
        targetEyeV: 0,
        targetMouthU: 0.5,
        targetMouthV: 0.0,
        mouthState: 'MOUTH_WIDE',
        jawDropTarget: 0.6,
      }
    }
    if (state === 'ANGRY') {
      return {
        targetEyeU: 0.5,
        targetEyeV: -0.5,
        targetMouthU: 0,
        targetMouthV: -0.25,
        mouthState: 'MOUTH_SMALL',
        jawDropTarget: 0.3,
      }
    }

    // 9. IDLE (Default Baseline: Neutral mouth, normal eyes, zero jaw drop)
    return {
      targetEyeU: 0,
      targetEyeV: 0,
      targetMouthU: 0,
      targetMouthV: 0,
      mouthState: 'MOUTH_CLOSED',
      jawDropTarget: 0,
    }
  }

  private updateFacialAnimation(
    state: PetState,
    time: number,
    delta: number,
    voiceVolume: number
  ): void {
    // 1. Voice Volume Envelope Smoothing (Attack 38 / Decay 18 for syllable reactivity)
    const attackRate = 38
    const decayRate = 18
    const rate = voiceVolume > this.smoothedVolume ? attackRate : decayRate
    this.smoothedVolume = THREE.MathUtils.lerp(
      this.smoothedVolume,
      voiceVolume,
      1 - Math.exp(-rate * delta)
    )

    // 2. Natural Blinking Timer (Object_9)
    this.blinkTimer += delta
    if (!this.isBlinking && this.blinkTimer >= this.blinkInterval) {
      this.isBlinking = true
      this.blinkProgress = 0
      this.blinkTimer = 0
      this.blinkInterval = 3.2 + Math.random() * 2.2 // 3.2s to 5.4s
    }

    if (this.isBlinking) {
      this.blinkProgress += delta / 0.15 // 150ms blink duration
      if (this.blinkProgress >= 1) {
        this.isBlinking = false
        this.blinkProgress = 0
      }
    }

    // 3. Centralized Facial State Resolution
    const resolved = this.resolveFacialState(state, time, this.smoothedVolume)

    let targetEyeU = resolved.targetEyeU
    let targetEyeV = resolved.targetEyeV

    // Natural blinking overrides eye UV to closed eyelids
    if (this.isBlinking) {
      targetEyeU = 0.5
      targetEyeV = -0.25
    }

    // Apply eye UV coordinate shift
    if (this.eyeMesh && this.initialEyeUV) {
      const uv = this.eyeMesh.geometry.attributes.uv
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(
          i,
          this.initialEyeUV[i * 2] + targetEyeU,
          this.initialEyeUV[i * 2 + 1] + targetEyeV
        )
      }
      uv.needsUpdate = true
    }

    // Apply subtle vertical squashing on eye mesh position during blinks
    if (this.eyeMesh && this.initialEyeY) {
      const pos = this.eyeMesh.geometry.attributes.position
      const centerY = 38.86 // Midpoint of Pikachu's eyes
      const blinkFactor = this.isBlinking ? Math.sin(this.blinkProgress * Math.PI) : (state === 'PETTING' ? 0.35 : 0)
      for (let i = 0; i < pos.count; i++) {
        const origY = this.initialEyeY[i]
        pos.setY(i, origY + (centerY - origY) * blinkFactor * 0.9)
      }
      pos.needsUpdate = true
    }

    // 4. Cheek Swelling Animation (Object_7)
    if (this.cheekMesh && this.initialCheekX && this.initialCheekZ) {
      const pos = this.cheekMesh.geometry.attributes.position

      // Decay swelling
      if (this.leftCheekSwelling > 0) {
        this.leftCheekSwelling = Math.max(0, this.leftCheekSwelling - delta * 0.32)
      }
      if (this.rightCheekSwelling > 0) {
        this.rightCheekSwelling = Math.max(0, this.rightCheekSwelling - delta * 0.32)
      }

      if (this.leftCheekSwelling > 0 || this.rightCheekSwelling > 0) {
        for (let i = 0; i < pos.count; i++) {
          const origX = this.initialCheekX[i]
          const origZ = this.initialCheekZ[i]
          if (origX < 0 && this.leftCheekSwelling > 0) {
            pos.setX(i, origX - this.leftCheekSwelling * 0.85)
            pos.setZ(i, origZ + this.leftCheekSwelling * 0.65)
          } else if (origX > 0 && this.rightCheekSwelling > 0) {
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

    // 5. TRUE MOUTH ANIMATION & UV ATLAS SWITCHING (Object_8, texture_2 atlas)
    this.currentMouthState = resolved.mouthState
    const targetMouthU = resolved.targetMouthU
    const targetMouthV = resolved.targetMouthV
    const jawDropTarget = resolved.jawDropTarget

    // Apply mouth UV atlas coordinate shift
    if (this.mouthMesh && this.initialMouthUV) {
      const uv = this.mouthMesh.geometry.attributes.uv
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(
          i,
          this.initialMouthUV[i * 2] + targetMouthU,
          this.initialMouthUV[i * 2 + 1] + targetMouthV
        )
      }
      uv.needsUpdate = true
    }

    // Smooth mouth jaw drop interpolation
    this.mouthOpenProgress = THREE.MathUtils.lerp(
      this.mouthOpenProgress,
      jawDropTarget,
      1 - Math.exp(-24 * delta)
    )
    if (jawDropTarget === 0 && this.mouthOpenProgress < 0.005) {
      this.mouthOpenProgress = 0
    }

    // Articulate lower lip & jaw vertices for physical opening
    if (this.mouthMesh && this.initialMouthY && this.initialMouthZ) {
      const pos = this.mouthMesh.geometry.attributes.position
      for (let i = 0; i < pos.count; i++) {
        const origY = this.initialMouthY[i]
        const origZ = this.initialMouthZ[i]
        if (this.mouthOpenProgress === 0) {
          pos.setY(i, origY)
          pos.setZ(i, origZ)
        } else if (origY <= 33.85) {
          const drop = this.mouthOpenProgress * (33.85 - origY + 0.8) * 0.7
          pos.setY(i, origY - drop)
          pos.setZ(i, origZ - this.mouthOpenProgress * 0.3)
        } else {
          pos.setY(i, origY + this.mouthOpenProgress * 0.15)
        }
      }
      pos.needsUpdate = true
    }
  }

  private updateBones(
    state: PetState,
    time: number,
    delta: number
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
    } else if (state === 'LISTENING') {
      headZ = Math.sin(time * 1.5) * 0.1 // curious tilt
      headY = Math.sin(time * 0.8) * 0.06 + this.currentLookYaw * 0.4 // gentle gaze tracking
      headX = -0.05
    } else if (state === 'TALKING') {
      headX = Math.sin(time * 10) * 0.08 * (0.3 + this.smoothedVolume * 0.7)
      headY = Math.cos(time * 4) * 0.04
    } else if (state === 'PETTING' || state === 'HAPPY') {
      if (this.isBeingPetted) {
        headX = -0.24 + this.pettingFollowY * 0.14
        headZ = Math.sin(time * 5) * 0.08
        headY = Math.sin(time * 3) * 0.04
      } else {
        headX = -0.22 // tilted up with pleasure
        headZ = Math.sin(time * 6) * 0.08
      }
    } else if (state === 'HIT') {
      if (this.activeHitLocation === 'HEAD' || this.activeHitLocation === 'FOREHEAD') {
        headX = -0.55 * this.hitComboScale
      } else if (this.activeHitLocation === 'LEFT_CHEEK' || this.activeHitLocation === 'SIDES') {
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
    } else if (state === 'LISTENING') {
      lEarX = 0.14
      rEarX = 0.14
      lEarZ = 0.06 + (this.earTwitchActive > 0 ? Math.sin(time * 35) * 0.1 : 0)
      rEarZ = -0.06 - (this.earTwitchActive > 0 ? Math.sin(time * 35) * 0.1 : 0)
    } else if (state === 'TALKING') {
      lEarZ = Math.sin(time * 10) * 0.08 * (0.3 + this.smoothedVolume)
      rEarZ = -Math.sin(time * 10) * 0.08 * (0.3 + this.smoothedVolume)
    } else if (state === 'PETTING' || state === 'HAPPY') {
      lEarZ = 0.22 + Math.sin(time * 6) * 0.08
      rEarZ = -0.22 - Math.sin(time * 6) * 0.08
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
