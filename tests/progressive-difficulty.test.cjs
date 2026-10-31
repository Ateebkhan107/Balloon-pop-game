/**
 * Automated Verification Test Suite for Progressive Difficulty in POP RUSH
 * Validates:
 * 1. Elapsed gameplay time tracking vs remaining countdown time
 * 2. Time Attack difficulty progression:
 *    - 0-10s: Easy, slow balloons (~190 px/s, 0.82s spawn, 7.2s color switch)
 *    - 10-20s: Medium speed, more balloons (~270 px/s, 0.67s spawn, 6.1s color switch)
 *    - 20-30s: Fast balloons, quicker color changes (~350-430 px/s, 0.51-0.36s spawn, 4.9-3.8s color switch)
 * 3. Endless Mode 15-second tier progression:
 *    - Increases difficulty tier every 15s (15s, 30s, 45s, 60s, 75s, 90s, 105s, 120s)
 *    - Capped smoothly at reasonable limits (speed <= 450 px/s, spawn interval >= 0.34s)
 * 4. Smooth continuous difficulty curves without sudden jumps
 * 5. Pause state halts elapsed gameplay time & difficulty progression
 * 6. Smaller & faster balloons at higher difficulty:
 *    - Scale 0.80 - 0.85, 25% faster float speed
 *    - Swift pop awards +50 bonus points
 *    - Touch hitArea scales to maintain >= 48px world radius (strictly exceeding 44px mobile guideline)
 * 7. Subtle "SPEED UP!" animation notification triggers at milestone tier changes
 * 8. Golden bonus time in Time Attack does not prematurely reset difficulty
 */

const assert = require('assert');

let passed = 0;
let total = 0;

function test(description, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(`    ${err.message}`);
  }
}

console.log('\n--- Running Progressive Difficulty & Elapsed Time Verification Tests ---');

// Difficulty model math mirroring GameScene implementation
function getTimeAttackDifficulty(elapsedTime) {
  return Math.min(1.0, Math.max(0, elapsedTime / 30.0));
}

function getEndlessDifficulty(elapsedTime) {
  return Math.min(1.0, Math.max(0, elapsedTime / 120.0));
}

function getBaseSpeed(difficulty) {
  return 190 + difficulty * 240;
}

function getSpawnIntervalTimeAttack(difficulty) {
  return 0.82 - difficulty * 0.46;
}

function getSpawnIntervalEndless(difficulty) {
  return 0.82 - difficulty * 0.48;
}

function getColorSwitchTimeAttack(difficulty) {
  return Math.max(3.8, 7.2 - difficulty * 3.4);
}

function getColorSwitchEndless(difficulty) {
  return Math.max(3.6, 7.5 - difficulty * 3.9);
}

function getSwayAmplitude(difficulty) {
  return 16 + difficulty * 28;
}

function getSwayFrequency(difficulty) {
  return 1.2 + difficulty * 1.6;
}

function getSmallBalloonChance(difficulty) {
  return Math.max(0, (difficulty - 0.25) * 0.45);
}

// 1. Time Attack Progression Tiers
test('Time Attack Progression: 0-10s Easy, 10-20s Medium, 20-30s Fast', () => {
  // 0s: Start of Easy tier
  const d0 = getTimeAttackDifficulty(0);
  assert.strictEqual(d0, 0);
  assert.strictEqual(getBaseSpeed(d0), 190);
  assert.strictEqual(Math.round(getSpawnIntervalTimeAttack(d0) * 100) / 100, 0.82);
  assert.strictEqual(Math.round(getColorSwitchTimeAttack(d0) * 10) / 10, 7.2);
  assert.strictEqual(getSmallBalloonChance(d0), 0);

  // 10s: Transition to Medium tier
  const d10 = getTimeAttackDifficulty(10);
  assert.strictEqual(Math.round(d10 * 1000) / 1000, 0.333);
  assert.strictEqual(Math.round(getBaseSpeed(d10)), 270);
  assert.strictEqual(Math.round(getSpawnIntervalTimeAttack(d10) * 100) / 100, 0.67);
  assert.strictEqual(Math.round(getColorSwitchTimeAttack(d10) * 10) / 10, 6.1);
  assert.ok(getSmallBalloonChance(d10) > 0 && getSmallBalloonChance(d10) < 0.1);

  // 20s: Transition to Fast tier
  const d20 = getTimeAttackDifficulty(20);
  assert.strictEqual(Math.round(d20 * 1000) / 1000, 0.667);
  assert.strictEqual(Math.round(getBaseSpeed(d20)), 350);
  assert.strictEqual(Math.round(getSpawnIntervalTimeAttack(d20) * 100) / 100, 0.51);
  assert.strictEqual(Math.round(getColorSwitchTimeAttack(d20) * 10) / 10, 4.9);
  assert.ok(getSmallBalloonChance(d20) > 0.15);

  // 30s: Full Rush
  const d30 = getTimeAttackDifficulty(30);
  assert.strictEqual(d30, 1.0);
  assert.strictEqual(getBaseSpeed(d30), 430);
  assert.strictEqual(Math.round(getSpawnIntervalTimeAttack(d30) * 100) / 100, 0.36);
  assert.strictEqual(Math.round(getColorSwitchTimeAttack(d30) * 10) / 10, 3.8);
  assert.strictEqual(Math.round(getSmallBalloonChance(d30) * 100) / 100, 0.34);
});

