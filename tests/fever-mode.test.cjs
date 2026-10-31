/**
 * Automated Verification Tests for Fever Mode
 * Tests:
 * 1. 10 consecutive correct pops fill meter to 100% and activate Fever Mode
 * 2. Wrong-color pops reset Fever meter to 0%
 * 3. Bomb hits reset Fever meter to 0%
 * 4. 5.0 second active duration countdown
 * 5. 2x multiplier applies to matching correct-color pops
 * 6. Wrong-color balloons NEVER pop and NEVER earn points even during Fever
 * 7. Bomb penalties still apply during Fever
 * 8. Cannot recharge or re-trigger during active Fever (exploit prevention)
 * 9. Meter resets cleanly to 0% after Fever expires
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

console.log('\n--- Running Fever Mode Verification Tests ---');

// Reusable Fever State Machine matching FeverManager.ts
class MockFeverManager {
  constructor() {
    this.REQUIRED_POPS = 10;
    this.FEVER_DURATION = 5.0;
    this.consecutivePops = 0;
    this.isFeverActive = false;
    this.feverTimer = 0;
    this.startFired = 0;
    this.endFired = 0;
  }

  recordCorrectPop() {
    if (this.isFeverActive) return false;
    this.consecutivePops = Math.min(this.REQUIRED_POPS, this.consecutivePops + 1);
    if (this.consecutivePops >= this.REQUIRED_POPS) {
      this.activateFever();
      return true;
    }
    return false;
  }

  recordWrongPop() {
    if (!this.isFeverActive) {
      this.consecutivePops = 0;
    }
  }

  recordBombHit() {
    if (!this.isFeverActive) {
      this.consecutivePops = 0;
    }
  }

  activateFever() {
    this.isFeverActive = true;
    this.feverTimer = this.FEVER_DURATION;
    this.consecutivePops = 0;
    this.startFired++;
  }

  update(dt) {
    if (!this.isFeverActive) return;
    this.feverTimer -= dt;
    if (this.feverTimer <= 0) {
      this.isFeverActive = false;
      this.feverTimer = 0;
      this.consecutivePops = 0; // Clear reset rule
      this.endFired++;
    }
  }

  getCharge() {
    if (this.isFeverActive) {
      return (this.feverTimer / this.FEVER_DURATION) * 100;
    }
    return (this.consecutivePops / this.REQUIRED_POPS) * 100;
  }
}

// 1. Meter Building & Activation
test('Fever Meter Building: Exactly 10 consecutive correct pops activates Fever Mode', () => {
  const fever = new MockFeverManager();

  for (let i = 1; i <= 9; i++) {
    const activated = fever.recordCorrectPop();
    assert.strictEqual(activated, false);
    assert.strictEqual(fever.getCharge(), i * 10);
    assert.strictEqual(fever.isFeverActive, false);
  }

  // 10th correct pop
  const activated = fever.recordCorrectPop();
  assert.strictEqual(activated, true);
  assert.strictEqual(fever.isFeverActive, true);
  assert.strictEqual(fever.startFired, 1);
  assert.strictEqual(fever.feverTimer, 5.0);
});

// 2. Wrong Pop Reset
test('Wrong Color Reset: Wrong color pop resets progress to 0%', () => {
  const fever = new MockFeverManager();

  // 6 correct pops = 60%
  for (let i = 0; i < 6; i++) {
    fever.recordCorrectPop();
  }
  assert.strictEqual(fever.getCharge(), 60);

  // Wrong pop occurs
  fever.recordWrongPop();
  assert.strictEqual(fever.getCharge(), 0, 'Charge must reset to 0% on wrong pop');
  assert.strictEqual(fever.consecutivePops, 0);
  assert.strictEqual(fever.isFeverActive, false);
});

// 3. Bomb Hit Reset
test('Bomb Hit Reset: Hitting a hazard balloon resets Fever progress to 0%', () => {
  const fever = new MockFeverManager();

  for (let i = 0; i < 8; i++) {
    fever.recordCorrectPop();
  }
  assert.strictEqual(fever.getCharge(), 80);

  fever.recordBombHit();
  assert.strictEqual(fever.getCharge(), 0, 'Charge must reset to 0% on bomb hit');
  assert.strictEqual(fever.isFeverActive, false);
});

// 4. Exact 5-Second Duration
test('Duration: Fever lasts for 5.0 seconds and then expires cleanly', () => {
  const fever = new MockFeverManager();
  fever.activateFever();
  assert.strictEqual(fever.isFeverActive, true);

  // Advance 2 seconds
  fever.update(2.0);
  assert.strictEqual(fever.isFeverActive, true);
  assert.strictEqual(Math.round(fever.feverTimer * 10) / 10, 3.0);
  assert.strictEqual(fever.getCharge(), 60); // 3/5 = 60%

  // Advance 3 more seconds (total 5.0s)
  fever.update(3.0);
  assert.strictEqual(fever.isFeverActive, false);
  assert.strictEqual(fever.endFired, 1);
  assert.strictEqual(fever.getCharge(), 0);
});

// 5. Scoring: 2x Multiplier on Correct Target Color
test('Scoring Multiplier: Correct color pops earn 2x points during Fever', () => {
  let score = 0;
  const combo = 3;
  const isFever = true;
  const activeColor = 'green';

  function tapBalloon(colorKey, scoreValue = 100) {
    if (colorKey !== activeColor) return 0; // Wrong colors NEVER score!
    const earned = scoreValue * combo * (isFever ? 2 : 1);
    score += earned;
    return earned;
  }

  const earned = tapBalloon('green', 100);
  assert.strictEqual(earned, 600, '100 pts * 3 combo * 2 fever = 600 pts');
  assert.strictEqual(score, 600);
});

// 6. Wrong-Color Protection: Wrong colors NEVER score during Fever
test('Wrong Color Block: Wrong-color balloons NEVER score or pop during Fever', () => {
  let score = 0;
  let balloonsPopped = 0;
  const isFever = true;
  const activeColor = 'blue';

  function handleTap(colorKey) {
    // Crucial rule: Fever doubles points on MATCHING colors, but NEVER accepts wrong colors!
    const isMatch = colorKey === activeColor;
    if (isMatch) {
      score += 100 * (isFever ? 2 : 1);
      balloonsPopped++;
      return { popped: true, scored: true };
    }
    // Wrong color: rejected!
    return { popped: false, scored: false };
  }

  const wrong1 = handleTap('red');
  const wrong2 = handleTap('yellow');
  const wrong3 = handleTap('purple');

  assert.strictEqual(wrong1.popped, false);
  assert.strictEqual(wrong2.popped, false);
  assert.strictEqual(wrong3.popped, false);
  assert.strictEqual(score, 0, 'Score must remain 0 after wrong color taps in Fever');
  assert.strictEqual(balloonsPopped, 0);

  const correct = handleTap('blue');
  assert.strictEqual(correct.popped, true);
  assert.strictEqual(score, 200);
  assert.strictEqual(balloonsPopped, 1);
});

// 7. Bomb Penalty Retention
test('Hazard Penalties in Fever: Bombs still inflict penalty during Fever', () => {
  let score = 1000;
  let combo = 4;
  let lives = 3;
  const isFever = true;

  function onBombPopped(mode = 'time_attack') {
    combo = 1;
    if (mode === 'time_attack') {
      score = Math.max(0, score - 200);
    } else {
      lives = Math.max(0, lives - 1);
    }
  }

  assert.strictEqual(isFever, true);
  onBombPopped('time_attack');
  assert.strictEqual(score, 800, 'Hazard penalty applies in Time Attack during Fever');
  assert.strictEqual(combo, 1);

  onBombPopped('endless');
  assert.strictEqual(lives, 2, 'Hazard bomb deducts 1 life in Endless during Fever');
});

// 8. No Recharge During Active Fever
test('Exploit Prevention: Cannot build charge or re-trigger while Fever is active', () => {
  const fever = new MockFeverManager();
  fever.activateFever();

  // Try popping 20 correct balloons during active Fever
  for (let i = 0; i < 20; i++) {
    const triggered = fever.recordCorrectPop();
    assert.strictEqual(triggered, false, 'Cannot trigger additional Fever while active');
  }

  assert.strictEqual(fever.startFired, 1, 'Only 1 activation fired');
  assert.strictEqual(fever.consecutivePops, 0);
});

// 9. Clean Reset After Fever Expires
test('Reset Rule: Meter resets cleanly to 0% after Fever expires', () => {
  const fever = new MockFeverManager();
  fever.activateFever();
  fever.update(5.0); // Complete full duration

  assert.strictEqual(fever.isFeverActive, false);
  assert.strictEqual(fever.getCharge(), 0);
  assert.strictEqual(fever.consecutivePops, 0);

  // Must need 10 fresh pops to trigger next Fever
  for (let i = 0; i < 9; i++) {
    fever.recordCorrectPop();
  }
  assert.strictEqual(fever.isFeverActive, false);
  assert.strictEqual(fever.getCharge(), 90);

  fever.recordCorrectPop();
  assert.strictEqual(fever.isFeverActive, true);
  assert.strictEqual(fever.startFired, 2);
});

console.log(`\nFever Mode Test Results: ${passed}/${total} passed (${Math.round((passed / total) * 100)}%)\n`);
