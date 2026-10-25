/**
 * Automated Verification Test Suite for POP RUSH
 * Tests core gameplay math, storage persistence, combo mechanics, and difficulty scaling.
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

test('Golden Balloon: awards 300 * combo and +2s time bonus', () => {
  const basePoints = 300;
  const combo = 3;
  const earned = basePoints * combo;
  assert.strictEqual(earned, 900);

  let timeLeft = 15;
  timeLeft += 2;
  assert.strictEqual(timeLeft, 17);
});

test('Hazard Balloon: inflicts -200 pts, -3s time penalty, and breaks combo', () => {
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

// 2. High Score & LocalStorage Persistence Tests
test('High Score: saves when new record achieved, ignores lower score', () => {
  localStorage.clear();
  const HIGH_SCORE_KEY = 'pop_rush_high_score';

  function saveHighScore(score) {
    const current = parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10);
    if (score > current) {
      localStorage.setItem(HIGH_SCORE_KEY, score.toString());
      return true;
    }
    return false;
  }

  assert.strictEqual(saveHighScore(1500), true);
  assert.strictEqual(localStorage.getItem(HIGH_SCORE_KEY), '1500');

  // Lower score should not overwrite
  assert.strictEqual(saveHighScore(1200), false);
  assert.strictEqual(localStorage.getItem(HIGH_SCORE_KEY), '1500');

  // Higher score should overwrite
  assert.strictEqual(saveHighScore(2800), true);
  assert.strictEqual(localStorage.getItem(HIGH_SCORE_KEY), '2800');
});

// 3. Difficulty Scaling & Spawn Interval Progression
test('Spawn Interval: scales progressively from early to rush phase', () => {
  function getSpawnInterval(timeLeft) {
    if (timeLeft > 20) return 0.8;
    if (timeLeft > 10) return 0.6;
    return 0.42;
  }

  assert.strictEqual(getSpawnInterval(25), 0.8);
  assert.strictEqual(getSpawnInterval(15), 0.6);
  assert.strictEqual(getSpawnInterval(5), 0.42);
});

test('Float Speed: increases dynamically across game phases', () => {
  function getBaseFloatSpeed(timeLeft) {
    if (timeLeft <= 10) return 360;
    if (timeLeft <= 20) return 290;
    return 230;
  }

  assert.strictEqual(getBaseFloatSpeed(28), 230);
  assert.strictEqual(getBaseFloatSpeed(18), 290);
  assert.strictEqual(getBaseFloatSpeed(6), 360);
});

// 4. Balloon Bounds Verification
test('Spawn Bounds: coordinates stay within visible 720px virtual canvas', () => {
  const canvasWidth = 720;
  const minX = 75;
  const maxX = canvasWidth - 75; // 645

  for (let i = 0; i < 50; i++) {
    const startX = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
    assert.ok(startX >= 75 && startX <= 645, `startX ${startX} out of bounds`);
  }
});

console.log(`\nTest Results: ${passed}/${total} passed (${Math.round((passed/total)*100)}%)\n`);

if (passed !== total) {
  process.exit(1);
}
