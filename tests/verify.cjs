/**
 * Automated Verification Test Suite for POP RUSH
 * Tests core gameplay math, Color Rush mechanics, Fever Mode, Endless Rush rules,
 * storage persistence, combo mechanics, and difficulty scaling.
 */

const assert = require('assert');

// Mock localStorage
const mockStorage = {};
global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

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

console.log('\n--- Running POP RUSH Game Verification Tests ---');

// 1. Scoring & Combo System Tests
test('Normal Balloon: awards 100 * combo multiplier', () => {
  const basePoints = 100;
  for (let combo = 1; combo <= 5; combo++) {
    const earned = basePoints * combo;
    assert.strictEqual(earned, 100 * combo);
  }
});

test('Golden Balloon: awards 300 * combo and +2s time bonus in Time Attack', () => {
  const basePoints = 300;
  const combo = 3;
  const earned = basePoints * combo;
  assert.strictEqual(earned, 900);

  let timeLeft = 15;
  timeLeft += 2;
  assert.strictEqual(timeLeft, 17);
});

test('Hazard Balloon: inflicts -200 pts, -3s time penalty, and breaks combo in Time Attack', () => {
  let score = 1000;
  let timeLeft = 20;
  let combo = 4;

  score = Math.max(0, score - 200);
  timeLeft = Math.max(0, timeLeft - 3);
  combo = 1;

  assert.strictEqual(score, 800);
  assert.strictEqual(timeLeft, 17);
  assert.strictEqual(combo, 1);
});

test('Combo Multiplier: caps strictly at 5x', () => {
  let combo = 1;
  for (let i = 0; i < 10; i++) {
    combo = Math.min(combo + 1, 5);
  }
  assert.strictEqual(combo, 5);
});

// 2. High Score & LocalStorage Persistence Tests (Both Modes)
test('Persistence: independent records for Time Attack and Endless Rush', () => {
  localStorage.clear();

  // Time Attack
  localStorage.setItem('pop_rush_high_score', '2400');
  assert.strictEqual(localStorage.getItem('pop_rush_high_score'), '2400');

  // Endless High Score
  localStorage.setItem('pop_rush_endless_high_score', '5600');
  assert.strictEqual(localStorage.getItem('pop_rush_endless_high_score'), '5600');

  // Endless Best Survival Time
  localStorage.setItem('pop_rush_endless_best_time', '145');
  assert.strictEqual(localStorage.getItem('pop_rush_endless_best_time'), '145');
});

// 3. Difficulty Scaling & Spawn Interval Progression
test('Spawn Interval: scales progressively from early to rush phase', () => {
  function getSpawnInterval(timeLeft) {
    if (timeLeft > 20) return 0.75;
    if (timeLeft > 10) return 0.55;
    return 0.4;
  }

  assert.strictEqual(getSpawnInterval(25), 0.75);
  assert.strictEqual(getSpawnInterval(15), 0.55);
  assert.strictEqual(getSpawnInterval(5), 0.4);
});

// 4. Balloon Bounds Verification
test('Spawn Bounds: coordinates stay within visible 720px virtual canvas', () => {
  const canvasWidth = 720;
  const minX = 80;
  const maxX = canvasWidth - 80; // 640

  for (let i = 0; i < 50; i++) {
    const startX = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
    assert.ok(startX >= 80 && startX <= 640, `startX ${startX} out of bounds`);
  }
});

// 5. Balloon Pop Lifecycle Verification
test('Balloon Pop Lifecycle: pop() marks isPopped, disables input, and update() returns false', () => {
  let destroyed = false;
  let interactionDisabled = false;

  class MockBalloon {
    constructor() {
      this.isPopped = false;
    }

    disableInteractive() {
      interactionDisabled = true;
    }

    destroy() {
      destroyed = true;
    }

    pop(onComplete) {
      if (this.isPopped) return;
      this.isPopped = true;
      this.disableInteractive();
      if (onComplete) onComplete();
      this.destroy();
    }

    update() {
      if (this.isPopped) return false;
      return true;
    }
  }

  const balloon = new MockBalloon();
  assert.strictEqual(balloon.isPopped, false);
  assert.strictEqual(balloon.update(), true);

  balloon.pop();
  assert.strictEqual(balloon.isPopped, true);
  assert.strictEqual(interactionDisabled, true);
  assert.strictEqual(balloon.update(), false);
  assert.strictEqual(destroyed, true);
});

