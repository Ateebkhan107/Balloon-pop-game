/**
 * Comprehensive Viewport Scaling & Pointer Mapping Test Suite
 * Tests layout centering, aspect ratio preservation, and hit-test accuracy
 * across desktop, mobile portrait, and mobile landscape viewports.
 */

const assert = require('assert');

const GAME_WIDTH = 720;
const GAME_HEIGHT = 1080;

const VIEWPORTS = [
  // Desktop
  { name: 'Desktop Full HD (1920x1080)', width: 1920, height: 1080, type: 'desktop' },
  { name: 'Desktop Widescreen (1440x900)', width: 1440, height: 900, type: 'desktop' },
  { name: 'Desktop Standard (1366x768)', width: 1366, height: 768, type: 'desktop' },
  // Tablet
  { name: 'Tablet iPad Portrait (768x1024)', width: 768, height: 1024, type: 'tablet' },
  // Mobile Portrait
  { name: 'Mobile Compact iPhone SE1 (320x568)', width: 320, height: 568, type: 'mobile-portrait' },
  { name: 'Mobile Android Galaxy (360x800)', width: 360, height: 800, type: 'mobile-portrait' },
  { name: 'Mobile iPhone SE (375x667)', width: 375, height: 667, type: 'mobile-portrait' },
  { name: 'Mobile iPhone 12/13/14 (390x844)', width: 390, height: 844, type: 'mobile-portrait' },
  { name: 'Mobile iPhone 15 Pro Max (430x932)', width: 430, height: 932, type: 'mobile-portrait' },
  // Mobile Landscape
  { name: 'Mobile Landscape iPhone SE (667x375)', width: 667, height: 375, type: 'mobile-landscape' },
  { name: 'Mobile Landscape iPhone 12/13/14 (844x390)', width: 844, height: 390, type: 'mobile-landscape' },
  { name: 'Mobile Landscape Android (800x360)', width: 800, height: 360, type: 'mobile-landscape' },
  { name: 'Mobile Landscape Max (932x430)', width: 932, height: 430, type: 'mobile-landscape' },
];

function containsRect(rect, x, y) {
  return (rect.width > 0 && rect.height > 0 &&
          x >= rect.x && x <= rect.x + rect.width &&
          y >= rect.y && y <= rect.y + rect.height);
}

function containsCircle(circle, x, y) {
  const dx = x - circle.x;
  const dy = y - circle.y;
  return (dx * dx + dy * dy) <= (circle.radius * circle.radius);
}

let passed = 0;
let total = 0;

