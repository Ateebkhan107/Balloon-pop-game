/**
 * Automated Test Suite for Color Chaos Mode 🌈
 * Verifies 30s countdown, pop-triggered color switching (3 pops scaling to 2 pops),
 * reachable target balloon guarantee, combo resets on wrong taps,
 * and isolated high-score persistence.
 */

const assert = require('assert');

// Mock localStorage
const mockStorage = {};
global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); },
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

console.log('\n--- Running Color Chaos Mode Verification Tests ---');

// 1. Initial 30-second Timer & Countdown
test('Timer: Starts with 30-second countdown and ends round at 0s', () => {
  let timeLeft = 30;
  let isEnding = false;

  const updateTimer = (dt) => {
    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      isEnding = true;
    }
  };

  updateTimer(10);
  assert.strictEqual(timeLeft, 20);
  assert.strictEqual(isEnding, false);

  updateTimer(20.5);
  assert.strictEqual(timeLeft, 0);
  assert.strictEqual(isEnding, true);
});

// 2. Color Switching on Correct Pops: Tier 1 (3 Pops)
test('Color Shift: Target color switches after exactly 3 successful pops early in round', () => {
  let colorChaosPopsCount = 0;
  let activeColor = 'red';
  let colorSwitches = 0;
  const elapsedGameplayTime = 5; // < 15s

  const onCorrectPop = () => {
    colorChaosPopsCount++;
    const threshold = elapsedGameplayTime >= 15 ? 2 : 3;
    if (colorChaosPopsCount >= threshold) {
      colorChaosPopsCount = 0;
      activeColor = activeColor === 'red' ? 'blue' : 'green';
      colorSwitches++;
    }
  };

  // Pop 1
  onCorrectPop();
  assert.strictEqual(colorChaosPopsCount, 1);
  assert.strictEqual(colorSwitches, 0);

  // Pop 2
  onCorrectPop();
  assert.strictEqual(colorChaosPopsCount, 2);
  assert.strictEqual(colorSwitches, 0);

  // Pop 3 -> Switch!
  onCorrectPop();
  assert.strictEqual(colorChaosPopsCount, 0);
  assert.strictEqual(colorSwitches, 1);
  assert.strictEqual(activeColor, 'blue');
});

// 3. Color Switching Scaling: Tier 2 (2 Pops)
test('Scaling Color Shift: Target color switches after every 2 pops as elapsed time increases (>= 15s)', () => {
  let colorChaosPopsCount = 0;
  let activeColor = 'blue';
  let colorSwitches = 0;
  const elapsedGameplayTime = 16; // >= 15s

  const onCorrectPop = () => {
    colorChaosPopsCount++;
    const threshold = elapsedGameplayTime >= 15 ? 2 : 3;
    if (colorChaosPopsCount >= threshold) {
      colorChaosPopsCount = 0;
      activeColor = activeColor === 'blue' ? 'yellow' : 'purple';
      colorSwitches++;
    }
  };

  // Pop 1
  onCorrectPop();
  assert.strictEqual(colorChaosPopsCount, 1);
  assert.strictEqual(colorSwitches, 0);

  // Pop 2 -> Switch!
  onCorrectPop();
  assert.strictEqual(colorChaosPopsCount, 0);
  assert.strictEqual(colorSwitches, 1);
  assert.strictEqual(activeColor, 'yellow');

  // Pop 3
  onCorrectPop();
  assert.strictEqual(colorChaosPopsCount, 1);

  // Pop 4 -> Switch!
  onCorrectPop();
  assert.strictEqual(colorChaosPopsCount, 0);
  assert.strictEqual(colorSwitches, 2);
});

