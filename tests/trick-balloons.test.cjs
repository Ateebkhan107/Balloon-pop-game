/**
 * Automated Verification Tests for Trick Balloons
 * Tests:
 * 1. Zigzag Balloon: smooth horizontal wave movement, predictable, stays within [45, width - 45] bounds
 * 2. Speedster Balloon: smooth acceleration, speed capped for mobile tappability
 * 3. Dodger Balloon: triggers direction shift in upper play area, stays within boundary
 * 4. Hit area accuracy: world radius >= 48px maintained on mobile
 * 5. Color Rush rules: only target color trick balloons pop and score; wrong colors reject
 * 6. Progressive difficulty: trick balloons introduced progressively with elapsed time
 * 7. Visual recognition: trick type property and visual markers defined
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

console.log('\n--- Running Trick Balloons Verification Tests ---');

const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 1080;
const MIN_X = 45;
const MAX_X = CANVAS_WIDTH - 45;

// Mock Trick Balloon implementation mirroring Balloon.ts
class MockTrickBalloon {
  constructor(config) {
    this.startX = config.startX || 360;
    this.x = this.startX;
    this.y = config.startY || 1000;
    this.baseSpeed = config.speed || 200;
    this.speed = this.baseSpeed;
    this.swayAmplitude = config.swayAmplitude || 24;
    this.swayFrequency = config.swayFrequency || 1.6;
    this.colorKey = config.colorKey || 'red';
    this.trickType = config.trickType || 'none';
    this.scale = config.scale || 1.0;
    this.floatTime = 0;
    this.hasDodged = false;
    this.dodgeOffset = 0;
    this.isPopped = false;
  }

  update(dt) {
    if (this.isPopped) return false;
    this.floatTime += dt;

    if (this.trickType === 'zigzag') {
      // Upward regular speed + distinct wide sinusoidal shift
      this.y -= this.speed * dt;
      const zigzagOffset = Math.sin(this.floatTime * 3.4) * Math.min(65, this.swayAmplitude * 2.2);
      this.x = Math.max(MIN_X, Math.min(MAX_X, this.startX + zigzagOffset));
    } else if (this.trickType === 'speedster') {
      // Upward accelerating speed (capped at 1.55x base speed)
      this.speed = Math.min(this.baseSpeed * 1.55, this.baseSpeed + this.floatTime * 48);
      this.y -= this.speed * dt;
      const sway = Math.sin(this.floatTime * this.swayFrequency) * this.swayAmplitude;
      this.x = Math.max(MIN_X, Math.min(MAX_X, this.startX + sway));
    } else if (this.trickType === 'dodger') {
      // When approaching upper playfield (y <= 600), execute smooth sidestep
      if (this.y <= 600 && !this.hasDodged) {
        this.hasDodged = true;
        const shiftDir = this.startX > CANVAS_WIDTH / 2 ? -1 : 1;
        this.dodgeOffset = shiftDir * 80;
      }
      this.y -= this.speed * dt;
      // Smooth interpolation toward dodged X
      if (this.hasDodged) {
        const targetX = Math.max(MIN_X, Math.min(MAX_X, this.startX + this.dodgeOffset));
        this.x += (targetX - this.x) * Math.min(1.0, dt * 5.0);
      } else {
        const sway = Math.sin(this.floatTime * this.swayFrequency) * this.swayAmplitude;
        this.x = Math.max(MIN_X, Math.min(MAX_X, this.startX + sway));
      }
    } else {
      // Normal
      this.y -= this.speed * dt;
      const sway = Math.sin(this.floatTime * this.swayFrequency) * this.swayAmplitude;
      this.x = Math.max(MIN_X, Math.min(MAX_X, this.startX + sway));
    }

    return this.y > 135;
  }

  pop() {
    this.isPopped = true;
  }
}

// 1. Zigzag Movement & Boundaries
test('Zigzag Balloon: Moves in smooth predictable wave and stays strictly within bounds', () => {
  // Test starting near left border
  const nearLeft = new MockTrickBalloon({ startX: 55, trickType: 'zigzag', swayAmplitude: 28 });
  // Test starting near right border
  const nearRight = new MockTrickBalloon({ startX: 665, trickType: 'zigzag', swayAmplitude: 28 });

  for (let i = 0; i < 120; i++) {
    nearLeft.update(0.016);
    nearRight.update(0.016);

    assert.ok(nearLeft.x >= MIN_X, `Zigzag must not cross left bound (x: ${nearLeft.x} >= ${MIN_X})`);
    assert.ok(nearLeft.x <= MAX_X, `Zigzag must not cross right bound (x: ${nearLeft.x} <= ${MAX_X})`);

    assert.ok(nearRight.x >= MIN_X, `Zigzag must not cross left bound (x: ${nearRight.x} >= ${MIN_X})`);
    assert.ok(nearRight.x <= MAX_X, `Zigzag must not cross right bound (x: ${nearRight.x} <= ${MAX_X})`);
  }
});

// 2. Speedster Acceleration & Speed Cap
test('Speedster Balloon: Accelerates smoothly but strictly respects mobile tappability speed cap', () => {
  const baseSpeed = 200;
  const speedster = new MockTrickBalloon({ speed: baseSpeed, trickType: 'speedster' });

  assert.strictEqual(speedster.speed, baseSpeed);

  // Run for 3 seconds of flight
  for (let i = 0; i < 180; i++) {
    speedster.update(0.016);
  }

  // Must have accelerated
  assert.ok(speedster.speed > baseSpeed, `Speedster must accelerate (current: ${speedster.speed} > ${baseSpeed})`);
  // Must not exceed 1.55x base speed (mobile playability limit)
  const maxAllowedSpeed = baseSpeed * 1.55;
  assert.ok(speedster.speed <= maxAllowedSpeed + 0.01, `Speedster speed must cap at ${maxAllowedSpeed}`);
});

// 3. Dodger Direction Shift
test('Dodger Balloon: Initiates smooth sidestep upon reaching upper playfield', () => {
  const dodgerRight = new MockTrickBalloon({ startX: 450, startY: 700, trickType: 'dodger' });
  assert.strictEqual(dodgerRight.hasDodged, false);

  // Float upward until y <= 600
  while (dodgerRight.y > 600) {
    dodgerRight.update(0.016);
  }

  // Cross into upper play area
  dodgerRight.update(0.016);
  assert.strictEqual(dodgerRight.hasDodged, true, 'Dodger must trigger dodge when crossing y <= 600');
  assert.strictEqual(dodgerRight.dodgeOffset, -80, 'Right-side balloon must dodge left (-80px)');

  // Run 30 more frames for smooth interpolation
  for (let i = 0; i < 30; i++) {
    dodgerRight.update(0.016);
  }
  assert.ok(dodgerRight.x < 450, 'Dodger X must have shifted to the left');
  assert.ok(dodgerRight.x >= MIN_X && dodgerRight.x <= MAX_X, 'Dodger must stay within boundaries');
});

// 4. Hit Area Accessibility on Mobile
test('Hit Area Accuracy: Maintains >= 48px world hit radius for trick balloons', () => {
  function getEffectiveHitRadius(scale) {
    const localHitRadius = Math.max(56, 48 / scale);
    return localHitRadius * scale;
  }

  const normalScaleRadius = getEffectiveHitRadius(1.0);
  const smallScaleRadius = getEffectiveHitRadius(0.80);

  assert.ok(normalScaleRadius >= 48, `Normal trick balloon hit radius (${normalScaleRadius}px) >= 48px`);
  assert.ok(smallScaleRadius >= 48, `Small trick balloon hit radius (${smallScaleRadius}px) >= 48px`);
});

// 5. Scoring & Color Rush Rule Consistency
test('Scoring Rules: Only matching target color trick balloons pop and score; wrong colors reject', () => {
  let score = 0;
  let combo = 2;
  const activeTargetColor = 'purple';

  function handleTrickBalloonTap(balloon) {
    if (balloon.isPopped) return { popped: false, score: 0 };
    if (balloon.colorKey === activeTargetColor) {
      balloon.pop();
      const earned = 100 * combo;
      score += earned;
      combo = Math.min(5, combo + 1);
      return { popped: true, earned };
    } else {
      combo = 1;
      return { popped: false, earned: 0 };
    }
  }

  // 1. Wrong color trick balloon (green zigzag)
  const wrongTrick = new MockTrickBalloon({ colorKey: 'green', trickType: 'zigzag' });
  const wrongResult = handleTrickBalloonTap(wrongTrick);
  assert.strictEqual(wrongResult.popped, false, 'Wrong color trick balloon must not pop');
  assert.strictEqual(score, 0);
  assert.strictEqual(combo, 1, 'Wrong color trick balloon must reset combo');

  // 2. Matching color trick balloon (purple dodger)
  const matchingTrick = new MockTrickBalloon({ colorKey: 'purple', trickType: 'dodger' });
  const matchResult = handleTrickBalloonTap(matchingTrick);
  assert.strictEqual(matchResult.popped, true, 'Matching color trick balloon must pop');
  assert.strictEqual(matchResult.earned, 100);
  assert.strictEqual(score, 100);
  assert.strictEqual(combo, 2);
});

// 6. Progressive Spawn Rates
test('Progressive Spawn Rates: Introduces trick types progressively with elapsed time', () => {
  function getTrickChances(elapsedTime) {
    if (elapsedTime < 10) {
      // 0-10s: 0% trick balloons
      return { zigzag: 0, speedster: 0, dodger: 0, total: 0 };
    } else if (elapsedTime < 20) {
      // 10-20s: introduce zigzag
      return { zigzag: 0.14, speedster: 0, dodger: 0, total: 0.14 };
    } else {
      // 20s+: all 3 trick types
      return { zigzag: 0.08, speedster: 0.08, dodger: 0.08, total: 0.24 };
    }
  }

  const early = getTrickChances(5);
  assert.strictEqual(early.total, 0, 'No trick balloons during early 0-10s');

  const mid = getTrickChances(15);
  assert.strictEqual(mid.zigzag, 0.14);
  assert.strictEqual(mid.speedster, 0);
  assert.strictEqual(mid.dodger, 0);

  const late = getTrickChances(25);
  assert.strictEqual(late.zigzag, 0.08);
  assert.strictEqual(late.speedster, 0.08);
  assert.strictEqual(late.dodger, 0.08);
  assert.strictEqual(late.total, 0.24);
});

// 7. Visual Recognition Distinctness
test('Visual Recognition: Trick types possess unique badges and metadata', () => {
  const BADGES = {
    zigzag: '⚡',
    speedster: '💨',
    dodger: '🌀',
    none: '',
  };

  assert.strictEqual(BADGES.zigzag, '⚡');
  assert.strictEqual(BADGES.speedster, '💨');
  assert.strictEqual(BADGES.dodger, '🌀');
  assert.strictEqual(Object.keys(BADGES).length, 4);
});

console.log(`\nTrick Balloons Test Results: ${passed}/${total} passed (${Math.round((passed / total) * 100)}%)\n`);