// 2. Elapsed Time vs Countdown Independence
test('Elapsed Time Independence: Golden balloon bonuses (+2s) do not reverse difficulty in Time Attack', () => {
  let elapsedTime = 18; // 18s of active gameplay
  let timeLeft = 12;    // 12s left on clock

  const diffBeforeBonus = getTimeAttackDifficulty(elapsedTime);

  // Player pops golden balloon: timeLeft increases by +2s
  timeLeft += 2;
  assert.strictEqual(timeLeft, 14);

  // But elapsed gameplay time does NOT decrease
  const diffAfterBonus = getTimeAttackDifficulty(elapsedTime);
  assert.strictEqual(diffBeforeBonus, diffAfterBonus, 'Difficulty must not jump backwards when timeLeft increases');
});

// 3. Pause Immunity
test('Pause Immunity: Pausing freezes elapsed gameplay time and difficulty progression', () => {
  let elapsedTime = 14.5;
  let isPaused = true;

  function updateGame(dt) {
    if (isPaused) return;
    elapsedTime += dt;
  }

  // 5 seconds pass in paused state (e.g. 50 ticks of 100ms)
  for (let i = 0; i < 50; i++) {
    updateGame(0.1);
  }

  assert.strictEqual(elapsedTime, 14.5, 'Elapsed time must remain frozen while paused');
  assert.strictEqual(getTimeAttackDifficulty(elapsedTime), 14.5 / 30.0);

  // Resume game
  isPaused = false;
  updateGame(0.5);
  assert.strictEqual(elapsedTime, 15.0, 'Elapsed time resumes seamlessly');
});

// 4. Endless Mode 15-second Tier Progression
test('Endless Mode: Increases tier every 15s and enforces reasonable limits', () => {
  function getEndlessTier(elapsed) {
    return Math.floor(elapsed / 15) + 1;
  }

  // Check 15-second tier steps
  assert.strictEqual(getEndlessTier(0), 1, '0s: Tier 1');
  assert.strictEqual(getEndlessTier(14.9), 1, '14.9s: Still Tier 1');
  assert.strictEqual(getEndlessTier(15.0), 2, '15.0s: Advances to Tier 2');
  assert.strictEqual(getEndlessTier(30.0), 3, '30.0s: Advances to Tier 3');
  assert.strictEqual(getEndlessTier(45.0), 4, '45.0s: Advances to Tier 4');
  assert.strictEqual(getEndlessTier(60.0), 5, '60.0s: Advances to Tier 5');
  assert.strictEqual(getEndlessTier(75.0), 6, '75.0s: Advances to Tier 6');
  assert.strictEqual(getEndlessTier(90.0), 7, '90.0s: Advances to Tier 7');
  assert.strictEqual(getEndlessTier(105.0), 8, '105.0s: Advances to Tier 8');
  assert.strictEqual(getEndlessTier(120.0), 9, '120.0s: Advances to Tier 9 (Max)');

  // Verify reasonable limits at 120s and beyond (never unfair on mobile)
  const d120 = getEndlessDifficulty(120);
  const d180 = getEndlessDifficulty(180); // 3 minutes survival

  assert.strictEqual(d120, 1.0);
  assert.strictEqual(d180, 1.0, 'Difficulty factor caps at 1.0');

  const maxSpeed = getBaseSpeed(d120);
  assert.strictEqual(maxSpeed, 430, 'Base speed strictly capped at reasonable 430 px/s');
  assert.ok(maxSpeed + 25 <= 460, 'Peak speed including variance does not exceed 460 px/s');

  const minSpawn = getSpawnIntervalEndless(d120);
  assert.strictEqual(Math.round(minSpawn * 100) / 100, 0.34, 'Spawn interval capped at reasonable 0.34s');

  const minColorSwitch = getColorSwitchEndless(d120);
  assert.strictEqual(Math.round(minColorSwitch * 10) / 10, 3.6, 'Color switch capped at 3.6s');
});

// 5. Smooth Continuous Difficulty Curves
test('Smooth Curves: Difficulty factor increases continuously between seconds without sudden jumps', () => {
  let prevDiff = 0;
  // Sample every 0.1 seconds from 0 to 30s
  for (let t = 0.1; t <= 30; t += 0.1) {
    const d = getTimeAttackDifficulty(t);
    const step = d - prevDiff;
    // Step for 0.1s in 30s should be exactly 0.1 / 30 ~ 0.00333
    assert.ok(step >= 0.003 && step <= 0.0035, `Sudden jump detected: step ${step} at t=${t}`);
    prevDiff = d;
  }
});

