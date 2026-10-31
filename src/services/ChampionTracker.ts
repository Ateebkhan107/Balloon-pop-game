import { LeaderboardService, GameModeKey, LeaderboardEntry } from './LeaderboardService';
import { StorageService } from './StorageService';

export interface ChampionTarget {
  opponentUid: string;
  opponentNickname: string;
  opponentScore: number;
  opponentRank: number;
  playerPreviousRank: number | null;
  isCurrentLeader: boolean;
  hasOpponent: boolean;
  isOffline: boolean;
}

export interface PostGameRankSummary {
  previousRank: number | null;
  updatedRank: number | null;
  championBeaten: boolean;
  defeatedOpponentNickname?: string;
  nextOpponentNickname?: string;
  nextOpponentScore?: number;
  nextOpponentRank?: number;
  isCurrentLeader: boolean;
}

export class ChampionTracker {
  private static instance: ChampionTracker;

  private cachedTargets: Map<GameModeKey, ChampionTarget> = new Map();

  private constructor() {}

  public static getInstance(): ChampionTracker {
    if (!ChampionTracker.instance) {
      ChampionTracker.instance = new ChampionTracker();
    }
    return ChampionTracker.instance;
  }

  /**
   * Fetches and caches the nearest higher-ranked opponent target for the round.
   * Safe for offline/fallback mode.
   */
  public async getTargetForMode(mode: GameModeKey, forceRefresh: boolean = true): Promise<ChampionTarget> {
    if (!forceRefresh && this.cachedTargets.has(mode)) {
      return this.cachedTargets.get(mode)!;
    }

    const leaderboard = LeaderboardService.getInstance();
    const storage = StorageService.getInstance();
    const result = await leaderboard.fetchLeaderboard(mode);

    const localHighScore = storage.getHighScoreForMode(mode);

    const isOffline = !!result.isOfflineFallback;
    const entries = result.entries || [];

    // Case 1: Leaderboard has no entries or only local fallback with 0 score
    if (entries.length === 0 || (entries.length === 1 && entries[0].score === 0)) {
      const target: ChampionTarget = {
        opponentUid: '',
        opponentNickname: 'None',
        opponentScore: localHighScore,
        opponentRank: 1,
        playerPreviousRank: localHighScore > 0 ? 1 : null,
        isCurrentLeader: localHighScore > 0,
        hasOpponent: false,
        isOffline,
      };
      this.cachedTargets.set(mode, target);
      return target;
    }

    const currentUserRank = result.currentUserRank;
    const currentUid = leaderboard.getUid();

    // Case 2: Current user is #1 Champion on the leaderboard!
    if (currentUserRank === 1) {
      const target: ChampionTarget = {
        opponentUid: currentUid || 'self',
        opponentNickname: result.currentUserEntry?.nickname || storage.getNickname() || 'You',
        opponentScore: result.currentUserEntry?.score || localHighScore,
        opponentRank: 1,
        playerPreviousRank: 1,
        isCurrentLeader: true,
        hasOpponent: false,
        isOffline,
      };
      this.cachedTargets.set(mode, target);
      return target;
    }

    // Case 3: Current user is on the leaderboard and rank > 1
    if (currentUserRank && currentUserRank > 1) {
      // Opponent is the entry at index (currentUserRank - 2)
      const opponentIndex = Math.max(0, currentUserRank - 2);
      const opponent = entries[opponentIndex];

      if (opponent) {
        const target: ChampionTarget = {
          opponentUid: opponent.uid,
          opponentNickname: opponent.nickname,
          opponentScore: opponent.score,
          opponentRank: opponent.rank || (currentUserRank - 1),
          playerPreviousRank: currentUserRank,
          isCurrentLeader: false,
          hasOpponent: true,
          isOffline,
        };
        this.cachedTargets.set(mode, target);
        return target;
      }
    }

    // Case 4: Current user is not yet on the leaderboard (unranked)
    // Find the nearest entry with a score higher than player's local record,
    // or the bottom entry to beat onto the board.
    let nearestOpponent: LeaderboardEntry = entries[entries.length - 1];

    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].score > localHighScore) {
        nearestOpponent = entries[i];
        break;
      }
    }

    // If even #1 has a lower score than localHighScore (rare edge case), player is leader
    if (localHighScore > 0 && localHighScore >= entries[0].score) {
      const target: ChampionTarget = {
        opponentUid: entries[0].uid,
        opponentNickname: entries[0].nickname,
        opponentScore: entries[0].score,
        opponentRank: 1,
        playerPreviousRank: 1,
        isCurrentLeader: true,
        hasOpponent: false,
        isOffline,
      };
      this.cachedTargets.set(mode, target);
      return target;
    }

    const target: ChampionTarget = {
      opponentUid: nearestOpponent.uid,
      opponentNickname: nearestOpponent.nickname,
      opponentScore: nearestOpponent.score,
      opponentRank: nearestOpponent.rank || entries.length,
      playerPreviousRank: null,
      isCurrentLeader: false,
      hasOpponent: true,
      isOffline,
    };
    this.cachedTargets.set(mode, target);
    return target;
  }

  /**
   * Evaluates post-game ranks and next opponent after Firebase confirms submission.
   */
  public async getPostGameSummary(
    mode: GameModeKey,
    finalScore: number,
    cachedTarget: ChampionTarget
  ): Promise<PostGameRankSummary> {
    const leaderboard = LeaderboardService.getInstance();
    const result = await leaderboard.fetchLeaderboard(mode);
    const updatedRank = result.currentUserRank;
    const entries = result.entries || [];

    const championBeaten = cachedTarget.hasOpponent && finalScore > cachedTarget.opponentScore;
    const isCurrentLeader = updatedRank === 1;

    let nextOpponentNickname: string | undefined;
    let nextOpponentScore: number | undefined;
    let nextOpponentRank: number | undefined;

    if (updatedRank && updatedRank > 1) {
      const nextIndex = updatedRank - 2;
      const nextEntry = entries[nextIndex];
      if (nextEntry) {
        nextOpponentNickname = nextEntry.nickname;
        nextOpponentScore = nextEntry.score;
        nextOpponentRank = nextEntry.rank || (updatedRank - 1);
      }
    }

    return {
      previousRank: cachedTarget.playerPreviousRank,
      updatedRank: updatedRank || cachedTarget.playerPreviousRank,
      championBeaten,
      defeatedOpponentNickname: championBeaten ? cachedTarget.opponentNickname : undefined,
      nextOpponentNickname,
      nextOpponentScore,
      nextOpponentRank,
      isCurrentLeader,
    };
  }

  public clearCache(): void {
    this.cachedTargets.clear();
  }
}
