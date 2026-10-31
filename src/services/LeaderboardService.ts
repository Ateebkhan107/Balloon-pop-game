import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, Auth, User } from 'firebase/auth';
import {
  getDatabase,
  ref,
  runTransaction,
  get,
  set,
  update,
  query,
  orderByChild,
  limitToLast,
  Database,
} from 'firebase/database';
import { StorageService } from './StorageService';

export interface LeaderboardEntry {
  uid: string;
  nickname: string;
  score: number;
  survivalTime?: number | null;
  updatedAt: number;
  rank?: number;
  isCurrentUser?: boolean;
}

export type GameModeKey = 'time_attack' | 'endless';

export interface LeaderboardFetchResult {
  success: boolean;
  entries: LeaderboardEntry[];
  currentUserEntry: LeaderboardEntry | null;
  currentUserRank: number | null;
  error?: string;
  isOfflineFallback?: boolean;
}

export class LeaderboardService {
  private static instance: LeaderboardService;

  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Database | null = null;
  private currentUser: User | null = null;
  private isConfigured: boolean = false;
  private initPromise: Promise<void> | null = null;
  private authReadyPromise: Promise<User | null>;
  private authReadyResolve!: (user: User | null) => void;
  private authError: string | null = null;

  // Maximum sane score safeguards for arcade popping
  public static readonly MAX_ALLOWED_SCORE = 1000000;
  public static readonly MAX_ENTRIES_LIMIT = 50;

  private constructor() {
    this.authReadyPromise = new Promise<User | null>((resolve) => {
      this.authReadyResolve = resolve;
    });
    this.initPromise = this.initializeFirebase();
  }

  public static getInstance(): LeaderboardService {
    if (!LeaderboardService.instance) {
      LeaderboardService.instance = new LeaderboardService();
    }
    return LeaderboardService.instance;
  }

  /**
   * Initializes Firebase App, Auth, and Realtime Database safely.
   */
  private async initializeFirebase(): Promise<void> {
    try {
      const apiKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_API_KEY : undefined;
      const authDomain = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN : undefined;
      const databaseURL = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_DATABASE_URL : undefined;
      const projectId = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_PROJECT_ID : undefined;
      const storageBucket = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_STORAGE_BUCKET : undefined;
      const messagingSenderId = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID : undefined;
      const appId = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_APP_ID : undefined;

      // Validate that real configuration is provided
      if (
        !apiKey ||
        !databaseURL ||
        apiKey.includes('ExampleKey') ||
        databaseURL.includes('your-game-project')
      ) {
        console.info('[LeaderboardService] Firebase configuration not set or using placeholder credentials. Running in offline/local fallback mode.');
        this.isConfigured = false;
        this.authReadyResolve(null);
        return;
      }

      const config = {
        apiKey,
        authDomain,
        databaseURL,
        projectId,
        storageBucket,
        messagingSenderId,
        appId,
      };

      this.app = getApps().length > 0 ? getApps()[0] : initializeApp(config);
      this.auth = getAuth(this.app);
      this.db = getDatabase(this.app);
      this.isConfigured = true;

      // Listen for auth state
      let initialAuthHandled = false;
      onAuthStateChanged(this.auth, async (user) => {
        if (user) {
          this.currentUser = user;
          this.authError = null;
          StorageService.getInstance().saveFirebaseUid(user.uid);
          await this.syncProfile();
        } else {
          this.currentUser = null;
        }

        if (!initialAuthHandled) {
          initialAuthHandled = true;
          this.authReadyResolve(user);
        }
      });

      // Sign in anonymously in background if not already cached
      await this.ensureAuthenticated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[LeaderboardService] Firebase initialization warning:', msg);
      this.authError = msg;
      this.isConfigured = false;
      this.authReadyResolve(null);
    }
  }

  /**
   * Waits for initial Firebase Auth check to complete.
   */
  public async waitForAuthReady(): Promise<User | null> {
    if (this.initPromise) {
      await this.initPromise;
    }
    return this.authReadyPromise;
  }

  /**
   * Ensures the anonymous user is signed in.
   */
  public async ensureAuthenticated(): Promise<User | null> {
    if (!this.isConfigured || !this.auth) return null;
    if (this.currentUser) return this.currentUser;

    try {
      const cred = await signInAnonymously(this.auth);
      this.currentUser = cred.user;
      this.authError = null;
      StorageService.getInstance().saveFirebaseUid(cred.user.uid);
      await this.syncProfile();
      return cred.user;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[LeaderboardService] Anonymous auth failed:', msg);
      this.authError = msg;
      return null;
    }
  }

