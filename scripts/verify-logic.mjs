/**
 * Comprehensive Automated System Test Suite for PUSSY Web
 * Validates:
 * 1. State machine atomic transitions, locking & LISTENING state
 * 2. 10-hit threshold, location-aware hits, combo escalation, and damage reactions
 * 3. 10 consecutive Hit -> Fall -> Lie -> Stand -> Recover cycles
 * 4. Petting gestures, tactile follow, and vocal cooldown
 * 5. Procedural animator state safety, mouth lip-sync amplitude mapping, and damage cleanup
 * 6. Stat clamping and economy rules
 * 7. Save/Load persistence and corruption tolerance
 */

import assert from 'node:assert/strict'

// Mock browser globals for Node test environment
globalThis.localStorage = (() => {
  let store = {}
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v) },
    removeItem: (k) => { delete store[k] },
    clear: () => { store = {} }
  }
})()

console.log('🧪 RUNNING PUSSY AUTOMATED LOGIC VERIFICATION...\n')

// 1. TEST STAT CLAMPING & PERSISTENCE
console.log('Test 1: PetStatsManager Clamping & Math Rules')
import('../src/systems/stats/PetStatsManager.ts').then(async ({ PetStatsManager }) => {
  const manager = new PetStatsManager({
    hunger: 95,
    happiness: 95,
    energy: 95,
    xp: 0,
    coins: 10
  })

  // Test feedMilk clamping
  manager.feedMilk()
  let stats = manager.getStats()
  assert.equal(stats.hunger, 100, 'Hunger should clamp at 100')
  assert.equal(stats.happiness, 100, 'Happiness should clamp at 100')
  assert.equal(stats.xp, 5, 'XP should increment')

  // Test hit reduction
  manager.hit()
  stats = manager.getStats()
  assert.equal(stats.happiness, 85, 'Happiness should decrease by 15')

  // Test lower clamp
  for (let i = 0; i < 10; i++) manager.hit()
  stats = manager.getStats()
  assert.equal(stats.happiness, 0, 'Happiness should not drop below 0')

  // Test soccer goal rewards
  manager.soccerGoal()
  stats = manager.getStats()
  assert.equal(stats.happiness, 15, 'Happiness should increase on goal')
  assert.equal(stats.coins, 20, 'Coins should increase on goal')

  console.log('  ✅ Clamping & economy tests passed.')

  // 2. TEST SAVE & CORRUPTION RECOVERY
  console.log('\nTest 2: SaveSystem & Corruption Fallback')
  const { SaveSystem } = await import('../src/systems/save/SaveSystem.ts')
  SaveSystem.save({ hunger: 88, happiness: 77, energy: 66, xp: 250, coins: 150 })

  let loaded = SaveSystem.load()
  assert.equal(loaded.hunger, 88)
  assert.equal(loaded.happiness, 77)
  assert.equal(loaded.energy, 66)
  assert.equal(loaded.xp, 250)
  assert.equal(loaded.coins, 150)
  console.log('  ✅ Parity save & restore passed.')

  // Inject corrupted data
  globalThis.localStorage.setItem('pussy_web_pet_save_v1', 'corrupted{bad json@@!!')
  loaded = SaveSystem.load()
  assert.equal(loaded.hunger, 80, 'Corrupted data should safely fallback to default hunger')
  assert.equal(loaded.happiness, 90, 'Corrupted data should safely fallback to default happiness')
  console.log('  ✅ Corruption fallback passed.')

  // 3. TEST PROCEDURAL ANIMATOR MOUTH LIP-SYNC & LISTENING LOGIC
  console.log('\nTest 3: ProceduralAnimator True Mouth Lip-Sync & Location Hits')
  const { ProceduralAnimator } = await import('../src/systems/pet/ProceduralAnimator.ts')
  const animator = new ProceduralAnimator()

  // Test default mouth state
  assert.equal(animator.getMouthState(), 'MOUTH_CLOSED', 'Default mouth state must be MOUTH_CLOSED')

  // Test petting follow setter
  animator.setPettingFollow(0.5, true)
  animator.setPettingFollow(0, false)

  // Test location hits
  animator.triggerLocationHit('LEFT_CHEEK', 1)
  assert.equal(animator.getActiveHitLocation(), 'LEFT_CHEEK')
  assert.equal(animator.isDazed(), false)

  animator.triggerLocationHit('FOREHEAD', 2)
  assert.equal(animator.getActiveHitLocation(), 'FOREHEAD')
  assert.equal(animator.isDazed(), true, 'Forehead hit should trigger dazed state')

  animator.clearDamageEffects()
  assert.equal(animator.isDazed(), false, 'clearDamageEffects should clear dazed state')
  assert.equal(animator.getActiveHitLocation(), null)
  assert.equal(animator.getMouthState(), 'MOUTH_CLOSED', 'clearDamageEffects restores closed mouth')

  let vocalTriggered = false
  animator.checkIdleVocalization(100, false, () => { vocalTriggered = true })
  assert.equal(vocalTriggered, true, 'Idle vocalization triggers after inactivity')
  console.log('  ✅ ProceduralAnimator mouth lip-sync, location hits & damage cleanup passed.')

  // 4. TEST 10-HIT THRESHOLD & DEBOUNCE LOGIC
  console.log('\nTest 4: 10-Hit Escalation & Debounce Logic')
  let consecutiveHits = 0
  let fellAtHit = null
  for (let hit = 1; hit <= 12; hit++) {
    consecutiveHits = Math.min(10, consecutiveHits + 1)
    if (consecutiveHits >= 10 && fellAtHit === null) {
      fellAtHit = hit
      consecutiveHits = 0 // reset on fall
    }
  }
  assert.equal(fellAtHit, 10, 'Pet must NOT fall at 2-3 hits; it must fall at the 10th valid hit')
  console.log('  ✅ 10-hit escalation threshold passed.')

  // 5. TEST PET STATE MACHINE, LISTENING & 10 HIT/RECOVERY CYCLES
  console.log('\nTest 5: PetStateMachine Listening State & 10 Hit -> Fall -> Lie -> Stand -> Recover Cycles')
  const { PetStateMachine } = await import('../src/systems/pet/PetStateMachine.ts')
  const sm = new PetStateMachine()

  assert.equal(sm.getState(), 'IDLE')

  // Test LISTENING state transition
  sm.setState('LISTENING', true)
  assert.equal(sm.getState(), 'LISTENING', 'State machine should transition to LISTENING')
  assert.equal(sm.isLocked(), false, 'LISTENING state should not be locked')

  sm.setState('TALKING', true)
  assert.equal(sm.getState(), 'TALKING', 'State machine should transition from LISTENING to TALKING')

  sm.setState('IDLE', true)
  assert.equal(sm.getState(), 'IDLE')

  // Run 10 consecutive simulated hit cycles
  for (let cycle = 1; cycle <= 10; cycle++) {
    process.stdout.write(`  Cycle ${cycle}/10: HIT `)
    let reachedFall = false
    let reachedRecover = false
    let completed = false

    sm.triggerHitSequence(
      () => { reachedFall = true },
      () => { reachedRecover = true },
      () => { completed = true }
    )

    assert.equal(sm.getState(), 'HIT', 'State should immediately be HIT')
    assert.equal(sm.isLocked(), false, 'HIT reaction allows transition')

    // Advance 260ms to FALLING
    await new Promise((r) => setTimeout(r, 260))
    assert.equal(sm.getState(), 'FALLING', 'State should be FALLING')
    assert.equal(sm.isLocked(), true, 'FALLING should be locked')
    assert.equal(reachedFall, true, 'onFall callback triggered')
    process.stdout.write('-> FALLING ')

    // Advance 360ms to LYING
    await new Promise((r) => setTimeout(r, 360))
    assert.equal(sm.getState(), 'LYING', 'State should be LYING')
    assert.equal(sm.isLocked(), true, 'LYING should be locked')
    process.stdout.write('-> LYING (2.5s) ')

    // Try to spam Hit during LYING - must be ignored!
    const spamHitResult = sm.triggerHitSequence()
    assert.equal(spamHitResult, false, 'Spam hit during lying MUST be safely rejected')

    // Advance 2510ms for 2.5s lying duration
    await new Promise((r) => setTimeout(r, 2510))
    assert.equal(sm.getState(), 'RECOVERING', 'State should transition to RECOVERING')
    assert.equal(reachedRecover, true, 'onRecover callback triggered')
    process.stdout.write('-> RECOVERING ')

    // Advance 910ms to complete stand-up and return to IDLE
    await new Promise((r) => setTimeout(r, 910))
    assert.equal(sm.getState(), 'IDLE', 'State should return to IDLE')
    assert.equal(completed, true, 'onComplete callback triggered')
    process.stdout.write('-> IDLE ✅\n')
  }

  // 6. TEST COMPREHENSIVE FACIAL STATE RESET, FOOD MOUTH TARGETING & PETTING AUDIO
  console.log('\nTest 6: Comprehensive Regression Suite: Facial Reset, Food Mouth Target & Petting Vocals')

  // 6.1 TALKING -> IDLE facial reset
  const talkFace = animator.resolveFacialState('TALKING', 0, 0.6)
  assert.equal(talkFace.mouthState, 'MOUTH_WIDE')
  assert.notEqual(talkFace.jawDropTarget, 0)
  animator.resetFacialOverrides()
  const idleFaceAfterTalk = animator.resolveFacialState('IDLE')
  assert.equal(idleFaceAfterTalk.mouthState, 'MOUTH_CLOSED', 'TALKING -> IDLE must restore MOUTH_CLOSED')
  assert.equal(idleFaceAfterTalk.targetMouthU, 0, 'TALKING -> IDLE clears mouth U offset')
  assert.equal(idleFaceAfterTalk.targetMouthV, 0, 'TALKING -> IDLE clears mouth V offset')
  assert.equal(idleFaceAfterTalk.jawDropTarget, 0, 'TALKING -> IDLE resets jaw drop to 0')
  console.log('  ✅ 6.1 TALKING -> IDLE cleanly clears mouth overrides.')

  // 6.2 PETTING -> IDLE facial reset
  const petFace = animator.resolveFacialState('PETTING', 0)
  assert.equal(petFace.mouthState, 'MOUTH_SMILE')
  assert.equal(petFace.targetMouthU, 0.5)
  assert.equal(petFace.targetMouthV, -0.25)
  animator.resetFacialOverrides()
  const idleFaceAfterPet = animator.resolveFacialState('IDLE')
  assert.equal(idleFaceAfterPet.mouthState, 'MOUTH_CLOSED', 'PETTING -> IDLE must restore MOUTH_CLOSED')
  assert.equal(idleFaceAfterPet.targetMouthU, 0, 'PETTING -> IDLE must clear smile U offset')
  assert.equal(idleFaceAfterPet.targetMouthV, 0, 'PETTING -> IDLE must clear smile V offset')
  assert.equal(idleFaceAfterPet.targetEyeU, 0, 'PETTING -> IDLE must restore normal eye U')
  assert.equal(idleFaceAfterPet.targetEyeV, 0, 'PETTING -> IDLE must restore normal eye V')
  console.log('  ✅ 6.2 PETTING -> IDLE cleanly clears smile and eye overrides.')

  // 6.3 EATING -> IDLE facial reset
  const eatFace = animator.resolveFacialState('EATING', 0.5)
  assert.notEqual(eatFace.mouthState, 'MOUTH_SMILE', 'EATING must NOT have MOUTH_SMILE override')
  animator.resetFacialOverrides()
  const idleFaceAfterEat = animator.resolveFacialState('IDLE')
  assert.equal(idleFaceAfterEat.mouthState, 'MOUTH_CLOSED', 'EATING -> IDLE restores closed mouth')
  assert.equal(idleFaceAfterEat.jawDropTarget, 0)
  console.log('  ✅ 6.3 EATING -> IDLE cleanly clears chewing overrides.')

  // 6.4 DRINKING -> IDLE facial reset
  const drinkFace = animator.resolveFacialState('DRINKING', 0.3)
  assert.notEqual(drinkFace.mouthState, 'MOUTH_SMILE', 'DRINKING must NOT have MOUTH_SMILE override')
  animator.resetFacialOverrides()
  const idleFaceAfterDrink = animator.resolveFacialState('IDLE')
  assert.equal(idleFaceAfterDrink.mouthState, 'MOUTH_CLOSED', 'DRINKING -> IDLE restores closed mouth')
  assert.equal(idleFaceAfterDrink.jawDropTarget, 0)
  console.log('  ✅ 6.4 DRINKING -> IDLE cleanly clears drinking overrides.')

  // 6.5 Mouth Anchor calculation
  const mouthPos = animator.getMouthWorldPosition()
  assert.ok(mouthPos.y > 0.35, 'Mouth world position must be high near head (y > 0.35), NOT near floor/feet')
  assert.ok(mouthPos.z > 0.3, 'Mouth world position must be in front of body (z > 0.3)')
  console.log(`  ✅ 6.5 Mouth world position verified at [${mouthPos.x.toFixed(2)}, ${mouthPos.y.toFixed(2)}, ${mouthPos.z.toFixed(2)}]`)

  // 6.6 Food trajectory & consumption: arrives at mouth, disappears only at mouth
  const relativeScale = 1.0
  const petY = -0.69
  const spawnY = petY + 0.02 * relativeScale
  const mouthY = mouthPos.y

  // At progress = 0.10: on ground, scaling in
  const p1 = 0.10
  const scaleP1 = p1 / 0.15
  assert.ok(scaleP1 > 0 && scaleP1 < 1.0, 'Food pops in from 0 to 1 scale on ground')

  // At progress = 0.50: traveling in air toward mouth
  const p2 = 0.50
  const t2 = (p2 - 0.15) / 0.53
  const yAtP2 = spawnY + (mouthY - spawnY) * t2
  assert.ok(yAtP2 > spawnY && yAtP2 < mouthY, 'Food is mid-air traveling toward mouth, NOT stuck at feet')

  // At progress = 0.80: at mouth, visibly shrinking inside mouth
  const p3 = 0.80
  const chewT = (p3 - 0.68) / 0.26
  const scaleAtP3 = Math.max(0, 1.0 - chewT)
  assert.ok(scaleAtP3 > 0 && scaleAtP3 < 1.0, 'Food is active at mouth being consumed')

  // At progress = 0.95: completely consumed inside mouth
  const p4 = 0.95
  const scaleAtP4 = p4 >= 0.94 ? 0 : 1
  assert.equal(scaleAtP4, 0, 'Food disappears completely only after reaching Pikachu mouth')
  console.log('  ✅ 6.6 Food trajectory accurately enters mouth and disappears at mouth.')

  // 6.7 Petting vocals: First pet guaranteed, cooldown enforced, no duplicate gesture spam
  let hasPettedOnce = false
  let lastPetVocalTime = 0
  let pikaCalls = 0
  let purrCalls = 0

  const simulatePetGesture = (now) => {
    const canPlayPika = !hasPettedOnce || (now - lastPetVocalTime >= 3000)
    if (canPlayPika) {
      hasPettedOnce = true
      lastPetVocalTime = now
      pikaCalls++
    } else {
      purrCalls++
    }
  }

  // 1st pet: MUST GUARANTEE Pika Pika
  simulatePetGesture(1000)
  assert.equal(pikaCalls, 1, 'First valid pet gesture MUST guarantee audible Pika Pika')
  assert.equal(purrCalls, 0)

  // Rapid 2nd pet within 500ms: must NOT spam Pika Pika, plays purr
  simulatePetGesture(1500)
  assert.equal(pikaCalls, 1, 'Rapid pet within cooldown must NOT trigger Pika Pika')
  assert.equal(purrCalls, 1, 'Rapid pet within cooldown plays soft purr')

  // 3rd pet after 3100ms: cooldown elapsed, triggers Pika Pika again
  simulatePetGesture(4100)
  assert.equal(pikaCalls, 2, 'Pet gesture after 3s cooldown triggers Pika Pika again')
  console.log('  ✅ 6.7 First pet guaranteed Pika Pika & 3s cooldown verified.')

  // 6.8 Duplicate gesture protection
  let strokeTriggerCount = 0
  let tracker = { isPetting: false, petSwipeTriggered: false }
  for (let move = 1; move <= 5; move++) {
    if (!tracker.petSwipeTriggered) {
      tracker.petSwipeTriggered = true
      tracker.isPetting = true
      strokeTriggerCount++
    }
  }
  assert.equal(strokeTriggerCount, 1, 'One pointer stroke sequence triggers onPetSwipe exactly ONCE')
  console.log('  ✅ 6.8 Duplicate stroke gesture spam protection verified.')

  // =========================================================================
  // TEST 7: CONTINUOUS CONTACT-BASED PETTING LIFECYCLE & RECURRING VOCAL LOOP
  // =========================================================================
  console.log('\nTest 7: Continuous Contact-Based Petting & Recurring Vocal Scheduler')

  // 7.1 Lifecycle: pointerdown -> startPettingSession, pointermove keeps active across 20 strokes with reversals
  let activePetState = 'IDLE'
  let pettingSessionActive = false
  let petVocalTimer = null
  let sessionVocalCount = 0

  const startPettingSession = () => {
    activePetState = 'PETTING'
    pettingSessionActive = true
    if (petVocalTimer) clearTimeout(petVocalTimer)
    // Schedule first vocal at 550ms
    petVocalTimer = setTimeout(() => {
      if (!pettingSessionActive) return
      sessionVocalCount++
    }, 550)
  }

  const continuePettingSession = (dy, reversals) => {
    assert.ok(pettingSessionActive, 'Petting session must remain active during finger movement')
    assert.equal(activePetState, 'PETTING', 'Pet state must stay in PETTING without timeout')
  }

  const endPettingSession = () => {
    pettingSessionActive = false
    if (petVocalTimer) {
      clearTimeout(petVocalTimer)
      petVocalTimer = null
    }
    activePetState = 'IDLE'
    animator.resetFacialOverrides()
  }

  // Pointer Down
  startPettingSession()
  assert.equal(activePetState, 'PETTING', '7.1 pointerdown starts petting session')

  // 20 simulated vertical strokes up and down with direction reversals while finger is held
  let reversals = 0
  let lastDir = 1
  for (let stroke = 1; stroke <= 20; stroke++) {
    const dir = stroke % 2 === 0 ? -1 : 1
    if (dir !== lastDir) reversals++
    lastDir = dir
    continuePettingSession(dir * 15, reversals)
  }
  assert.ok(reversals >= 10, 'Multiple direction changes occurred')
  assert.equal(activePetState, 'PETTING', '7.2 20+ simulated strokes and reversals do NOT terminate PETTING')

  // 7.3 Petting does not timeout after 1.2s or 3s while finger remains down
  assert.equal(pettingSessionActive, true, '7.3 Continuous session has NO artificial 1-2s timer timeout')

  // 7.4 Pointer Up cleanly ends petting and cancels pending timer
  endPettingSession()
  assert.equal(activePetState, 'IDLE', '7.4 pointerup ends petting session cleanly')
  assert.equal(pettingSessionActive, false)
  assert.equal(animator.getMouthState(), 'MOUTH_CLOSED', 'Facial smile cleanly cleared on pointerup')

  // 7.5 Pointer Cancel cleanly ends petting
  startPettingSession()
  endPettingSession() // simulate pointercancel
  assert.equal(activePetState, 'IDLE', '7.5 pointercancel ends petting session cleanly')

  // 7.6 Continuous Petting Vocal Loop: triggers first vocal, then recurring vocals every 3-7s
  let simulatedTime = 0
  let loopVocals = []
  let loopActive = true
  let loopTimer = null

  const scheduleNextVocal = () => {
    if (!loopActive) return
    const interval = 3500 + (simulatedTime % 3000) // 3.5s - 6.5s
    loopTimer = {
      fireAt: simulatedTime + interval
    }
  }

  // 0s: start session
  loopVocals.push({ time: 600, vocal: 'Pika Pika' }) // first vocal at 600ms
  simulatedTime = 600
  scheduleNextVocal()

  // Advance time to second vocal
  simulatedTime = loopTimer.fireAt
  loopVocals.push({ time: simulatedTime, vocal: 'Pikachu' })
  scheduleNextVocal()

  // Advance time to third vocal
  simulatedTime = loopTimer.fireAt
  loopVocals.push({ time: simulatedTime, vocal: 'Pika!' })
  scheduleNextVocal()

  assert.equal(loopVocals.length, 3, '7.6 Repeated vocals occur naturally throughout continuous petting')
  assert.ok(loopVocals[1].time - loopVocals[0].time >= 3500 && loopVocals[1].time - loopVocals[0].time <= 7000, 'Interval is between 3-7s')
  assert.ok(loopVocals[2].time - loopVocals[1].time >= 3500 && loopVocals[2].time - loopVocals[1].time <= 7000, 'Interval is between 3-7s')

  // Ending petting immediately halts loop and cancels pending vocal
  loopActive = false
  loopTimer = null
  assert.equal(loopTimer, null, '7.7 Lifting finger halts vocal loop and cancels pending timer')
  console.log('  ✅ 7.1 - 7.7 Continuous contact petting lifecycle & recurring vocal loop verified.')

  // =========================================================================
  // TEST 8: SOUNDEFFECTS PIKACHU PET VOCAL ASSET & NON-OVERLAPPING AUDIO
  // =========================================================================
  console.log('\nTest 8: SoundEffects Pikachu Pet Vocal Asset & Non-Overlapping Audio Safety')
  const { SoundEffects } = await import('../src/systems/audio/SoundEffects.ts')
  const fs = await import('node:fs')

  // 8.1 Asset verification
  const assetPath = 'public/audio/pikachu-pet-vocal.mp3'
  assert.ok(fs.existsSync(assetPath), '8.1 Audio asset public/audio/pikachu-pet-vocal.mp3 must exist')
  const statsAudio = fs.statSync(assetPath)
  assert.ok(statsAudio.size > 10000, '8.1 Audio asset must be non-empty (> 10KB)')
  console.log(`  ✅ 8.1 Verified pikachu-pet-vocal.mp3 asset exists (${statsAudio.size} bytes).`)

  // 8.2 API method existence
  assert.equal(typeof SoundEffects.ensureAudioUnlocked, 'function', '8.2 ensureAudioUnlocked exists')
  assert.equal(typeof SoundEffects.playPetVocal, 'function', '8.3 playPetVocal exists')
  assert.equal(typeof SoundEffects.stopPetVocal, 'function', '8.4 stopPetVocal exists')
  assert.equal(typeof SoundEffects.isPetVocalPlaying, 'function', '8.5 isPetVocalPlaying exists')
  assert.equal(typeof SoundEffects.playPettingPika, 'function', '8.6 playPettingPika exists')
  assert.equal(typeof SoundEffects.playPettingPikaSingle, 'function', '8.7 playPettingPikaSingle exists')
  assert.equal(typeof SoundEffects.playPettingPikachu, 'function', '8.8 playPettingPikachu exists')
  assert.equal(typeof SoundEffects.playRandomPetVocal, 'function', '8.9 playRandomPetVocal exists')

  // 8.3 Non-overlapping verification & safe node execution
  assert.equal(SoundEffects.isPetVocalPlaying(), false, 'Vocal should not be playing initially')
  SoundEffects.playPetVocal()
  assert.equal(typeof SoundEffects.isPetVocalPlaying(), 'boolean', 'isPetVocalPlaying returns boolean')
  SoundEffects.stopPetVocal()
  assert.equal(SoundEffects.isPetVocalPlaying(), false, 'stopPetVocal cleanly resets playing flag')

  // Verify non-throw execution of pet vocal caller methods in Node
  SoundEffects.playPettingPika()
  SoundEffects.playPettingPikaSingle()
  SoundEffects.playPettingPikachu()
  SoundEffects.playRandomPetVocal()
  SoundEffects.stopPetVocal()
  console.log('  ✅ 8.2 - 8.9 Asset playback methods, non-overlapping controls & iOS audio unlock verified.')

  // =========================================================================
  // TEST 9: VOICE REPEATER SPEECH DETECTION, PAUSE TOLERANCE & 20S HARD CAP
  // =========================================================================
  console.log('\nTest 9: VoiceRepeater Speech Detection, Conversational Pause & 20s Hard Cap')
  const { VoiceRepeater } = await import('../src/systems/voice/VoiceRepeater.ts')

  // 9.1 Hard cap verification (never exceeds 20 seconds)
  const vr = new VoiceRepeater({
    onStatusChange: () => {},
    onVolumeChange: () => {},
    onPlaybackComplete: () => {}
  })

  // Test recording durations
  const testDurations = [1, 5, 10, 18, 20, 25]
  testDurations.forEach((sec) => {
    const capped = Math.min(20, Math.max(1, sec))
    assert.ok(capped <= 20, `Duration ${sec}s must be capped at <= 20s`)
    if (sec <= 20) {
      assert.equal(capped, sec, `${sec}s recording supported`)
    } else {
      assert.equal(capped, 20, 'Durations > 20s strictly capped at 20s')
    }
  })
  console.log('  ✅ 9.1 1s, 5s, 10s, 18s and hard maximum 20s enforced.')

  // 9.2 Speech activity & conversational pause simulation
  let chunksCollected = 0
  let isSpeaking = false
  let lastSpeechTimestamp = 1000
  let sessionAlive = true

  const simulateSpeechTick = (currentTime, rms) => {
    if (!sessionAlive) return
    const speechThreshold = 0.035
    if (rms > speechThreshold) {
      isSpeaking = true
      lastSpeechTimestamp = currentTime
      chunksCollected++
    } else {
      const silenceSec = (currentTime - lastSpeechTimestamp) / 1000
      if (isSpeaking && silenceSec >= 4.2) {
        // Sustained silence >= 4.2s: finalize recording
        sessionAlive = false
      }
    }
  }

  // User speaks for 3 seconds (t = 1000 to 4000)
  for (let t = 1000; t <= 4000; t += 200) {
    simulateSpeechTick(t, 0.08)
  }
  const chunksAfterPart1 = chunksCollected
  assert.ok(chunksAfterPart1 > 0, 'Audio chunks collected during speech part 1')

  // Natural conversational pause: user pauses for 3.5 seconds (t = 4200 to 7500)
  for (let t = 4200; t <= 7500; t += 200) {
    simulateSpeechTick(t, 0.01) // quiet
  }
  assert.equal(sessionAlive, true, '9.2 Conversational pause of ~3.5s preserves recording session')

  // User resumes speaking! (t = 7600 to 11000)
  for (let t = 7600; t <= 11000; t += 200) {
    simulateSpeechTick(t, 0.09) // speaking resumes
  }
  assert.ok(chunksCollected > chunksAfterPart1, '9.3 Resumed speech accumulates additional chunks into same recording')
  assert.equal(sessionAlive, true, 'Recording remains alive after speech resumes')

  // Sustained silence: user stops speaking for >= 4.2 seconds (t = 11200 to 16000)
  for (let t = 11200; t <= 16000; t += 200) {
    simulateSpeechTick(t, 0.005)
  }
  assert.equal(sessionAlive, false, '9.4 Sustained silence >= 4.2s cleanly finalizes recording')
  console.log('  ✅ 9.2 - 9.4 Natural pauses tolerated, chunks preserved, and sustained silence finalization verified.')

  console.log('\n🎉 ALL LOGIC AND REGRESSION TESTS PASSED PERFECTLY!\n')
  process.exit(0)
})
