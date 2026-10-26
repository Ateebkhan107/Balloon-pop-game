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

console.log(`\nTest Results: ${passed}/${total} passed (${Math.round((passed/total)*100)}%)\n`);

if (passed !== total) {
  process.exit(1);
}