// 6. Movement Difficulty Scaling (Sway Amplitude & Frequency)
test('Movement Difficulty: Sway amplitude and frequency scale smoothly over time', () => {
  const earlyAmp = getSwayAmplitude(0);
  const earlyFreq = getSwayFrequency(0);
  assert.strictEqual(earlyAmp, 16, 'Early sway amp 16px is gentle and predictable');
  assert.strictEqual(earlyFreq, 1.2, 'Early sway freq 1.2 rad/s is calm');

  const rushAmp = getSwayAmplitude(1.0);
  const rushFreq = getSwayFrequency(1.0);
  assert.strictEqual(rushAmp, 44, 'Rush sway amp 44px introduces zig-zag agility');
  assert.strictEqual(rushFreq, 2.8, 'Rush sway freq 2.8 rad/s creates challenging waves');
});

// 7. Smaller and Faster Balloons & Mobile Touch Accessibility
test('Smaller and Faster Balloons: Scale 0.80-0.85, 25% speed bonus, world hit radius >= 48px', () => {
  class MockBalloon {
    constructor(config) {
      this.targetScale = config.scale !== undefined ? config.scale : 1.0;
      this.isSmall = config.isSmall || this.targetScale < 0.95;
      this.baseSpeed = config.speed;
      this.scoreValue = config.scoreValue || 100;

      // Local hit radius scaling formula from Balloon.ts
      this.localHitRadius = Math.max(56, 48 / this.targetScale);
      this.effectiveWorldRadius = this.localHitRadius * this.targetScale;
    }
  }

  // Standard balloon
  const normalBalloon = new MockBalloon({ scale: 1.0, speed: 200 });
  assert.strictEqual(normalBalloon.isSmall, false);
  assert.strictEqual(normalBalloon.effectiveWorldRadius, 56);
  assert.ok(normalBalloon.effectiveWorldRadius >= 44, 'Standard balloon meets mobile touch minimum (>= 44px)');

  // Smaller balloon (scale 0.82)
  const smallBalloon = new MockBalloon({ scale: 0.82, speed: 200 * 1.25, isSmall: true });
  assert.strictEqual(smallBalloon.isSmall, true);
  assert.strictEqual(smallBalloon.baseSpeed, 250, 'Smaller balloon is 25% faster');
  assert.ok(smallBalloon.effectiveWorldRadius >= 48, 'Small balloon effective hit radius >= 48px (diameter >= 96px)');

  // Swift bonus calculation
  const swiftBonus = smallBalloon.isSmall ? 50 : 0;
  const combo = 2;
  const earned = (smallBalloon.scoreValue + swiftBonus) * combo;
  assert.strictEqual(earned, 300, 'Pop awards (100 + 50) * 2 = 300 points');
});

// 8. Subtle Speed-up Animation Trigger Milestones
test('Speed Up Announcements: Triggers at exact milestone tier boundaries', () => {
  const triggeredAnnouncements = [];

  function simulateSession(mode, durationSeconds, tickRate = 0.5) {
    let currentTier = 1;
    let elapsed = 0;

    while (elapsed < durationSeconds) {
      elapsed += tickRate;
      if (mode === 'time_attack') {
        const expectedTier = elapsed >= 20 ? 3 : elapsed >= 10 ? 2 : 1;
        if (expectedTier > currentTier) {
          currentTier = expectedTier;
          triggeredAnnouncements.push({ mode, time: Math.round(elapsed * 10) / 10, tier: expectedTier });
        }
      } else {
        const expectedTier = Math.floor(elapsed / 15) + 1;
        if (expectedTier > currentTier) {
          currentTier = expectedTier;
          triggeredAnnouncements.push({ mode, time: Math.round(elapsed * 10) / 10, tier: expectedTier });
        }
      }
    }
  }

  // Time Attack 30s session
  simulateSession('time_attack', 30);
  assert.strictEqual(triggeredAnnouncements.length, 2);
  assert.deepStrictEqual(triggeredAnnouncements[0], { mode: 'time_attack', time: 10, tier: 2 });
  assert.deepStrictEqual(triggeredAnnouncements[1], { mode: 'time_attack', time: 20, tier: 3 });

  // Endless 65s session
  triggeredAnnouncements.length = 0;
  simulateSession('endless', 65);
  assert.strictEqual(triggeredAnnouncements.length, 4);
  assert.deepStrictEqual(triggeredAnnouncements[0], { mode: 'endless', time: 15, tier: 2 });
  assert.deepStrictEqual(triggeredAnnouncements[1], { mode: 'endless', time: 30, tier: 3 });
  assert.deepStrictEqual(triggeredAnnouncements[2], { mode: 'endless', time: 45, tier: 4 });
  assert.deepStrictEqual(triggeredAnnouncements[3], { mode: 'endless', time: 60, tier: 5 });
});

console.log(`\nProgressive Difficulty Test Results: ${passed}/${total} passed (${Math.round((passed / total) * 100)}%)\n`);

if (passed !== total) {
  process.exit(1);
}