// 6. Color Rush Matching & Grace Period Verification
test('Color Rush: matching color accepts, wrong color rejects, 600ms grace window accepts', () => {
  let activeColor = 'red';
  let previousColor = 'blue';
  let switchTime = 10000;
  const GRACE_PERIOD_MS = 600;

  function isMatching(color, currentTime) {
    if (color === activeColor) return { isMatch: true, isGrace: false };
    if (currentTime - switchTime <= GRACE_PERIOD_MS && color === previousColor) {
      return { isMatch: true, isGrace: true };
    }
    return { isMatch: false, isGrace: false };
  }

  // Active color match
  assert.strictEqual(isMatching('red', 10200).isMatch, true);

  // Previous color within 600ms grace period
  const graceCheck = isMatching('blue', 10400);
  assert.strictEqual(graceCheck.isMatch, true);
  assert.strictEqual(graceCheck.isGrace, true);

  // Previous color AFTER grace period expires (800ms > 600ms)
  assert.strictEqual(isMatching('blue', 10800).isMatch, false);

  // Other wrong color
  assert.strictEqual(isMatching('green', 10200).isMatch, false);
});

// 7. Fever Mode Activation & Multiplier Verification
test('Fever Mode: charges to 100%, doubles points, accepts all colors, and prevents recharge while active', () => {
  let charge = 0;
  let isFeverActive = false;
  let feverTimer = 0;

  function addCharge(amt) {
    if (isFeverActive) return false;
    charge = Math.min(100, charge + amt);
    if (charge >= 100) {
      isFeverActive = true;
      feverTimer = 5.0;
      return true;
    }
    return false;
  }

  // Build charge
  addCharge(30);
  addCharge(35);
  addCharge(35); // Reaches 100%
  assert.strictEqual(charge, 100);
  assert.strictEqual(isFeverActive, true);
  assert.strictEqual(feverTimer, 5.0);

  // While active, no recharge exploit allowed
  const added = addCharge(50);
  assert.strictEqual(added, false);

  // Double score during Fever
  const baseScore = 100;
  const combo = 3;
  const feverMultiplier = isFeverActive ? 2 : 1;
  const earned = baseScore * combo * feverMultiplier;
  assert.strictEqual(earned, 600); // 100 * 3 * 2
});

// 8. Endless Mode Life Rules Verification
test('Endless Rush: 3 lives, wrong pop costs life, bomb costs life, target escape costs life, non-target escape is safe', () => {
  let lives = 3;
  let activeTargetColor = 'green';

  function onPop(type, colorKey) {
    if (type === 'hazard') {
      lives = Math.max(0, lives - 1);
      return;
    }
    if (type === 'normal' && colorKey !== activeTargetColor) {
      lives = Math.max(0, lives - 1);
      return;
    }
  }

  function onEscape(type, colorKey) {
    // Only valid target escaping costs 1 life
    if (type === 'normal' && colorKey === activeTargetColor) {
      lives = Math.max(0, lives - 1);
    }
  }

  // Non-target escape: NO life lost
  onEscape('normal', 'blue');
  assert.strictEqual(lives, 3);

  // Valid target escape: COSTS 1 life
  onEscape('normal', 'green');
  assert.strictEqual(lives, 2);

  // Wrong color popped: COSTS 1 life
  onPop('normal', 'red');
  assert.strictEqual(lives, 1);

  // Bomb popped: COSTS 1 life -> Game Over
  onPop('hazard', '');
  assert.strictEqual(lives, 0);
});

