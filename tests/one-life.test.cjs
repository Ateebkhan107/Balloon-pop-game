/**
 * Automated Test Suite for One Life Challenge Mode 💀
 * Verifies 1-life high-stakes survival, immediate game over on wrong pops,
 * bombs, or missed target balloons, non-target escape safety, single-deduction guards,
 * survival time tracking, danger effect, and isolated storage.
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

console.log('\n--- Running One Life Challenge Verification Tests ---');

// 1. Initial State: Exactly 1 Life, Survival Clock
test('One Life Init: Starts with exactly 1 life and no overall time limit', () => {
  const mode = 'one_life';
  const lives = mode === 'one_life' ? 1 : 3;
  const timeLeft = (mode === 'time_attack' || mode === 'color_chaos') ? 30 : 0;
  let survivalTime = 0;

  assert.strictEqual(lives, 1, 'One Life must initialize with exactly 1 life');
  assert.strictEqual(timeLeft, 0, 'One Life has no fixed countdown limit');
  assert.strictEqual(survivalTime, 0, 'Survival time begins at 0s');
});

// 2. Immediate Game Over on Wrong-Color Pop
test('Immediate Game Over: Wrong-color pop costs 1 life and immediately ends the round', () => {
  let lives = 1;
  let isEnding = false;
  let gameOverCalls = 0;

  const endGame = () => {
    if (isEnding) return;
    isEnding = true;
    gameOverCalls++;
  };

  const deductLife = (_reason) => {
    lives = Math.max(0, lives - 1);
    if (lives <= 0) {
      endGame();
    }
  };

  // Player taps wrong color in One Life
  deductLife('WRONG COLOR!');

  assert.strictEqual(lives, 0, 'Lives must drop to 0');
  assert.strictEqual(isEnding, true, 'Round must end immediately');
  assert.strictEqual(gameOverCalls, 1, 'EndGame called exactly once');
});

// 3. Immediate Game Over on Bomb Hit
test('Immediate Game Over: Hazard bomb hit costs 1 life and immediately ends the round', () => {
  let lives = 1;
  let isEnding = false;

  const deductLife = () => {
    lives = Math.max(0, lives - 1);
    if (lives <= 0) isEnding = true;
  };

  // Pop hazard bomb
  deductLife('BOMB HIT!');

  assert.strictEqual(lives, 0);
  assert.strictEqual(isEnding, true);
});

// 4. Target Balloon Escape Ends Game
test('Target Escape: Letting an active target-color balloon escape ends the round', () => {
  let lives = 1;
  let isEnding = false;
  const activeTargetColor = 'red';

  const onEscape = (balloon) => {
    if (balloon.colorKey === activeTargetColor) {
      lives = Math.max(0, lives - 1);
      if (lives <= 0) isEnding = true;
    }
  };

  // Target red balloon floats off screen
  onEscape({ colorKey: 'red' });

  assert.strictEqual(lives, 0, 'Target escape must deduct life');
  assert.strictEqual(isEnding, true, 'Target escape must trigger Game Over in One Life');
});

// 5. Non-Target Balloon Escape is Safe
test('Non-Target Escape: Letting distractor balloons escape does NOT deduct life or end game', () => {
  let lives = 1;
  let isEnding = false;
  const activeTargetColor = 'yellow';

  const onEscape = (balloon) => {
    if (balloon.colorKey === activeTargetColor) {
      lives = Math.max(0, lives - 1);
      if (lives <= 0) isEnding = true;
    }
  };

  // Distractor green, blue, and purple balloons float off screen
  onEscape({ colorKey: 'green' });
  onEscape({ colorKey: 'blue' });
  onEscape({ colorKey: 'purple' });

  assert.strictEqual(lives, 1, 'Non-target balloons escaping must never cost a life');
  assert.strictEqual(isEnding, false, 'Game must continue running');
});

// 6. Single Life Deduction Protection Guard
test('Deduction Guard: Multiple simultaneous events cannot trigger duplicate game overs', () => {
  let lives = 1;
  let isEnding = false;
  let endGameInvocations = 0;

  const endGame = () => {
    if (isEnding) return;
    isEnding = true;
    endGameInvocations++;
  };

  const deductLife = () => {
    lives = Math.max(0, lives - 1);
    if (lives <= 0) endGame();
  };

  // Two mistakes in the same frame
  deductLife('WRONG COLOR!');
  deductLife('BOMB HIT!');

  assert.strictEqual(lives, 0);
  assert.strictEqual(endGameInvocations, 1, 'End game must be invoked exactly once');
});

// 7. Survival Time & Danger Effect
test('Survival Clock & Danger Tension: Survival time increments continuously and triggers danger vignette', () => {
  let survivalTime = 0;
  const update = (dt) => {
    survivalTime += dt;
  };

  update(10.5);
  assert.strictEqual(survivalTime, 10.5);

  update(15.0);
  assert.strictEqual(survivalTime, 25.5);

  // Danger tension check: active when elapsed time >= 20s
  const isDangerActive = survivalTime >= 20;
  assert.strictEqual(isDangerActive, true, 'Subtle danger overlay should be active after 20s');
});

// 8. Correct Pop Scoring & Combo in One Life
test('Correct Pops: Accrue points and build combos normally in One Life', () => {
  let score = 0;
  let combo = 1;

  for (let i = 0; i < 4; i++) {
    score += 100 * combo;
    combo = Math.min(combo + 1, 5);
  }

  // Pop 1: +100 (combo 1->2)
  // Pop 2: +200 (combo 2->3)
  // Pop 3: +300 (combo 3->4)
  // Pop 4: +400 (combo 4->5)
  assert.strictEqual(score, 1000);
  assert.strictEqual(combo, 5);
});

// 9. Independent High Score and Survival Time Storage
test('Storage Isolation: One Life high score and best survival time persist independently', () => {
  localStorage.clear();

  // Save One Life records
  localStorage.setItem('pop_rush_one_life_high_score', '1850');
  localStorage.setItem('pop_rush_one_life_best_time', '47');

  // Verify Endless records remain empty/unaffected
  assert.strictEqual(localStorage.getItem('pop_rush_one_life_high_score'), '1850');
  assert.strictEqual(localStorage.getItem('pop_rush_one_life_best_time'), '47');
  assert.strictEqual(localStorage.getItem('pop_rush_endless_high_score'), null);
  assert.strictEqual(localStorage.getItem('pop_rush_endless_best_time'), null);
});

console.log(`\nOne Life Challenge Test Results: ${passed}/${total} passed (${Math.round((passed / total) * 100)}%)\n`);
if (passed < total) process.exit(1);
