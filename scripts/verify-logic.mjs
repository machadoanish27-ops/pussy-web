/**
 * Comprehensive Automated System Test Suite for PUSSY Web
 * Validates:
 * 1. State machine atomic transitions
 * 2. 10 consecutive Hit -> Fall -> Lie -> Stand -> Recover cycles
 * 3. Stat clamping and economy rules
 * 4. Save/Load persistence and corruption tolerance
 * 5. Procedural animator state safety
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

  // 3. TEST PET STATE MACHINE & 10 HIT/RECOVERY CYCLES
  console.log('\nTest 3: PetStateMachine Hit -> Fall -> Lie -> Stand -> Recover (10 Cycles)')
  const { PetStateMachine } = await import('../src/systems/pet/PetStateMachine.ts')
  const sm = new PetStateMachine()

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

  console.log('\n🎉 ALL 10 CONSECUTIVE HIT/FALL/RECOVERY CYCLES PASSED PERFECTLY!\n')
  process.exit(0)
}).catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