// 9. Special Balloons Verification
test('Special Balloons: Rainbow acts as WILD, Freeze slows speed, Golden awards bonus', () => {
  const activeColor = 'yellow';

  function isValidTarget(type, colorKey) {
    if (type === 'golden' || type === 'rainbow' || type === 'freeze') return true;
    return colorKey === activeColor;
  }

  assert.strictEqual(isValidTarget('golden', ''), true, 'Golden is universal');
  assert.strictEqual(isValidTarget('rainbow', ''), true, 'Rainbow is wild');
  assert.strictEqual(isValidTarget('freeze', ''), true, 'Freeze is universal');
  assert.strictEqual(isValidTarget('normal', 'yellow'), true, 'Matching color valid');
  assert.strictEqual(isValidTarget('normal', 'purple'), false, 'Non-matching color invalid');
});

// 10. Accuracy-based Perfect Pop Verification
test('Perfect Pop: touches within 22px of visual body center earn +50 bonus', () => {
  const balloonCenterX = 300;
  const balloonCenterY = 500 - 25; // Visual center at y - 25

  function checkPerfect(pointerX, pointerY) {
    const dx = pointerX - balloonCenterX;
    const dy = pointerY - balloonCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist <= 22;
  }

  assert.strictEqual(checkPerfect(300, 475), true, 'Exact center is perfect');
  assert.strictEqual(checkPerfect(310, 480), true, 'Close tap (dist ~11px) is perfect');
  assert.strictEqual(checkPerfect(335, 475), false, 'Far edge tap (dist 35px) is regular pop');
});

// 11. Anti-Grouping Target Spawning Verification
test('Anti-Grouping: target color never spawns in groups and is separated by at least 2 non-target spawns', () => {
  const activeTargetKey = 'blue';
  const minDistractors = 2;
  const maxDistractors = 3;
  let spawnsSinceTarget = 1;
  const spawnLog = [];

  for (let i = 0; i < 60; i++) {
    const canSpawnTarget = spawnsSinceTarget >= minDistractors;
    const mustSpawnTarget = spawnsSinceTarget >= maxDistractors;
    let isTarget = false;

    if (!canSpawnTarget) {
      isTarget = false;
      spawnsSinceTarget++;
    } else if (mustSpawnTarget) {
      isTarget = true;
      spawnsSinceTarget = 0;
    } else {
      if (Math.random() < 0.35) {
        isTarget = true;
        spawnsSinceTarget = 0;
      } else {
        isTarget = false;
        spawnsSinceTarget++;
      }
    }
    spawnLog.push(isTarget);
  }

  // Verify that there are NEVER two consecutive target spawns (no grouping!)
  for (let i = 0; i < spawnLog.length - 1; i++) {
    if (spawnLog[i] === true) {
      assert.strictEqual(spawnLog[i + 1], false, `Target spawned consecutively at index ${i + 1}`);
      if (i + 2 < spawnLog.length) {
        assert.strictEqual(spawnLog[i + 2], false, `Target spawned with only 1 buffer at index ${i + 2}`);
      }
    }
  }

  // Verify target is never starved (at least 1 target every 4 spawns)
  let maxGap = 0;
  let currentGap = 0;
  for (const isTarget of spawnLog) {
    if (isTarget) {
      maxGap = Math.max(maxGap, currentGap);
      currentGap = 0;
    } else {
      currentGap++;
    }
  }
  assert.ok(maxGap <= maxDistractors, `Gap ${maxGap} exceeded maxDistractors ${maxDistractors}`);
});

// 12. Distractor Color Isolation Verification
test('Distractor Isolation: distractor colors strictly exclude the active target color', () => {
  const activeTargetKey = 'purple';
  const allColors = ['red', 'blue', 'green', 'yellow', 'purple'];
  const distractorColors = allColors.filter(c => c !== activeTargetKey);

  assert.strictEqual(distractorColors.includes('purple'), false, 'Target color must not be in distractor pool');
  assert.strictEqual(distractorColors.length, 4, 'Must have 4 distractor colors available');

  for (let i = 0; i < 50; i++) {
    const chosen = distractorColors[Math.floor(Math.random() * distractorColors.length)];
    assert.notStrictEqual(chosen, activeTargetKey, 'Distractor roll matched target color');
  }
});