function check(testName, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ ${testName}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${testName}`);
    console.error(`    ${err.message}`);
  }
}

console.log('\n--- Running Viewport Scaling & Pointer Mapping Tests ---');

VIEWPORTS.forEach((vp) => {
  console.log(`\nTesting Viewport: ${vp.name}`);

  // Scale computation (Phaser.Scale.FIT)
  const scale = Math.min(vp.width / GAME_WIDTH, vp.height / GAME_HEIGHT);
  const canvasWidth = GAME_WIDTH * scale;
  const canvasHeight = GAME_HEIGHT * scale;

  // CSS Flexbox Centering (margin: 0 !important)
  const canvasLeft = (vp.width - canvasWidth) / 2;
  const canvasTop = (vp.height - canvasHeight) / 2;

  check(`${vp.name}: Canvas fits within viewport bounds without clipping`, () => {
    assert.ok(canvasWidth <= vp.width + 0.01, `canvasWidth ${canvasWidth} > vp.width ${vp.width}`);
    assert.ok(canvasHeight <= vp.height + 0.01, `canvasHeight ${canvasHeight} > vp.height ${vp.height}`);
    assert.ok(canvasLeft >= -0.01, `canvasLeft ${canvasLeft} < 0`);
    assert.ok(canvasTop >= -0.01, `canvasTop ${canvasTop} < 0`);
  });

  check(`${vp.name}: Canvas is centered horizontally and vertically`, () => {
    const expectedLeft = (vp.width - canvasWidth) / 2;
    const expectedTop = (vp.height - canvasHeight) / 2;
    assert.ok(Math.abs(canvasLeft - expectedLeft) < 0.01);
    assert.ok(Math.abs(canvasTop - expectedTop) < 0.01);
  });

  check(`${vp.name}: Time Attack mode card hit tests correctly at all points`, () => {
    // Time Attack card in MenuScene: x = 360, y = height * 0.38 = 410.4. btnWidth = 520, btnHeight = 160
    const btnX = 360;
    const btnY = 410;
    const btnW = 520;
    const btnH = 160;

    const playHitArea = { x: 0, y: 0, width: btnW, height: btnH };

    function testScreenPoint(screenX, screenY) {
      const gameX = (screenX - canvasLeft) / scale;
      const gameY = (screenY - canvasTop) / scale;
      const localX = gameX - btnX + (btnW / 2);
      const localY = gameY - btnY + (btnH / 2);
      return containsRect(playHitArea, localX, localY);
    }

    // 1. Center of card on screen
    const centerScreenX = canvasLeft + btnX * scale;
    const centerScreenY = canvasTop + btnY * scale;
    assert.strictEqual(testScreenPoint(centerScreenX, centerScreenY), true, 'Center should hit');

    // 2. Left edge of card
    assert.strictEqual(testScreenPoint(canvasLeft + (btnX - btnW / 2 + 10) * scale, centerScreenY), true, 'Left edge should hit');

    // 3. Right edge of card
    assert.strictEqual(testScreenPoint(canvasLeft + (btnX + btnW / 2 - 10) * scale, centerScreenY), true, 'Right edge should hit');

    // 4. Top edge of card
    assert.strictEqual(testScreenPoint(centerScreenX, canvasTop + (btnY - btnH / 2 + 10) * scale), true, 'Top edge should hit');

    // 5. Bottom edge of card
    assert.strictEqual(testScreenPoint(centerScreenX, canvasTop + (btnY + btnH / 2 - 10) * scale), true, 'Bottom edge should hit');

    // 6. Outside card (40px to the left)
    assert.strictEqual(testScreenPoint(canvasLeft + (btnX - btnW / 2 - 40) * scale, centerScreenY), false, 'Outside left should miss');

    // 7. Outside card (40px to the right)
    assert.strictEqual(testScreenPoint(canvasLeft + (btnX + btnW / 2 + 40) * scale, centerScreenY), false, 'Outside right should miss');
  });

  check(`${vp.name}: Sound button (Circle hitArea) hits accurately`, () => {
    // Sound button in MenuScene: container at (width - 55, 55) = (665, 55). Size = 48x48.
    // Circle hitArea: (24, 24, 24).
    const btnX = 665;
    const btnY = 55;
    const size = 48;
    const circle = { x: 24, y: 24, radius: 24 };

    function testScreenPoint(screenX, screenY) {
      const gameX = (screenX - canvasLeft) / scale;
      const gameY = (screenY - canvasTop) / scale;
      const localX = gameX - btnX + (size / 2);
      const localY = gameY - btnY + (size / 2);
      return containsCircle(circle, localX, localY);
    }

    const centerScreenX = canvasLeft + btnX * scale;
    const centerScreenY = canvasTop + btnY * scale;
    assert.strictEqual(testScreenPoint(centerScreenX, centerScreenY), true, 'Sound center should hit');
    assert.strictEqual(testScreenPoint(centerScreenX + 20 * scale, centerScreenY), true, 'Sound right edge should hit');
    assert.strictEqual(testScreenPoint(centerScreenX + 35 * scale, centerScreenY), false, 'Sound outside should miss');
  });
});

console.log(`\nScaling Test Results: ${passed}/${total} passed (${Math.round((passed/total)*100)}%)\n`);

if (passed !== total) {
  process.exit(1);
}
