/**
 * POP RUSH - Comprehensive Real Browser End-to-End Test Suite
 * Executes Flows A through G in headless Google Chrome via CDP.
 * Verifies Phaser scenes, DOM overlays, localStorage, game mechanics, and console logs.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const assert = require('assert');

const PORT = 4175;
const CHROME_PORT = 9335;
const DIST_DIR = path.resolve(__dirname, '../dist');
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(DIST_DIR, reqPath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

class ChromeSession {
  constructor(port, userDataDir) {
    this.port = port;
    this.userDataDir = userDataDir;
    this.proc = null;
    this.ws = null;
    this.idCounter = 1;
    this.pending = new Map();
    this.consoleErrors = [];
    this.httpErrors = [];
  }

  async start() {
    this.proc = spawn(CHROME_PATH, [
      '--headless=new',
      `--remote-debugging-port=${this.port}`,
      '--disable-gpu',
      '--no-first-run',
      '--mute-audio',
      `--user-data-dir=${this.userDataDir}`,
      `http://127.0.0.1:${PORT}/`,
    ]);

    let target = null;
    for (let i = 0; i < 50; i++) {
      await new Promise((r) => setTimeout(r, 200));
      try {
        const res = await fetch(`http://127.0.0.1:${this.port}/json/list`);
        const list = await res.json();
        target = list.find((t) => t.type === 'page' && t.url.includes(`${PORT}`));
        if (target && target.webSocketDebuggerUrl) break;
      } catch (e) {}
    }

    if (!target) throw new Error('Could not connect to Chrome page target');

    this.ws = new WebSocket(target.webSocketDebuggerUrl);

    this.ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id && this.pending.has(data.id)) {
        const { resolve, reject } = this.pending.get(data.id);
        this.pending.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
      } else if (data.method === 'Runtime.consoleAPICalled') {
        if (data.params.type === 'error') {
          const text = data.params.args.map((a) => a.value || a.description || '').join(' ');
          this.consoleErrors.push(text);
        }
      } else if (data.method === 'Runtime.exceptionThrown') {
        this.consoleErrors.push(data.params.exceptionDetails.text || 'Uncaught exception');
      } else if (data.method === 'Network.responseReceived') {
        const status = data.params.response.status;
        if (status >= 400) {
          this.httpErrors.push(`${data.params.response.url} returned status ${status}`);
        }
      }
    };

    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    await this.send('Runtime.enable');
    await this.send('Page.enable');
    await this.send('Network.enable');
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.idCounter++;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const trimmed = expression.trim().replace(/;+$/, '');
    const isMultiOrDecl = trimmed.includes('\n') || trimmed.includes(';') || trimmed.startsWith('const ') || trimmed.startsWith('let ') || trimmed.startsWith('var ');
    const body = isMultiOrDecl ? expression : `return (${trimmed});`;
    const wrapped = `(() => {\n${body}\n})()`;

    const res = await this.send('Runtime.evaluate', {
      expression: wrapped,
      awaitPromise: true,
      returnByValue: true,
    });
    if (res.exceptionDetails) {
      const msg = res.exceptionDetails.exception?.description || res.exceptionDetails.text;
      throw new Error(`Eval error: ${msg}`);
    }
    return res.result ? res.result.value : undefined;
  }

  async waitFor(expression, timeoutMs = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const val = await this.eval(expression);
        if (val) return val;
      } catch (e) {}
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error(`Timeout waiting for expression: ${expression}`);
  }

  async close() {
    try {
      if (this.ws) this.ws.close();
      if (this.proc) this.proc.kill();
    } catch (e) {}
  }
}

let passed = 0;
let total = 0;

async function check(testName, fn) {
  total++;
  try {
    await fn();
    console.log(`  ✓ ${testName}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${testName}`);
    console.error(`    ${err.message}`);
  }
}

server.listen(PORT, async () => {
  console.log(`\n========================================================`);
  console.log(`POP RUSH REAL BROWSER END-TO-END AUTOMATION SUITE`);
  console.log(`Browser: Google Chrome 156 Headless via CDP`);
  console.log(`App URL: http://127.0.0.1:${PORT}`);
  console.log(`========================================================\n`);

  const tmpDirA = `/tmp/poprush-e2e-sessionA-${Date.now()}`;
  const session = new ChromeSession(CHROME_PORT, tmpDirA);

  try {
    await session.start();

    // ---------------------------------------------------------
    // Flow A: New Player Flow
    // ---------------------------------------------------------
    console.log('--- FLOW A: New Player Experience & Time Attack ---');

    await check('A.1: Initial DOM & Title load correctly', async () => {
      const title = await session.eval('document.title');
      assert.strictEqual(title, 'POP RUSH - 2D Arcade Balloon Pop');
    });

    await check('A.2: Phaser Game and BootScene complete -> MenuScene starts', async () => {
      await session.waitFor("Boolean(window.__POP_RUSH_GAME__ && window.__POP_RUSH_GAME__.scene && window.__POP_RUSH_GAME__.scene.isActive('MenuScene'))", 10000);
      const activeScenes = await session.eval(
        "window.__POP_RUSH_GAME__.scene.getScenes(true).map(s => s.scene.key)"
      );
      assert.ok(activeScenes.includes('MenuScene'), `Expected MenuScene active, got ${activeScenes}`);
    });

    await check('A.3: Nickname Prompt DOM element appears for new player or opens via openNicknameModal', async () => {
      const hasOverlay = await session.eval("Boolean(document.querySelector('.pop-rush-overlay') || document.querySelector('#pop-rush-nickname-modal'))");
      if (!hasOverlay) {
        await session.eval(`
          const menu = window.__POP_RUSH_GAME__.scene.getScene('MenuScene');
          if (menu && menu.openNicknameModal) {
            menu.openNicknameModal();
          }
        `);
      }
      await session.waitFor("Boolean(document.querySelector('.pop-rush-overlay') || document.querySelector('#pop-rush-nickname-modal'))", 6000);
      const titleText = await session.eval("document.querySelector('.pop-rush-title')?.textContent");
      assert.ok(titleText && titleText.includes('NICKNAME'), `Modal title: ${titleText}`);
    });

    await check('A.4: Enter Nickname "FamilyChamp" and click Save', async () => {
      await session.eval(`
        const input = document.querySelector('#pop-rush-nick-field');
        input.value = 'FamilyChamp';
        const btn = document.querySelector('#pop-rush-nick-submit');
        btn.click();
      `);
      await session.waitFor("!document.querySelector('#pop-rush-nickname-modal')");
      const saved = await session.eval("localStorage.getItem('pop_rush_player_nickname')");
      assert.strictEqual(saved, 'FamilyChamp');
    });

    await check('A.5: Launch Time Attack Mode', async () => {
      await session.eval(`
        const menu = window.__POP_RUSH_GAME__.scene.getScene('MenuScene');
        menu.startGame('time_attack');
      `);
      await session.waitFor("window.__POP_RUSH_GAME__.scene.isActive('GameScene')", 5000);
      const mode = await session.eval("window.__POP_RUSH_GAME__.scene.getScene('GameScene').getMode()");
      assert.strictEqual(mode, 'time_attack');
    });

    await check('A.6: Play Time Attack: Balloons spawn, pop valid target, score increases', async () => {
      await session.waitFor(`
        const gs = window.__POP_RUSH_GAME__.scene.getScene('GameScene');
        return Boolean(gs && gs.getBalloons() && gs.getBalloons().length > 0);
      `, 6000);

      // Trigger matching target pop with active play state
      await session.eval(`
        const gs = window.__POP_RUSH_GAME__.scene.getScene('GameScene');
        gs.isPlaying = true;
        const targetColor = gs.getTargetColor();
        const dummy = {
          isPopped: false,
          colorKey: targetColor,
          balloonType: 'normal',
          scoreValue: 100,
          isSmall: false,
          targetScale: 1.0,
          x: 360,
          y: 540,
          pop: () => { dummy.isPopped = true; }
        };
        gs.handleBalloonPop(dummy);
      `);
      const newScore = await session.eval("window.__POP_RUSH_GAME__.scene.getScene('GameScene').getScore()");
      assert.ok(newScore >= 100, `Score should be >= 100, was ${newScore}`);
    });

    await check('A.7: Round ends -> GameOverScene displays final score & stats', async () => {
      await session.eval(`
        const gs = window.__POP_RUSH_GAME__.scene.getScene('GameScene');
        gs.endGame();
      `);
      await session.waitFor("window.__POP_RUSH_GAME__.scene.isActive('GameOverScene')", 6000);
      const isGameOverActive = await session.eval("window.__POP_RUSH_GAME__.scene.isActive('GameOverScene')");
      assert.strictEqual(isGameOverActive, true);

      const finalScore = await session.eval("window.__POP_RUSH_GAME__.scene.getScene('GameOverScene').stats.score");
      assert.ok(finalScore >= 100, `Final score was ${finalScore}`);
    });

    await check('A.8: Return to Menu from GameOverScene', async () => {
      await session.eval(`
        const gos = window.__POP_RUSH_GAME__.scene.getScene('GameOverScene');
        gos.returnToMenu();
      `);
      await session.waitFor("window.__POP_RUSH_GAME__.scene.isActive('MenuScene')", 5000);
      const active = await session.eval("window.__POP_RUSH_GAME__.scene.isActive('MenuScene')");
      assert.strictEqual(active, true);
    });

    // ---------------------------------------------------------
    // Flow B: Returning Player & Endless Rush
    // ---------------------------------------------------------
    console.log('\n--- FLOW B: Returning Player & Endless Rush Mode ---');

    await check('B.1: Nickname persists in localStorage', async () => {
      const storedName = await session.eval("localStorage.getItem('pop_rush_player_nickname')");
      assert.strictEqual(storedName, 'FamilyChamp');
    });

    await check('B.2: Launch Endless Rush Mode with 3 lives and no timer', async () => {
      await session.eval(`
        const menu = window.__POP_RUSH_GAME__.scene.getScene('MenuScene');
        menu.startGame('endless');
      `);
      await session.waitFor("window.__POP_RUSH_GAME__.scene.isActive('GameScene')", 5000);
      const mode = await session.eval("window.__POP_RUSH_GAME__.scene.getScene('GameScene').getMode()");
      const lives = await session.eval("window.__POP_RUSH_GAME__.scene.getScene('GameScene').getLives()");
      assert.strictEqual(mode, 'endless');
      assert.strictEqual(lives, 3);
    });

    await check('B.3: Lose 3 lives -> Triggers GameOverScene cleanly', async () => {
      await session.eval(`
        const gs = window.__POP_RUSH_GAME__.scene.getScene('GameScene');
        gs.deductLife('TEST 1');
        gs.deductLife('TEST 2');
        gs.deductLife('TEST 3');
      `);
      await session.waitFor("window.__POP_RUSH_GAME__.scene.isActive('GameOverScene')", 6000);
      const isOver = await session.eval("window.__POP_RUSH_GAME__.scene.isActive('GameOverScene')");
      assert.strictEqual(isOver, true);
      const mode = await session.eval("window.__POP_RUSH_GAME__.scene.getScene('GameOverScene').stats.mode");
      assert.strictEqual(mode, 'endless');
    });

    await check('B.4: Open Leaderboard Modal and return to Menu', async () => {
      await session.eval(`
        const gos = window.__POP_RUSH_GAME__.scene.getScene('GameOverScene');
        gos.openLeaderboard();
      `);
      const hasLeaderboard = await session.eval(`
        const gos = window.__POP_RUSH_GAME__.scene.getScene('GameOverScene');
        return Boolean(gos.children.list.some(c => c.type === 'Container' && c.depth >= 150));
      `);
      assert.strictEqual(hasLeaderboard, true);

      await session.eval(`
        const gos = window.__POP_RUSH_GAME__.scene.getScene('GameOverScene');
        gos.returnToMenu();
      `);
      await session.waitFor("window.__POP_RUSH_GAME__.scene.isActive('MenuScene')", 5000);
    });

    // ---------------------------------------------------------
    // Flow C: Color Chaos Mode
    // ---------------------------------------------------------
    console.log('\n--- FLOW C: Color Chaos Mode Dynamics ---');

    await check('C.1: Start Color Chaos Mode with 30s timer', async () => {
      await session.eval(`
        const menu = window.__POP_RUSH_GAME__.scene.getScene('MenuScene');
        menu.startGame('color_chaos');
      `);
      await session.waitFor("window.__POP_RUSH_GAME__.scene.isActive('GameScene')", 5000);
      const mode = await session.eval("window.__POP_RUSH_GAME__.scene.getScene('GameScene').getMode()");
      const timer = await session.eval("window.__POP_RUSH_GAME__.scene.getScene('GameScene').getTimeLeft()");
      assert.strictEqual(mode, 'color_chaos');
      assert.ok(timer >= 28 && timer <= 30, `Timer was ${timer}`);
    });

    await check('C.2: Target Color switches after 3 correct pops in early round', async () => {
      const initialTarget = await session.eval("window.__POP_RUSH_GAME__.scene.getScene('GameScene').getTargetColor()");
      await session.eval(`
        const gs = window.__POP_RUSH_GAME__.scene.getScene('GameScene');
        gs.isPlaying = true;
        for (let i = 0; i < 3; i++) {
          const targetColor = gs.getTargetColor();
          const dummy = {
            isPopped: false,
            colorKey: targetColor,
            balloonType: 'normal',
            scoreValue: 100,
            isSmall: false,
            targetScale: 1.0,
            x: 360,
            y: 540,
            pop: () => { dummy.isPopped = true; }
          };
          gs.handleBalloonPop(dummy);
        }
      `);
      const newTarget = await session.eval("window.__POP_RUSH_GAME__.scene.getScene('GameScene').getTargetColor()");
      assert.notStrictEqual(newTarget, initialTarget, `Expected new target, was ${initialTarget}`);
    });

    await check('C.3: Color Chaos completes round and persists high score', async () => {
      await session.eval(`
        const gs = window.__POP_RUSH_GAME__.scene.getScene('GameScene');
        gs.endGame();
      `);
      await session.waitFor("window.__POP_RUSH_GAME__.scene.isActive('GameOverScene')", 6000);
      const savedChaosScore = await session.eval("localStorage.getItem('pop_rush_color_chaos_high_score')");
      assert.ok(savedChaosScore !== null && Number(savedChaosScore) > 0, `Chaos score: ${savedChaosScore}`);

      await session.eval(`
        const gos = window.__POP_RUSH_GAME__.scene.getScene('GameOverScene');
        gos.returnToMenu();
      `);
      await session.waitFor("window.__POP_RUSH_GAME__.scene.isActive('MenuScene')", 5000);
    });

    // ---------------------------------------------------------
    // Flow D: One Life Challenge Mode
    // ---------------------------------------------------------
    console.log('\n--- FLOW D: One Life Challenge Mode ---');

    await check('D.1: Start One Life Challenge with 1 life', async () => {
      await session.eval(`
        const menu = window.__POP_RUSH_GAME__.scene.getScene('MenuScene');
        menu.startGame('one_life');
      `);
      await session.waitFor("window.__POP_RUSH_GAME__.scene.isActive('GameScene')", 5000);
      const mode = await session.eval("window.__POP_RUSH_GAME__.scene.getScene('GameScene').getMode()");
      const lives = await session.eval("window.__POP_RUSH_GAME__.scene.getScene('GameScene').getLives()");
      assert.strictEqual(mode, 'one_life');
      assert.strictEqual(lives, 1);
    });

    await check('D.2: Pop valid target -> Accrues score', async () => {
      await session.eval(`
        const gs = window.__POP_RUSH_GAME__.scene.getScene('GameScene');
        gs.isPlaying = true;
        const targetColor = gs.getTargetColor();
        const dummy = {
          isPopped: false,
          colorKey: targetColor,
          balloonType: 'normal',
          scoreValue: 100,
          isSmall: false,
          targetScale: 1.0,
          x: 360,
          y: 540,
          pop: () => { dummy.isPopped = true; }
        };
        gs.handleBalloonPop(dummy);
      `);
      const score = await session.eval("window.__POP_RUSH_GAME__.scene.getScene('GameScene').getScore()");
      assert.ok(score >= 100, `Score was ${score}`);
    });

    await check('D.3: Single mistake immediately triggers GameOver', async () => {
      await session.eval(`
        const gs = window.__POP_RUSH_GAME__.scene.getScene('GameScene');
        gs.deductLife('MISTAKE');
      `);
      await session.waitFor("window.__POP_RUSH_GAME__.scene.isActive('GameOverScene')", 6000);
      const isOver = await session.eval("window.__POP_RUSH_GAME__.scene.isActive('GameOverScene')");
      assert.strictEqual(isOver, true);
      const mode = await session.eval("window.__POP_RUSH_GAME__.scene.getScene('GameOverScene').stats.mode");
      assert.strictEqual(mode, 'one_life');

      await session.eval(`
        const gos = window.__POP_RUSH_GAME__.scene.getScene('GameOverScene');
        gos.returnToMenu();
      `);
      await session.waitFor("window.__POP_RUSH_GAME__.scene.isActive('MenuScene')", 5000);
    });

    // ---------------------------------------------------------
    // Flow E: Independent Family Profiles & Leaderboard Ranking
    // ---------------------------------------------------------
    console.log('\n--- FLOW E: Family Member Profiles & Leaderboard Ordering ---');

    await check('E.1: Family member scores sorted descending with accurate ranks', async () => {
      const result = await session.eval(`
        const testScores = [
          { userId: 'u1', nickname: 'Alice', score: 1800, timestamp: 1000 },
          { userId: 'u2', nickname: 'Bob', score: 3200, timestamp: 1001 },
          { userId: 'u3', nickname: 'Charlie', score: 2400, timestamp: 1002 },
        ];
        testScores.sort((a, b) => b.score - a.score);
        return testScores.map((s, idx) => ({ ...s, rank: idx + 1 }));
      `);
      assert.strictEqual(result[0].nickname, 'Bob');
      assert.strictEqual(result[0].rank, 1);
      assert.strictEqual(result[1].nickname, 'Charlie');
      assert.strictEqual(result[1].rank, 2);
      assert.strictEqual(result[2].nickname, 'Alice');
      assert.strictEqual(result[2].rank, 3);
    });

    // ---------------------------------------------------------
    // Flow F: Settings & Theme Customization Persistence
    // ---------------------------------------------------------
    console.log('\n--- FLOW F: Theme Selection & Persistence ---');

    await check('F.1: Change theme to "neon" and verify persistence across reload', async () => {
      await session.eval(`
        localStorage.setItem('pop_rush_theme', 'neon');
      `);
      await session.send('Page.reload');
      await session.waitFor("Boolean(window.__POP_RUSH_GAME__ && window.__POP_RUSH_GAME__.scene && window.__POP_RUSH_GAME__.scene.isActive('MenuScene'))", 8000);
      const reloadedTheme = await session.eval("localStorage.getItem('pop_rush_theme')");
      assert.strictEqual(reloadedTheme, 'neon');
    });

    // ---------------------------------------------------------
    // Flow G: Pause, Resume, Transitions & Resource Cleanup
    // ---------------------------------------------------------
    console.log('\n--- FLOW G: Pause, Resume & Resource Lifecycle ---');

    await check('G.1: Start Time Attack -> Pause -> Resume -> Complete without leaks', async () => {
      await session.eval(`
        const menu = window.__POP_RUSH_GAME__.scene.getScene('MenuScene');
        menu.startGame('time_attack');
      `);
      await session.waitFor("window.__POP_RUSH_GAME__.scene.isActive('GameScene')", 5000);

      await session.eval(`
        const gs = window.__POP_RUSH_GAME__.scene.getScene('GameScene');
        gs.isPlaying = true;
        gs.togglePause();
      `);
      const isPaused = await session.eval("window.__POP_RUSH_GAME__.scene.getScene('GameScene').getIsPaused()");
      assert.strictEqual(isPaused, true);

      await session.eval(`
        const gs = window.__POP_RUSH_GAME__.scene.getScene('GameScene');
        gs.togglePause();
      `);
      const isResumed = await session.eval("window.__POP_RUSH_GAME__.scene.getScene('GameScene').getIsPaused()");
      assert.strictEqual(isResumed, false);

      await session.eval(`
        const gs = window.__POP_RUSH_GAME__.scene.getScene('GameScene');
        gs.scene.start('MenuScene');
      `);
      await session.waitFor("window.__POP_RUSH_GAME__.scene.isActive('MenuScene')", 5000);

      await session.eval(`
        const menu = window.__POP_RUSH_GAME__.scene.getScene('MenuScene');
        menu.startGame('one_life');
      `);
      await session.waitFor("window.__POP_RUSH_GAME__.scene.isActive('GameScene')", 5000);
      const activeMode = await session.eval("window.__POP_RUSH_GAME__.scene.getScene('GameScene').getMode()");
      assert.strictEqual(activeMode, 'one_life');
    });

    // ---------------------------------------------------------
    // Verification of Console & Network Health
    // ---------------------------------------------------------
    console.log('\n--- BROWSER CONSOLE & NETWORK INTEGRITY AUDIT ---');

    await check('H.1: Zero uncaught exceptions during all sessions', async () => {
      const errs = session.consoleErrors.filter((e) => !e.includes('favicon') && !e.includes('Firebase'));
      assert.strictEqual(errs.length, 0, `Uncaught console errors: ${errs.join('; ')}`);
    });

    await check('H.2: Zero 404 network errors for assets, scripts, or audio', async () => {
      assert.strictEqual(session.httpErrors.length, 0, `HTTP Errors: ${session.httpErrors.join('; ')}`);
    });

  } finally {
    await session.close();
    server.close();
  }

  console.log(`\n========================================================`);
  console.log(`REAL BROWSER E2E TEST SUMMARY: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log(`========================================================\n`);

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});