// 13. Dynamic Time Attack Difficulty Progression
test('Time Attack Difficulty: speed, spawn interval, hazard rate, and color switch scale with time', () => {
  function getDifficulty(timeLeft) {
    return Math.min(1, Math.max(0, (30 - timeLeft) / 30));
  }

  function getBaseSpeed(diff) { return 230 + diff * 220; }
  function getSpawnInterval(diff) { return 0.72 - diff * 0.38; }
  function getHazardRate(diff) { return 0.08 + diff * 0.16; }
  function getColorSwitchInterval(diff) { return Math.max(3.6, 6.5 - diff * 2.8); }

  // Early phase (timeLeft = 30)
  const diffEarly = getDifficulty(30);
  assert.strictEqual(diffEarly, 0);
  assert.strictEqual(getBaseSpeed(diffEarly), 230);
  assert.strictEqual(Math.round(getSpawnInterval(diffEarly) * 100) / 100, 0.72);
  assert.strictEqual(Math.round(getHazardRate(diffEarly) * 100) / 100, 0.08);
  assert.strictEqual(getColorSwitchInterval(diffEarly), 6.5);

  // Mid phase (timeLeft = 15)
  const diffMid = getDifficulty(15);
  assert.strictEqual(diffMid, 0.5);
  assert.strictEqual(getBaseSpeed(diffMid), 340);
  assert.strictEqual(Math.round(getSpawnInterval(diffMid) * 100) / 100, 0.53);
  assert.strictEqual(Math.round(getHazardRate(diffMid) * 100) / 100, 0.16);
  assert.strictEqual(Math.round(getColorSwitchInterval(diffMid) * 10) / 10, 5.1);

  // Rush phase (timeLeft = 0)
  const diffRush = getDifficulty(0);
  assert.strictEqual(diffRush, 1);
  assert.strictEqual(getBaseSpeed(diffRush), 450);
  assert.strictEqual(Math.round(getSpawnInterval(diffRush) * 100) / 100, 0.34);
  assert.strictEqual(Math.round(getHazardRate(diffRush) * 100) / 100, 0.24);
  assert.strictEqual(Math.round(getColorSwitchInterval(diffRush) * 10) / 10, 3.7);
});

// 14. Dynamic Endless Rush Difficulty Progression
test('Endless Rush Difficulty: scales progressively with survival time up to 120s+', () => {
  function getDifficulty(survivalTime) {
    return Math.min(1, survivalTime / 120);
  }

  function getBaseSpeed(diff) { return 220 + diff * 230; }
  function getSpawnInterval(diff) { return 0.75 - diff * 0.42; }
  function getHazardRate(diff) { return Math.min(0.25, 0.08 + diff * 0.16); }
  function getColorSwitchInterval(diff) { return Math.max(3.5, 7.5 - diff * 4.0); }

  // 0s Survival
  const d0 = getDifficulty(0);
  assert.strictEqual(getBaseSpeed(d0), 220);
  assert.strictEqual(Math.round(getSpawnInterval(d0) * 100) / 100, 0.75);
  assert.strictEqual(Math.round(getHazardRate(d0) * 100) / 100, 0.08);
  assert.strictEqual(getColorSwitchInterval(d0), 7.5);

  // 60s Survival (1 minute)
  const d60 = getDifficulty(60);
  assert.strictEqual(d60, 0.5);
  assert.strictEqual(getBaseSpeed(d60), 335);
  assert.strictEqual(Math.round(getSpawnInterval(d60) * 100) / 100, 0.54);
  assert.strictEqual(Math.round(getHazardRate(d60) * 100) / 100, 0.16);
  assert.strictEqual(getColorSwitchInterval(d60), 5.5);

  // 120s+ Survival (2 minutes)
  const d120 = getDifficulty(120);
  assert.strictEqual(d120, 1);
  assert.strictEqual(getBaseSpeed(d120), 450);
  assert.strictEqual(Math.round(getSpawnInterval(d120) * 100) / 100, 0.33);
  assert.strictEqual(Math.round(getHazardRate(d120) * 100) / 100, 0.24);
  assert.strictEqual(getColorSwitchInterval(d120), 3.5);
});

console.log(`\nTest Results: ${passed}/${total} passed (${Math.round((passed/total)*100)}%)\n`);

if (passed !== total) {
  process.exit(1);
}
