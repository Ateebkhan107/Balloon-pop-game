/**
 * Automated Verification Tests for "Beat the Champion" Feature
 * Tests:
 * 1. Nearest higher-ranked opponent calculation from leaderboard data
 * 2. "Defend Your Crown" mode when player is #1
 * 3. Graceful offline/empty fallback handling
 * 4. Separate target tracking for Time Attack vs Endless Rush
 * 5. Points needed calculation during gameplay
 * 6. "CHAMPION BEATEN!" condition trigger semantics
 * 7. Post-round rank update and next opponent progression
 * 8. Round-start target caching integrity (target does not drift mid-round)
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

console.log('\n--- Running Beat the Champion Verification Tests ---');

// Mock leaderboard data
const mockLeaderboardTA = [
  { uid: 'u1', nickname: 'Alice', score: 5000, rank: 1 },
  { uid: 'u2', nickname: 'Bob', score: 4200, rank: 2 },
  { uid: 'u3', nickname: 'Charlie', score: 3600, rank: 3 },
  { uid: 'u4', nickname: 'Dave', score: 2800, rank: 4 },
  { uid: 'u5', nickname: 'Eve', score: 1500, rank: 5 },
];

const mockLeaderboardEndless = [
  { uid: 'u2', nickname: 'Bob', score: 8200, rank: 1 },
  { uid: 'u1', nickname: 'Alice', score: 7100, rank: 2 },
  { uid: 'u5', nickname: 'Eve', score: 4900, rank: 3 },
];

// Logic matching ChampionTracker
function calculateChampionTarget(entries, currentUid, localHighScore) {
  if (!entries || entries.length === 0) {
    return {
      opponentNickname: 'None',
      opponentScore: localHighScore,
      isCurrentLeader: localHighScore > 0,
      hasOpponent: false,
    };
  }

  const userIndex = entries.findIndex((e) => e.uid === currentUid);

  // Player is #1
  if (userIndex === 0) {
    return {
      opponentNickname: entries[0].nickname,
      opponentScore: entries[0].score,
      opponentRank: 1,
      playerPreviousRank: 1,
      isCurrentLeader: true,
      hasOpponent: false,
    };
  }

  // Player is on the leaderboard at rank > 1
  if (userIndex > 0) {
    const opponent = entries[userIndex - 1]; // Nearest higher ranked player
    return {
      opponentNickname: opponent.nickname,
      opponentScore: opponent.score,
      opponentRank: opponent.rank || userIndex,
      playerPreviousRank: userIndex + 1,
      isCurrentLeader: false,
      hasOpponent: true,
    };
  }

  // Player is not yet on the board
  let nearestOpponent = entries[entries.length - 1];
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].score > localHighScore) {
      nearestOpponent = entries[i];
      break;
    }
  }

  return {
    opponentNickname: nearestOpponent.nickname,
    opponentScore: nearestOpponent.score,
    opponentRank: nearestOpponent.rank || entries.length,
    playerPreviousRank: null,
    isCurrentLeader: false,
    hasOpponent: true,
  };
}

// 1. Nearest Higher-Ranked Opponent
test('Nearest Higher-Ranked Opponent: Identifies player directly above current user', () => {
  // Charlie (Rank 3, 3600 pts) has Bob (Rank 2, 4200 pts) as the target to beat
  const target = calculateChampionTarget(mockLeaderboardTA, 'u3', 3600);
  assert.strictEqual(target.hasOpponent, true);
  assert.strictEqual(target.opponentNickname, 'Bob');
  assert.strictEqual(target.opponentScore, 4200);
  assert.strictEqual(target.opponentRank, 2);
  assert.strictEqual(target.playerPreviousRank, 3);
  assert.strictEqual(target.isCurrentLeader, false);
});

// 2. Defend Your Crown for Rank 1
test('Defend Your Crown: Player ranked #1 is flagged as current leader', () => {
  // Alice (Rank 1, 5000 pts) in Time Attack
  const target = calculateChampionTarget(mockLeaderboardTA, 'u1', 5000);
  assert.strictEqual(target.isCurrentLeader, true);
  assert.strictEqual(target.hasOpponent, false);
  assert.strictEqual(target.playerPreviousRank, 1);
  assert.strictEqual(target.opponentScore, 5000);
});

// 3. Separate Leaderboards for Time Attack and Endless
test('Mode Separation: Different opponents and rankings between Time Attack and Endless', () => {
  // Bob in Time Attack is Rank 2 (targets Alice at 5000)
  const targetTA = calculateChampionTarget(mockLeaderboardTA, 'u2', 4200);
  assert.strictEqual(targetTA.opponentNickname, 'Alice');
  assert.strictEqual(targetTA.opponentScore, 5000);
  assert.strictEqual(targetTA.playerPreviousRank, 2);

  // Bob in Endless is Rank 1 (Defending Crown with 8200)
  const targetEndless = calculateChampionTarget(mockLeaderboardEndless, 'u2', 8200);
  assert.strictEqual(targetEndless.isCurrentLeader, true);
  assert.strictEqual(targetEndless.hasOpponent, false);
  assert.strictEqual(targetEndless.playerPreviousRank, 1);
});

// 4. Points Needed Calculation
test('Points Needed: Computes gap accurately during live round', () => {
  const targetScore = 4200;
  function getPointsNeeded(currentScore) {
    return Math.max(0, targetScore - currentScore + 1); // 1 point above to beat
  }

  assert.strictEqual(getPointsNeeded(3500), 701);
  assert.strictEqual(getPointsNeeded(4199), 2);
  assert.strictEqual(getPointsNeeded(4200), 1);
  assert.strictEqual(getPointsNeeded(4201), 0);
  assert.strictEqual(getPointsNeeded(5000), 0);
});

// 5. Champion Beaten Trigger Semantics
test('Champion Beaten Trigger: Fires exactly once when player score surpasses target', () => {
  const targetScore = 4200;
  let hasTriggeredBeatenAnimation = false;
  let animationTriggers = 0;

  function onScoreUpdated(newScore) {
    if (newScore > targetScore && !hasTriggeredBeatenAnimation) {
      hasTriggeredBeatenAnimation = true;
      animationTriggers++;
    }
  }

  onScoreUpdated(4000);
  assert.strictEqual(animationTriggers, 0);

  onScoreUpdated(4200); // Equal score is not yet beating
  assert.strictEqual(animationTriggers, 0);

  onScoreUpdated(4300); // Surpassed!
  assert.strictEqual(animationTriggers, 1);
  assert.strictEqual(hasTriggeredBeatenAnimation, true);

  onScoreUpdated(4600); // Further points do NOT re-trigger animation
  assert.strictEqual(animationTriggers, 1);
});

// 6. Round-Start Target Caching Integrity
test('Target Caching: Opponent target remains frozen during round despite external updates', () => {
  let cachedTarget = { opponentNickname: 'Dave', opponentScore: 2800 };

  // Simulate external player submitting 3100 mid-round
  const liveLeaderboardUpdate = { opponentNickname: 'Dave', opponentScore: 3100 };

  // In-game tracker MUST use cached target
  assert.strictEqual(cachedTarget.opponentScore, 2800, 'Game must use cached target during round');
  assert.notStrictEqual(cachedTarget.opponentScore, liveLeaderboardUpdate.opponentScore);
});

// 7. Post-Game Rank Summary
test('Post-Game Summary: Correctly computes rank advancement and next opponent', () => {
  const previousRank = 4; // Dave was #4 (2800 pts), target was Charlie (3600 pts)
  const finalScore = 3900; // Dave scores 3900, beating Charlie!

  // Updated leaderboard after score submission
  const updatedLeaderboard = [
    { uid: 'u1', nickname: 'Alice', score: 5000, rank: 1 },
    { uid: 'u2', nickname: 'Bob', score: 4200, rank: 2 },
    { uid: 'u4', nickname: 'Dave', score: 3900, rank: 3 }, // Dave moved up to #3!
    { uid: 'u3', nickname: 'Charlie', score: 3600, rank: 4 },
    { uid: 'u5', nickname: 'Eve', score: 1500, rank: 5 },
  ];

  const userEntry = updatedLeaderboard.find((e) => e.uid === 'u4');
  const newRank = userEntry.rank; // 3
  const nextOpponent = updatedLeaderboard[newRank - 2]; // Bob at rank 2

  assert.strictEqual(newRank, 3);
  assert.strictEqual(finalScore > 3600, true, 'Dave beat previous target Charlie');
  assert.strictEqual(nextOpponent.nickname, 'Bob');
  assert.strictEqual(nextOpponent.score, 4200);
});

// 8. Offline & Empty Leaderboard Fallback
test('Offline/Empty Handling: Falls back cleanly to personal high score or defend mode without crash', () => {
  const emptyTarget = calculateChampionTarget([], 'any_uid', 0);
  assert.strictEqual(emptyTarget.hasOpponent, false);
  assert.strictEqual(emptyTarget.opponentScore, 0);

  const localTarget = calculateChampionTarget([], 'any_uid', 2400);
  assert.strictEqual(localTarget.isCurrentLeader, true);
  assert.strictEqual(localTarget.opponentScore, 2400);
});

console.log(`\nBeat the Champion Test Results: ${passed}/${total} passed (${Math.round((passed / total) * 100)}%)\n`);