  public getIsConfigured(): boolean {
    return this.isConfigured;
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public getUid(): string | null {
    if (this.currentUser) return this.currentUser.uid;
    return StorageService.getInstance().getFirebaseUid();
  }

  public getNickname(): string {
    const saved = StorageService.getInstance().getNickname();
    return saved || 'Player';
  }

  /**
   * Syncs nickname and profile with Firebase users collection safely.
   * If remote profile exists, restores it to local storage without prompting.
   */
  public async syncProfile(): Promise<void> {
    if (!this.isConfigured || !this.db || !this.currentUser) return;
    try {
      const storage = StorageService.getInstance();
      const uid = this.currentUser.uid;
      const userRef = ref(this.db, `users/${uid}`);

      const userSnap = await get(userRef);
      const localNickname = storage.getNickname();

      if (userSnap.exists()) {
        const remoteVal = userSnap.val();
        const remoteNick = remoteVal?.nickname ? StorageService.sanitizeNickname(remoteVal.nickname) : null;

        if (remoteNick && remoteNick !== 'Player') {
          // Restore remote nickname to local storage if local is not set or default
          if (!localNickname || localNickname === 'Player') {
            storage.saveNickname(remoteNick);
            storage.setNicknamePrompted();
          }
        } else if (localNickname && localNickname !== 'Player') {
          // Local nickname is customized; sync to Firebase
          await set(userRef, {
            nickname: localNickname,
            updatedAt: Date.now(),
          });
        }
      } else if (localNickname && localNickname !== 'Player') {
        // Create initial profile in Firebase with user's customized nickname
        await set(userRef, {
          nickname: localNickname,
          updatedAt: Date.now(),
        });
      }
    } catch (err) {
      console.warn('[LeaderboardService] Could not sync user profile:', err);
    }
  }

  /**
   * Updates nickname locally and across Firebase user and leaderboard entries
   */
  public async updateNickname(rawNickname: string): Promise<string> {
    const sanitized = StorageService.getInstance().saveNickname(rawNickname);

    if (this.isConfigured && this.db && this.currentUser) {
      try {
        const uid = this.currentUser.uid;
        // 1. Update user profile
        const userRef = ref(this.db, `users/${uid}`);
        await set(userRef, {
          nickname: sanitized,
          updatedAt: Date.now(),
        });

        // 2. Update existing Time Attack entry if present
        const taRef = ref(this.db, `leaderboards/time_attack/${uid}`);
        const taSnap = await get(taRef);
        if (taSnap.exists()) {
          await update(taRef, { nickname: sanitized, updatedAt: Date.now() });
        }

        // 3. Update existing Endless entry if present
        const erRef = ref(this.db, `leaderboards/endless/${uid}`);
        const erSnap = await get(erRef);
        if (erSnap.exists()) {
          await update(erRef, { nickname: sanitized, updatedAt: Date.now() });
        }
      } catch (err) {
        console.warn('[LeaderboardService] Could not update nickname in Firebase:', err);
      }
    }

    return sanitized;
  }

  /**
   * Submits a completed round score using Firebase transactions.
   * Only updates if the new score exceeds the player's previous record.
   */
  public async submitScore(
    mode: GameModeKey,
    score: number,
    survivalTime?: number
  ): Promise<{ success: boolean; isNewBest: boolean; error?: string }> {
    // Basic abuse safeguards
    if (typeof score !== 'number' || isNaN(score) || score <= 0) {
      return { success: false, isNewBest: false, error: 'Invalid score' };
    }
    if (score > LeaderboardService.MAX_ALLOWED_SCORE) {
      console.warn('[LeaderboardService] Score exceeds sanity limit, ignoring submission:', score);
      return { success: false, isNewBest: false, error: 'Score exceeds sanity limit' };
    }
    if (mode !== 'time_attack' && mode !== 'endless') {
      return { success: false, isNewBest: false, error: 'Invalid game mode' };
    }

    // Always ensure local storage record is saved
    const storage = StorageService.getInstance();
    let isLocalBest = false;
    if (mode === 'time_attack') {
      isLocalBest = storage.saveTimeAttackHighScore(score);
    } else {
      isLocalBest = storage.saveEndlessHighScore(score);
      if (survivalTime && survivalTime > 0) {
        storage.saveEndlessBestTime(survivalTime);
      }
    }

    if (!this.isConfigured || !this.db) {
      return {
        success: true,
        isNewBest: isLocalBest,
        error: 'Leaderboard is in offline mode. Local score saved.',
      };
    }

    // Ensure authenticated user
    const user = await this.ensureAuthenticated();
    if (!user) {
      return {
        success: false,
        isNewBest: isLocalBest,
        error: 'Unable to authenticate anonymously',
      };
    }

    try {
      const uid = user.uid;
      const nickname = this.getNickname();
      const scoreRef = ref(this.db, `leaderboards/${mode}/${uid}`);

      let recordBeaten = false;

      const result = await runTransaction(scoreRef, (currentData) => {
        const prevScore = currentData ? (currentData.score || 0) : 0;
        if (score > prevScore) {
          recordBeaten = true;
          return {
            uid,
            nickname,
            score: Math.floor(score),
            survivalTime: mode === 'endless' ? Math.floor(survivalTime || 0) : null,
            updatedAt: Date.now(),
          };
        }
        // Abort transaction without write if score is not higher
        return undefined;
      });

      // If record was not beaten, personal best was safely preserved
      if (!recordBeaten) {
        return {
          success: true,
          isNewBest: false,
        };
      }

      return {
        success: result.committed,
        isNewBest: result.committed,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[LeaderboardService] Transaction failed:', msg);
      return { success: false, isNewBest: false, error: msg };
    }
  }

  /**
   * Fetches leaderboard records sorted by highest score with indexed query.
   */
  public async fetchLeaderboard(mode: GameModeKey): Promise<LeaderboardFetchResult> {
    if (this.initPromise) {
      await this.initPromise;
    }

    const storage = StorageService.getInstance();
    const localHighScore = mode === 'time_attack' ? storage.getTimeAttackHighScore() : storage.getEndlessHighScore();
    const localBestTime = mode === 'endless' ? storage.getEndlessBestTime() : null;
    const nickname = this.getNickname();
    const cachedUid = this.getUid() || 'local_player';

    // If Firebase is not configured or offline, return local fallback
    if (!this.isConfigured || !this.db) {
      const localEntry: LeaderboardEntry | null =
        localHighScore > 0
          ? {
              uid: cachedUid,
              nickname,
              score: localHighScore,
              survivalTime: localBestTime,
              updatedAt: Date.now(),
              rank: 1,
              isCurrentUser: true,
            }
          : null;

      return {
        success: true,
        entries: localEntry ? [localEntry] : [],
        currentUserEntry: localEntry,
        currentUserRank: localEntry ? 1 : null,
        isOfflineFallback: true,
        error: this.authError || 'Leaderboard is not connected to Firebase. Showing local score.',
      };
    }

    try {
      await this.ensureAuthenticated();
      const currentUid = this.getUid();

      const modeRef = ref(this.db, `leaderboards/${mode}`);
      // Query top 50 records indexed by score
      const leaderboardQuery = query(
        modeRef,
        orderByChild('score'),
        limitToLast(LeaderboardService.MAX_ENTRIES_LIMIT)
      );

      const snapshot = await get(leaderboardQuery);
      const entries: LeaderboardEntry[] = [];

      snapshot.forEach((childSnap) => {
        const val = childSnap.val();
        if (val && typeof val.score === 'number' && typeof val.nickname === 'string') {
          entries.push({
            uid: val.uid || childSnap.key || '',
            nickname: StorageService.sanitizeNickname(val.nickname),
            score: val.score,
            survivalTime: typeof val.survivalTime === 'number' ? val.survivalTime : null,
            updatedAt: typeof val.updatedAt === 'number' ? val.updatedAt : 0,
          });
        }
      });

      // Firebase Realtime Database returns ordered ascending; reverse to descending
      entries.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.updatedAt - b.updatedAt; // Earlier submission wins tie
      });

      let currentUserEntry: LeaderboardEntry | null = null;
      let currentUserRank: number | null = null;

      entries.forEach((entry, index) => {
        entry.rank = index + 1;
        if (currentUid && entry.uid === currentUid) {
          entry.isCurrentUser = true;
          currentUserEntry = entry;
          currentUserRank = entry.rank;
        }
      });

      // If current user is not in the top 50 but has a record, fetch their personal entry
      if (currentUid && !currentUserEntry) {
        try {
          const userRecordRef = ref(this.db, `leaderboards/${mode}/${currentUid}`);
          const userSnap = await get(userRecordRef);
          if (userSnap.exists()) {
            const uVal = userSnap.val();
            currentUserEntry = {
              uid: currentUid,
              nickname: StorageService.sanitizeNickname(uVal.nickname || nickname),
              score: uVal.score || 0,
              survivalTime: typeof uVal.survivalTime === 'number' ? uVal.survivalTime : null,
              updatedAt: uVal.updatedAt || 0,
              rank: entries.length + 1, // At least outside top 50
              isCurrentUser: true,
            };
            currentUserRank = currentUserEntry.rank || null;
          }
        } catch {
          // Ignore fallback fetch error
        }
      }

      return {
        success: true,
        entries,
        currentUserEntry,
        currentUserRank,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[LeaderboardService] fetchLeaderboard error:', msg);

      const localEntry: LeaderboardEntry | null =
        localHighScore > 0
          ? {
              uid: cachedUid,
              nickname,
              score: localHighScore,
              survivalTime: localBestTime,
              updatedAt: Date.now(),
              rank: 1,
              isCurrentUser: true,
            }
          : null;

      return {
        success: false,
        entries: localEntry ? [localEntry] : [],
        currentUserEntry: localEntry,
        currentUserRank: localEntry ? 1 : null,
        isOfflineFallback: true,
        error: `Could not reach leaderboard: ${msg}`,
      };
    }
  }
}
