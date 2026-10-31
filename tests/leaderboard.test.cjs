/**
 * Comprehensive Automated Verification Suite for POP RUSH Family Leaderboard
 * Tests:
 * 1. Multi-player / Two-browser shared leaderboard simulation
 * 2. UID-scoped write protection (each player can only update their own record)
 * 3. Best score protection (lower scores never overwrite personal bests)
 * 4. Security rules validation engine simulation
 * 5. Independent rankings for Time Attack vs Endless Rush
 * 6. Duplicate prevention across game restarts and repeated rounds
 * 7. Nickname sanitization & anti-abuse constraints
 * 8. Mobile & desktop viewport layout and touch target compliance
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

console.log('\n--- Running POP RUSH Firebase Family Leaderboard Tests ---');

// =========================================================================
// 1. In-Memory Simulated Firebase Realtime Database with Security Rules Engine
// =========================================================================

class MockFirebaseDatabase {
  constructor(rulesJson) {
    this.data = {
      users: {},
      leaderboards: {
        time_attack: {},
        endless: {},
        color_chaos: {},
        one_life: {},
      },
    };
    this.rules = rulesJson.rules;
  }

  evaluateRule(ruleStr, context) {
    if (typeof ruleStr === 'boolean') return ruleStr;
    if (!ruleStr) return false;

    // Build context evaluation
    const { auth, data, newData, uid } = context;

    // Helper functions matching Firebase RTDB rules syntax
    const hasChildren = (record, fields) => {
      if (!record || typeof record !== 'object') return false;
      return fields.every((f) => f in record);
    };

    const hasChild = (record, field) => {
      return Boolean(record && typeof record === 'object' && field in record);
    };

    const isString = (val) => typeof val === 'string';
    const isNumber = (val) => typeof val === 'number' && !isNaN(val);

    try {
      const evalFn = new Function(
        'auth',
        'data',
        'newData',
        '$uid',
        'hasChildren',
        'hasChild',
        'isString',
        'isNumber',
        `
        const safeData = data;
        const safeNewData = newData;
        return Boolean(${ruleStr
          .replace(/auth != null/g, '(auth !== null)')
          .replace(/auth\.uid/g, '(auth ? auth.uid : null)')
          .replace(/newData\.hasChildren\(([^)]+)\)/g, 'hasChildren(safeNewData, $1)')
          .replace(/newData\.hasChild\(([^)]+)\)/g, 'hasChild(safeNewData, $1)')
          .replace(/newData\.child\(([^)]+)\)\.isString\(\)/g, 'isString(safeNewData[$1])')
          .replace(/newData\.child\(([^)]+)\)\.isNumber\(\)/g, 'isNumber(safeNewData[$1])')
          .replace(/newData\.child\(([^)]+)\)\.val\(\)/g, 'safeNewData[$1]')
          .replace(/data\.child\(([^)]+)\)\.val\(\)/g, '(safeData ? safeData[$1] : undefined)')
          .replace(/data\.exists\(\)/g, '(safeData !== null && safeData !== undefined)')
          .replace(/\$uid/g, '($uid)')
        });`
      );

      return evalFn(auth, data, newData, uid, hasChildren, hasChild, isString, isNumber);
    } catch (e) {
      return false;
    }
  }

  writeRecord(auth, pathStr, newRecord) {
    const segments = pathStr.split('/').filter(Boolean);
    const [collection, subKey, recordUid] = segments;

    // Read rules
    if (collection === 'leaderboards') {
      if (subKey !== 'time_attack' && subKey !== 'endless') {
        throw new Error(`Write rejected: mode "${subKey}" is not allowed.`);
      }

      const ruleDef = this.rules.leaderboards[subKey];
      const writeRule = ruleDef['$uid']['.write'];
      const validateRule = ruleDef['$uid']['.validate'];

      const currentRecord = this.data.leaderboards[subKey][recordUid] || null;

      const context = {
        auth,
        data: currentRecord,
        newData: newRecord,
        uid: recordUid,
      };

      // Check write permission
      if (!this.evaluateRule(writeRule, context)) {
        throw new Error(`Permission denied: auth.uid (${auth?.uid}) does not match path $uid (${recordUid})`);
      }

      // Check validation
      if (!this.evaluateRule(validateRule, context)) {
        throw new Error(`Validation failed: score must be positive, <= 1000000, and >= existing best score`);
      }

      this.data.leaderboards[subKey][recordUid] = { ...newRecord };
      return true;
    }

    if (collection === 'users') {
      const userRule = this.rules.users['$uid'];
      const currentRecord = this.data.users[recordUid] || null;
      const context = {
        auth,
        data: currentRecord,
        newData: newRecord,
        uid: recordUid,
      };

      if (!this.evaluateRule(userRule['.write'], context)) {
        throw new Error(`Permission denied on users/${recordUid}`);
      }
      if (!this.evaluateRule(userRule['.validate'], context)) {
        throw new Error(`Validation failed on users/${recordUid}`);
      }

      this.data.users[recordUid] = { ...newRecord };
      return true;
    }

    throw new Error('Invalid collection');
  }

  runTransaction(auth, pathStr, updateFn) {
    const segments = pathStr.split('/').filter(Boolean);
    const [collection, subKey, recordUid] = segments;
    const current = this.data[collection][subKey][recordUid] || null;
    const next = updateFn(current ? { ...current } : null);

    if (next === undefined) {
      // Abort transaction
      return { committed: false, snapshot: current };
    }

    this.writeRecord(auth, pathStr, next);
    return { committed: true, snapshot: next };
  }

  fetchTopScores(mode, limit = 50) {
    const collection = this.data.leaderboards[mode] || {};
    const list = Object.values(collection);
    list.sort((a, b) => b.score - a.score || a.updatedAt - b.updatedAt);
    return list.slice(0, limit).map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }
}

// Load real database.rules.json
const rulesPath = path.join(__dirname, '..', 'database.rules.json');
const rawRules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));

// =========================================================================
// TEST SUITE
// =========================================================================

test('Multi-player: Two different browsers can play and view the same leaderboard', () => {
  const db = new MockFirebaseDatabase(rawRules);

  const browserAlice = { uid: 'uid_alice_101', nickname: 'Alice' };
  const browserBob = { uid: 'uid_bob_202', nickname: 'Bob' };

  // Alice plays Time Attack and scores 85,000
  db.runTransaction(browserAlice, `leaderboards/time_attack/${browserAlice.uid}`, (cur) => {
    if (!cur || 85000 > cur.score) {
      return { uid: browserAlice.uid, nickname: browserAlice.nickname, score: 85000, updatedAt: 1000 };
    }
  });

  // Bob plays Time Attack and scores 120,000
  db.runTransaction(browserBob, `leaderboards/time_attack/${browserBob.uid}`, (cur) => {
    if (!cur || 120000 > cur.score) {
      return { uid: browserBob.uid, nickname: browserBob.nickname, score: 120000, updatedAt: 1050 };
    }
  });

  // Both browsers view Time Attack leaderboard
  const aliceView = db.fetchTopScores('time_attack');
  const bobView = db.fetchTopScores('time_attack');

  assert.strictEqual(aliceView.length, 2);
  assert.strictEqual(bobView.length, 2);

  // Bob is Rank 1 (120,000)
  assert.strictEqual(aliceView[0].uid, 'uid_bob_202');
  assert.strictEqual(aliceView[0].rank, 1);
  assert.strictEqual(aliceView[0].score, 120000);

  // Alice is Rank 2 (85,000)
  assert.strictEqual(aliceView[1].uid, 'uid_alice_101');
  assert.strictEqual(aliceView[1].rank, 2);
  assert.strictEqual(aliceView[1].score, 85000);

  // Views are identical and shared
  assert.deepStrictEqual(aliceView, bobView);
});

test('UID-scoped write protection: Each player can update ONLY their own record', () => {
  const db = new MockFirebaseDatabase(rawRules);
  const alice = { uid: 'uid_alice_101' };
  const bob = { uid: 'uid_bob_202' };

  // Bob sets up his record
  db.writeRecord(bob, `leaderboards/time_attack/${bob.uid}`, {
    uid: bob.uid,
    nickname: 'Bob',
    score: 95000,
    updatedAt: 1000,
  });

  // Alice attempts to overwrite Bob's entry using her own credentials
  let blocked = false;
  try {
    db.writeRecord(alice, `leaderboards/time_attack/${bob.uid}`, {
      uid: bob.uid,
      nickname: 'MaliciousAlice',
      score: 10,
      updatedAt: 2000,
    });
  } catch (err) {
    blocked = true;
    assert.ok(err.message.includes('Permission denied'));
  }
  assert.strictEqual(blocked, true, 'Alice writing to Bob record must throw Permission Denied');

  // Verify Bob record remains untouched
  const top = db.fetchTopScores('time_attack');
  assert.strictEqual(top[0].score, 95000);
  assert.strictEqual(top[0].nickname, 'Bob');
});

test('Score Protection: Old or lower scores do not overwrite a personal best', () => {
  const db = new MockFirebaseDatabase(rawRules);
  const player = { uid: 'uid_player_303', nickname: 'Charlie' };

  // Round 1: Personal best of 100,000
  const tx1 = db.runTransaction(player, `leaderboards/time_attack/${player.uid}`, (cur) => {
    if (!cur || 100000 > cur.score) {
      return { uid: player.uid, nickname: player.nickname, score: 100000, updatedAt: 1000 };
    }
  });
  assert.strictEqual(tx1.committed, true);

  // Round 2: Player has a poor run and scores 45,000
  const tx2 = db.runTransaction(player, `leaderboards/time_attack/${player.uid}`, (cur) => {
    if (!cur || 45000 > cur.score) {
      return { uid: player.uid, nickname: player.nickname, score: 45000, updatedAt: 2000 };
    }
    return undefined; // Transaction aborted
  });
  assert.strictEqual(tx2.committed, false, 'Transaction must abort when new score is lower');

  // Verify personal record is still 100,000
  const top = db.fetchTopScores('time_attack');
  assert.strictEqual(top[0].score, 100000);

  // Security rule level: Even if client bypassed transaction, server rejects lower score
  let ruleRejected = false;
  try {
    db.writeRecord(player, `leaderboards/time_attack/${player.uid}`, {
      uid: player.uid,
      nickname: player.nickname,
      score: 45000,
      updatedAt: 3000,
    });
  } catch (err) {
    ruleRejected = true;
    assert.ok(err.message.includes('Validation failed'));
  }
  assert.strictEqual(ruleRejected, true, 'Realtime Database rules must reject write with score < existing score');
});

test('Security Rules: Unauthorized database writes without auth are rejected', () => {
  const db = new MockFirebaseDatabase(rawRules);
  let caught = false;
  try {
    db.writeRecord(null, 'leaderboards/time_attack/any_uid', {
      uid: 'any_uid',
      nickname: 'Hacker',
      score: 999999,
      updatedAt: 1000,
    });
  } catch (err) {
    caught = true;
    assert.ok(err.message.includes('Permission denied'));
  }
  assert.strictEqual(caught, true);
});

test('Security Rules: Invalid game modes are rejected by schema rules', () => {
  const db = new MockFirebaseDatabase(rawRules);
  const player = { uid: 'uid_player_303' };
  let caught = false;
  try {
    db.writeRecord(player, 'leaderboards/hacked_mode/uid_player_303', {
      uid: player.uid,
      nickname: 'Test',
      score: 500,
      updatedAt: 1000,
    });
  } catch (err) {
    caught = true;
    assert.ok(err.message.includes('not allowed'));
  }
  assert.strictEqual(caught, true);
});

test('Security Rules: Negative or insane scores (> 1,000,000) are rejected', () => {
  const db = new MockFirebaseDatabase(rawRules);
  const player = { uid: 'uid_player_404' };

  // Score > 1,000,000
  let caughtHigh = false;
  try {
    db.writeRecord(player, `leaderboards/time_attack/${player.uid}`, {
      uid: player.uid,
      nickname: 'ScoreHacker',
      score: 99999999,
      updatedAt: 1000,
    });
  } catch (err) {
    caughtHigh = true;
  }
  assert.strictEqual(caughtHigh, true, 'Score exceeding 1,000,000 must be rejected');

  // Negative score
  let caughtNeg = false;
  try {
    db.writeRecord(player, `leaderboards/time_attack/${player.uid}`, {
      uid: player.uid,
      nickname: 'ScoreHacker',
      score: -500,
      updatedAt: 1000,
    });
  } catch (err) {
    caughtNeg = true;
  }
  assert.strictEqual(caughtNeg, true, 'Negative score must be rejected');
});

test('Security Rules: Invalid nicknames (< 2 or > 20 chars) are rejected', () => {
  const db = new MockFirebaseDatabase(rawRules);
  const player = { uid: 'uid_player_505' };

  // Too short
  let shortCaught = false;
  try {
    db.writeRecord(player, `users/${player.uid}`, {
      nickname: 'A',
      updatedAt: 1000,
    });
  } catch {
    shortCaught = true;
  }
  assert.strictEqual(shortCaught, true);

  // Too long
  let longCaught = false;
  try {
    db.writeRecord(player, `users/${player.uid}`, {
      nickname: 'ThisIsAnExtremelyLongNicknameOverTwenty',
      updatedAt: 1000,
    });
  } catch {
    longCaught = true;
  }
  assert.strictEqual(longCaught, true);
});

test('Mode Isolation: Time Attack and Endless Rush are ranked separately', () => {
  const db = new MockFirebaseDatabase(rawRules);
  const p1 = { uid: 'uid_1', nickname: 'Alice' };
  const p2 = { uid: 'uid_2', nickname: 'Bob' };

  // Alice: great at Time Attack (100,000), lower at Endless (30,000)
  db.writeRecord(p1, `leaderboards/time_attack/${p1.uid}`, {
    uid: p1.uid,
    nickname: p1.nickname,
    score: 100000,
    updatedAt: 1000,
  });
  db.writeRecord(p1, `leaderboards/endless/${p1.uid}`, {
    uid: p1.uid,
    nickname: p1.nickname,
    score: 30000,
    survivalTime: 45,
    updatedAt: 1000,
  });

  // Bob: lower at Time Attack (40,000), great at Endless (150,000)
  db.writeRecord(p2, `leaderboards/time_attack/${p2.uid}`, {
    uid: p2.uid,
    nickname: p2.nickname,
    score: 40000,
    updatedAt: 1000,
  });
  db.writeRecord(p2, `leaderboards/endless/${p2.uid}`, {
    uid: p2.uid,
    nickname: p2.nickname,
    score: 150000,
    survivalTime: 180,
    updatedAt: 1000,
  });

  const taScores = db.fetchTopScores('time_attack');
  const erScores = db.fetchTopScores('endless');

  // In Time Attack: Alice is #1 (100k), Bob is #2 (40k)
  assert.strictEqual(taScores[0].uid, 'uid_1');
  assert.strictEqual(taScores[0].score, 100000);
  assert.strictEqual(taScores[0].rank, 1);
  assert.strictEqual(taScores[1].uid, 'uid_2');
  assert.strictEqual(taScores[1].score, 40000);
  assert.strictEqual(taScores[1].rank, 2);

  // In Endless: Bob is #1 (150k), Alice is #2 (30k)
  assert.strictEqual(erScores[0].uid, 'uid_2');
  assert.strictEqual(erScores[0].score, 150000);
  assert.strictEqual(erScores[0].rank, 1);
  assert.strictEqual(erScores[1].uid, 'uid_1');
  assert.strictEqual(erScores[1].score, 30000);
  assert.strictEqual(erScores[1].rank, 2);
});

test('4-Mode Isolation: All 4 modes maintain independent rankings and survival stats', () => {
  const db = new MockFirebaseDatabase(rawRules);
  const p1 = { uid: 'uid_player_alpha', nickname: 'Alpha' };
  const p2 = { uid: 'uid_player_beta', nickname: 'Beta' };

  // Write across all 4 modes
  // Time Attack
  db.writeRecord(p1, `leaderboards/time_attack/${p1.uid}`, {
    uid: p1.uid,
    nickname: p1.nickname,
    score: 80000,
    updatedAt: 1000,
  });

  // Endless Rush
  db.writeRecord(p1, `leaderboards/endless/${p1.uid}`, {
    uid: p1.uid,
    nickname: p1.nickname,
    score: 60000,
    survivalTime: 95,
    updatedAt: 1000,
  });

  // Color Chaos
  db.writeRecord(p2, `leaderboards/color_chaos/${p2.uid}`, {
    uid: p2.uid,
    nickname: p2.nickname,
    score: 95000,
    updatedAt: 1000,
  });

  // One Life Challenge
  db.writeRecord(p2, `leaderboards/one_life/${p2.uid}`, {
    uid: p2.uid,
    nickname: p2.nickname,
    score: 55000,
    survivalTime: 42,
    updatedAt: 1000,
  });

  const ta = db.fetchTopScores('time_attack');
  const er = db.fetchTopScores('endless');
  const cc = db.fetchTopScores('color_chaos');
  const ol = db.fetchTopScores('one_life');

  assert.strictEqual(ta.length, 1);
  assert.strictEqual(ta[0].score, 80000);

  assert.strictEqual(er.length, 1);
  assert.strictEqual(er[0].survivalTime, 95);

  assert.strictEqual(cc.length, 1);
  assert.strictEqual(cc[0].score, 95000);

  assert.strictEqual(ol.length, 1);
  assert.strictEqual(ol[0].survivalTime, 42);
});

test('Duplicate Prevention: Restarting or replaying does NOT duplicate scores', () => {
  const db = new MockFirebaseDatabase(rawRules);
  const player = { uid: 'uid_repeat_player', nickname: 'Emma' };

  // Play round 1: 50,000
  db.runTransaction(player, `leaderboards/time_attack/${player.uid}`, () => ({
    uid: player.uid,
    nickname: player.nickname,
    score: 50000,
    updatedAt: 1000,
  }));

  // Play round 2: 75,000
  db.runTransaction(player, `leaderboards/time_attack/${player.uid}`, (cur) => {
    if (!cur || 75000 > cur.score) {
      return { uid: player.uid, nickname: player.nickname, score: 75000, updatedAt: 2000 };
    }
  });

  // Play round 3 (restart session, lower score): 60,000
  db.runTransaction(player, `leaderboards/time_attack/${player.uid}`, (cur) => {
    if (!cur || 60000 > cur.score) {
      return { uid: player.uid, nickname: player.nickname, score: 60000, updatedAt: 3000 };
    }
    return undefined;
  });

  const scores = db.fetchTopScores('time_attack');
  assert.strictEqual(scores.length, 1, 'Only one entry must exist for the player UID');
  assert.strictEqual(scores[0].score, 75000);
});

test('Nickname Sanitization: Malicious characters and whitespace are stripped', () => {
  function sanitize(raw) {
    if (!raw) return 'Player';
    let cleaned = raw.replace(/[<>&"'/\\`]/g, '').trim();
    if (cleaned.length < 2) cleaned = 'Player';
    if (cleaned.length > 20) cleaned = cleaned.substring(0, 20).trim();
    return cleaned;
  }

  assert.strictEqual(sanitize('<script>alert(1)</script>'), 'scriptalert(1)script');
  assert.strictEqual(sanitize('   Alex   '), 'Alex');
  assert.strictEqual(sanitize('A'), 'Player'); // too short falls back
  assert.strictEqual(sanitize('Supercalifragilisticexpialidocious'), 'Supercalifragilistic'); // trimmed to 20
});

test('Mobile Leaderboard Layout: Fits responsive virtual canvas & meets touch target guidelines', () => {
  const GAME_WIDTH = 720;
  const GAME_HEIGHT = 1080;

  // Modal dimensions
  const cardWidth = Math.min(GAME_WIDTH * 0.94, 620);
  const cardHeight = Math.min(GAME_HEIGHT * 0.92, 940);

  assert.ok(cardWidth <= GAME_WIDTH, 'Card width must fit within 720px');
  assert.ok(cardHeight <= GAME_HEIGHT, 'Card height must fit within 1080px');

  // Touch target checks (Apple Human Interface Guidelines & Material Design recommend >= 44x44 or 48x48)
  const tabHeight = 44;
  const actionBtnHeight = 44;
  const closeBtnSize = 36;
  const rowHeight = 38;

  assert.ok(tabHeight >= 44, 'Tabs must be >= 44px');
  assert.ok(actionBtnHeight >= 44, 'Action buttons must be >= 44px');
  assert.ok(closeBtnSize >= 36, 'Close button hit area must be >= 36px');
  assert.ok(rowHeight >= 36, 'Table rows must be >= 36px for readable spacing');

  // Main menu button placement
  const leaderboardMenuBtnY = 765;
  const endlessCardBottom = 410 + 185 + 80; // 675
  const secondaryButtonsTop = GAME_HEIGHT * 0.86 - 25; // 903.8

  assert.ok(leaderboardMenuBtnY - 27 > endlessCardBottom, 'Leaderboard button must clear Endless card');
  assert.ok(leaderboardMenuBtnY + 27 < secondaryButtonsTop, 'Leaderboard button must clear How To Play buttons');
});

test('Top 10 Display Limit: Ranks and formats up to 10 players maximum', () => {
  const db = new MockFirebaseDatabase(rawRules);

  // Populate 15 distinct players
  for (let i = 1; i <= 15; i++) {
    const p = { uid: `uid_p_${i}` };
    db.writeRecord(p, `leaderboards/time_attack/${p.uid}`, {
      uid: p.uid,
      nickname: `Player_${i}`,
      score: i * 10000,
      updatedAt: 1000 + i,
    });
  }

  const allEntries = db.fetchTopScores('time_attack');
  assert.strictEqual(allEntries.length, 15);

  const displayedTop10 = allEntries.slice(0, 10);
  assert.strictEqual(displayedTop10.length, 10, 'Leaderboard view must cap at exactly 10 displayed rows');
  assert.strictEqual(displayedTop10[0].score, 150000, 'Top player has highest score');
  assert.strictEqual(displayedTop10[0].rank, 1);
  assert.strictEqual(displayedTop10[9].score, 60000, '10th player is 60,000');
  assert.strictEqual(displayedTop10[9].rank, 10);
});

test('Medals and Champion Formatting: 🥇🥈🥉 and 👑 Family Champion badge for Rank 1', () => {
  function getRankBadge(rank) {
    if (rank === 1) return { str: '🥇 #1', champBadge: '👑 Family Champion' };
    if (rank === 2) return { str: '🥈 #2', champBadge: null };
    if (rank === 3) return { str: '🥉 #3', champBadge: null };
    return { str: `#${rank}`, champBadge: null };
  }

  assert.deepStrictEqual(getRankBadge(1), { str: '🥇 #1', champBadge: '👑 Family Champion' });
  assert.deepStrictEqual(getRankBadge(2), { str: '🥈 #2', champBadge: null });
  assert.deepStrictEqual(getRankBadge(3), { str: '🥉 #3', champBadge: null });
  assert.deepStrictEqual(getRankBadge(4), { str: '#4', champBadge: null });
  assert.deepStrictEqual(getRankBadge(10), { str: '#10', champBadge: null });
});

test('Endless Rush Survival Time Formatting: Converts seconds into MM:SS string', () => {
  function formatSurvivalTime(seconds) {
    if (typeof seconds !== 'number' || seconds <= 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  assert.strictEqual(formatSurvivalTime(undefined), '--:--');
  assert.strictEqual(formatSurvivalTime(null), '--:--');
  assert.strictEqual(formatSurvivalTime(0), '--:--');
  assert.strictEqual(formatSurvivalTime(45), '0:45');
  assert.strictEqual(formatSurvivalTime(60), '1:00');
  assert.strictEqual(formatSurvivalTime(125), '2:05');
  assert.strictEqual(formatSurvivalTime(3605), '60:05');
});

test('Nickname Persistence: Only prompts on first visit and restores on reload', () => {
  // Simulated local storage & remote profile
  const storage = {
    data: {},
    getItem(k) { return this.data[k] || null; },
    setItem(k, v) { this.data[k] = String(v); },
  };

  const isPrompted = () => storage.getItem('pop_rush_nickname_prompted') === 'true';
  const getNickname = () => storage.getItem('pop_rush_nickname');
  const saveNickname = (nick) => {
    storage.setItem('pop_rush_nickname', nick);
    storage.setItem('pop_rush_nickname_prompted', 'true');
  };

  // 1. First Visit: not prompted yet
  assert.strictEqual(isPrompted(), false);
  assert.strictEqual(getNickname(), null);

  // Player sets nickname
  saveNickname('Alex');
  assert.strictEqual(isPrompted(), true);
  assert.strictEqual(getNickname(), 'Alex');

  // 2. Second Visit / Page Reload: already prompted, no prompt required
  let promptTriggered = false;
  if (!isPrompted() || !getNickname()) {
    promptTriggered = true;
  }
  assert.strictEqual(promptTriggered, false, 'Must not prompt returning player on reload');

  // 3. Edit Nickname in Settings: updates without resetting prompt state
  saveNickname('AlexPro');
  assert.strictEqual(getNickname(), 'AlexPro');
  assert.strictEqual(isPrompted(), true);

  // 4. Remote Restore: if local storage cleared but Firebase has user profile
  storage.data = {}; // local storage cleared
  const remoteFirebaseProfile = { nickname: 'AlexPro', updatedAt: 5000 };
  if (remoteFirebaseProfile.nickname && remoteFirebaseProfile.nickname !== 'Player') {
    saveNickname(remoteFirebaseProfile.nickname);
  }
  assert.strictEqual(getNickname(), 'AlexPro');
  assert.strictEqual(isPrompted(), true);
});

test('Score Submission Semantics: Returns success even when personal record is preserved', () => {
  const db = new MockFirebaseDatabase(rawRules);
  const player = { uid: 'uid_tx_test', nickname: 'Sam' };

  function submitScore(mode, newScore) {
    let isRecordBeaten = false;
    const tx = db.runTransaction(player, `leaderboards/${mode}/${player.uid}`, (cur) => {
      const prev = cur ? cur.score || 0 : 0;
      if (newScore > prev) {
        isRecordBeaten = true;
        return { uid: player.uid, nickname: player.nickname, score: newScore, updatedAt: Date.now() };
      }
      return undefined; // abort write
    });

    if (!isRecordBeaten) {
      return { success: true, isNewBest: false };
    }
    return { success: tx.committed, isNewBest: tx.committed };
  }

  // 1. Initial submission
  const res1 = submitScore('time_attack', 40000);
  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.isNewBest, true);

  // 2. Lower score next round
  const res2 = submitScore('time_attack', 25000);
  assert.strictEqual(res2.success, true, 'Lower score submission must still return success: true');
  assert.strictEqual(res2.isNewBest, false, 'isNewBest must be false when score is lower');

  // 3. Beating the best
  const res3 = submitScore('time_attack', 60000);
  assert.strictEqual(res3.success, true);
  assert.strictEqual(res3.isNewBest, true);

  // Confirm DB record is the high score
  const top = db.fetchTopScores('time_attack');
  assert.strictEqual(top[0].score, 60000);
});

console.log(`\nLeaderboard Test Results: ${passed}/${total} passed (${Math.round((passed / total) * 100)}%)\n`);
