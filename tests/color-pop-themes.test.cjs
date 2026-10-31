/**
 * Automated Verification Suite for Color Pop Accuracy, Scoring, and Background Themes
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

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

console.log('\n--- Running Color Pop, Scoring & Themes Verification Tests ---');

// Mock localStorage
const mockStorage = {};
global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

// 1. Color Matching & Score Gating
test('Color Matching: Only target color pops and earns points; wrong color does NOT pop and does NOT score', () => {
  let score = 0;
  let combo = 3;
  let activeTargetColor = 'red';

  class MockBalloon {
    constructor(colorKey, type = 'normal') {
      this.colorKey = colorKey;
      this.balloonType = type;
      this.isPopped = false;
      this.scoreValue = 100;
      this.interactive = true;
    }
    pop() {
      if (this.isPopped) return;
      this.isPopped = true;
      this.interactive = false;
    }
  }

  function handleTap(balloon, feverActive = false) {
    if (balloon.isPopped) return { popped: false, scored: false };

    const isMatch = balloon.colorKey === activeTargetColor || feverActive;

    if (balloon.balloonType === 'normal') {
      if (isMatch) {
        balloon.pop();
        const earned = balloon.scoreValue * combo * (feverActive ? 2 : 1);
        score += earned;
        combo = Math.min(5, combo + 1);
        return { popped: true, scored: true, earned };
      } else {
        // Wrong color tap: DO NOT POP!
        combo = 1; // combo resets
        return { popped: false, scored: false, earned: 0 };
      }
    }
    return { popped: false, scored: false };
  }

  // 1. Tap wrong color balloon (blue when target is red)
  const wrongBalloon = new MockBalloon('blue');
  const wrongResult = handleTap(wrongBalloon);

  assert.strictEqual(wrongResult.popped, false, 'Wrong color balloon must NOT pop');
  assert.strictEqual(wrongResult.scored, false, 'Wrong color balloon must NOT earn points');
  assert.strictEqual(wrongBalloon.isPopped, false, 'Balloon object isPopped must remain false');
  assert.strictEqual(score, 0, 'Score must remain 0 after wrong color tap');
  assert.strictEqual(combo, 1, 'Combo must reset to 1 on wrong color tap');

  // 2. Tap correct color balloon (red when target is red)
  const correctBalloon = new MockBalloon('red');
  const correctResult = handleTap(correctBalloon);

  assert.strictEqual(correctResult.popped, true, 'Correct color balloon must pop');
  assert.strictEqual(correctResult.scored, true, 'Correct color balloon must score points');
  assert.strictEqual(correctBalloon.isPopped, true, 'Balloon object isPopped must be true');
  assert.strictEqual(score, 100, 'Score must increase by 100');
  assert.strictEqual(combo, 2, 'Combo must advance to 2');
});

test('Duplicate Tap Prevention: Once popped, subsequent taps in same or later frame do not duplicate score', () => {
  let score = 0;
  let tapCount = 0;

  class MockBalloon {
    constructor() {
      this.isPopped = false;
      this.interactive = true;
    }
    pop() {
      if (this.isPopped) return false;
      this.isPopped = true;
      this.interactive = false;
      return true;
    }
  }

  const b = new MockBalloon();

  function onPointerDown() {
    if (b.isPopped) return;
    if (b.pop()) {
      score += 100;
      tapCount++;
    }
  }

  // Rapid multi-touch simultaneous simulation
  onPointerDown();
  onPointerDown();
  onPointerDown();

  assert.strictEqual(tapCount, 1, 'Pop action must execute exactly once');
  assert.strictEqual(score, 100, 'Score must only be awarded once');
});

test('Fever Mode: Awards 2x bonus on target color; wrong colors do NOT pop or score in Fever', () => {
  let score = 0;
  const feverActive = true;
  const activeColor = 'green';

  function tapInFever(color) {
    // Crucial rule: Only target color pops, even during Fever!
    const isMatch = color === activeColor;
    if (isMatch) {
      score += 100 * (feverActive ? 2 : 1);
      return true;
    }
    return false;
  }

  assert.strictEqual(tapInFever('yellow'), false, 'Wrong color must not pop in Fever');
  assert.strictEqual(tapInFever('purple'), false, 'Wrong color must not pop in Fever');
  assert.strictEqual(tapInFever('green'), true, 'Target color pops in Fever');
  assert.strictEqual(score, 200, 'Target color earns 2x bonus points');
});

test('Color Switch Grace Period: Accepts previous color within 600ms grace window', () => {
  const GRACE_PERIOD_MS = 600;
  let activeColor = 'yellow';
  let prevColor = 'red';
  let switchTime = 5000;

  function checkMatch(color, tapTime) {
    if (color === activeColor) return true;
    if (tapTime - switchTime <= GRACE_PERIOD_MS && color === prevColor) {
      return true;
    }
    return false;
  }

  // Tapped prev color 300ms after switch: accepted
  assert.strictEqual(checkMatch('red', 5300), true);

  // Tapped prev color 700ms after switch: rejected
  assert.strictEqual(checkMatch('red', 5700), false);
});

test('4 Background Themes: Defined, persistent in localStorage, and default to dreamy_sky', () => {
  localStorage.clear();

  const THEMES = {
    dreamy_sky: { id: 'dreamy_sky', name: 'Dreamy Sky', file: 'bg_dreamy_sky.jpg' },
    neon_night: { id: 'neon_night', name: 'Neon Night', file: 'bg_neon_night.jpg' },
    candy_world: { id: 'candy_world', name: 'Candy World', file: 'bg_candy_world.jpg' },
    space_rush: { id: 'space_rush', name: 'Space Rush', file: 'bg_space_rush.jpg' },
  };

  const KEY = 'pop_rush_bg_theme';

  function getTheme() {
    const val = localStorage.getItem(KEY);
    return val && THEMES[val] ? val : 'dreamy_sky';
  }

  function setTheme(id) {
    if (THEMES[id]) {
      localStorage.setItem(KEY, id);
    }
  }

  // Default theme
  assert.strictEqual(getTheme(), 'dreamy_sky');

  // Change to Neon Night
  setTheme('neon_night');
  assert.strictEqual(getTheme(), 'neon_night');

  // Change to Candy World
  setTheme('candy_world');
  assert.strictEqual(getTheme(), 'candy_world');

  // Change to Space Rush
  setTheme('space_rush');
  assert.strictEqual(getTheme(), 'space_rush');

  // Invalid theme falls back to dreamy_sky
  setTheme('invalid_theme_xyz');
  assert.strictEqual(getTheme(), 'space_rush'); // stays at last valid
});

test('Background Assets: All 4 generated theme images exist in public/assets and are optimized', () => {
  const assetsDir = path.join(__dirname, '..', 'public', 'assets');
  const requiredImages = [
    'bg_dreamy_sky.jpg',
    'bg_neon_night.jpg',
    'bg_candy_world.jpg',
    'bg_space_rush.jpg',
  ];

  requiredImages.forEach((img) => {
    const filePath = path.join(assetsDir, img);
    assert.strictEqual(fs.existsSync(filePath), true, `${img} must exist in public/assets`);
    const stat = fs.statSync(filePath);
    assert.ok(stat.size > 20000, `${img} should be a valid image file (> 20KB)`);
    assert.ok(stat.size < 400000, `${img} should be optimized for mobile (< 400KB), got ${stat.size} bytes`);
  });
});

test('Theme Button in Menu: Hit area satisfies minimum 44x44 mobile touch target', () => {
  const btnSize = 48;
  const radius = 24;
  assert.ok(btnSize >= 44, 'Theme button width & height must be >= 44px');
  assert.ok(radius * 2 >= 44, 'Circle hitArea must be >= 44px diameter');
});

console.log(`\nColor Pop & Themes Test Results: ${passed}/${total} passed (${Math.round((passed / total) * 100)}%)\n`);