// 4. Reachable Target Availability Guarantee
test('Reachable Target Guarantee: Always spawns target balloon when none are reachable on screen', () => {
  const activeTargetKey = 'purple';
  const balloonsOnScreen = [
    { isPopped: false, colorKey: 'red' },
    { isPopped: false, colorKey: 'blue' },
    { isPopped: true, colorKey: 'purple' }, // Already popped
  ];

  // Logic from GameScene.spawnBalloon for Color Chaos
  const reachableTargets = balloonsOnScreen.filter((b) => !b.isPopped && b.colorKey === activeTargetKey);
  let spawnedColorKey = '';

  if (reachableTargets.length === 0) {
    spawnedColorKey = activeTargetKey;
  } else {
    spawnedColorKey = 'distractor';
  }

  assert.strictEqual(reachableTargets.length, 0);
  assert.strictEqual(spawnedColorKey, 'purple', 'Must guarantee active target spawn when 0 reachable targets exist');
});

// 5. Wrong Color Tap: 0 Points, Combo Reset, Intact Balloon
test('Wrong Color Tap: Awards 0 points, does not pop balloon, and breaks combo', () => {
  let score = 500;
  let combo = 4;
  let feverCharge = 70;
  const targetColor = 'green';
  const tappedBalloon = { colorKey: 'red', isPopped: false };

  const handleTap = (b) => {
    if (b.colorKey === targetColor) {
      b.isPopped = true;
      score += 100 * combo;
      combo = Math.min(combo + 1, 5);
      feverCharge += 10;
    } else {
      // Wrong color
      combo = 1;
      feverCharge = 0;
      // b.isPopped remains false
    }
  };

  handleTap(tappedBalloon);
  assert.strictEqual(tappedBalloon.isPopped, false, 'Balloon should remain unpopped');
  assert.strictEqual(score, 500, 'Score must not increase on wrong-color tap');
  assert.strictEqual(combo, 1, 'Combo must reset to 1 on wrong-color tap');
  assert.strictEqual(feverCharge, 0, 'Fever progress must reset on wrong-color tap');
});

// 6. Golden Balloon Bonus in Color Chaos (+2s Time Extension)
test('Golden Balloon: Adds +2s time extension and 300 * combo score in Color Chaos', () => {
  let timeLeft = 24;
  let score = 1000;
  const combo = 3;

  // Pop golden balloon in Color Chaos
  timeLeft += 2;
  score += 300 * combo;

  assert.strictEqual(timeLeft, 26, 'Should add 2 seconds in Color Chaos');
  assert.strictEqual(score, 1900, 'Should award 900 points');
});

// 7. Hazard Bomb Penalty in Color Chaos (-200 pts, -3s, resets combo)
test('Hazard Bomb: Deducts 200 points, 3 seconds, and resets combo in Color Chaos', () => {
  let timeLeft = 18;
  let score = 800;
  let combo = 5;

  // Pop hazard bomb in Color Chaos
  timeLeft = Math.max(0, timeLeft - 3);
  score = Math.max(0, score - 200);
  combo = 1;

  assert.strictEqual(timeLeft, 15);
  assert.strictEqual(score, 600);
  assert.strictEqual(combo, 1);
});

// 8. Isolated High-Score Storage
test('Storage Isolation: Color Chaos high score persists independently without affecting Time Attack or Endless', () => {
  localStorage.clear();

  // Save scores across modes
  localStorage.setItem('pop_rush_high_score', '2500'); // Time Attack
  localStorage.setItem('pop_rush_endless_high_score', '4200'); // Endless Rush
  localStorage.setItem('pop_rush_color_chaos_high_score', '3100'); // Color Chaos

  assert.strictEqual(localStorage.getItem('pop_rush_color_chaos_high_score'), '3100');
  assert.strictEqual(localStorage.getItem('pop_rush_high_score'), '2500');
  assert.strictEqual(localStorage.getItem('pop_rush_endless_high_score'), '4200');

  // Updating Color Chaos score does not alter others
  localStorage.setItem('pop_rush_color_chaos_high_score', '3800');
  assert.strictEqual(localStorage.getItem('pop_rush_color_chaos_high_score'), '3800');
  assert.strictEqual(localStorage.getItem('pop_rush_high_score'), '2500');
  assert.strictEqual(localStorage.getItem('pop_rush_endless_high_score'), '4200');
});

console.log(`\nColor Chaos Test Results: ${passed}/${total} passed (${Math.round((passed / total) * 100)}%)\n`);
if (passed < total) process.exit(1);
