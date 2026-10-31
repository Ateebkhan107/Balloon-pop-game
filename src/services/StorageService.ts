export interface GameSettings {
  soundEnabled: boolean;
  sfxVolume: number;
  reducedMotion: boolean;
}

export interface GameRecords {
  timeAttackHighScore: number;
  endlessHighScore: number;
  endlessBestTime: number; // in seconds
  colorChaosHighScore: number;
  oneLifeHighScore: number;
  oneLifeBestTime: number; // in seconds
}

export type BackgroundThemeId = 'dreamy_sky' | 'neon_night' | 'candy_world' | 'space_rush';

export interface ThemeConfig {
  id: BackgroundThemeId;
  name: string;
  emoji: string;
  textureKey: string;
  primaryColor: number;
  overlayColor: number;
  overlayAlpha: number;
}

export const BACKGROUND_THEMES: Record<BackgroundThemeId, ThemeConfig> = {
  dreamy_sky: {
    id: 'dreamy_sky',
    name: 'Dreamy Sky',
    emoji: '☁️',
    textureKey: 'bg_dreamy_sky',
    primaryColor: 0x38bdf8,
    overlayColor: 0x0f172a,
    overlayAlpha: 0.2,
  },
  neon_night: {
    id: 'neon_night',
    name: 'Neon Night',
    emoji: '🌃',
    textureKey: 'bg_neon_night',
    primaryColor: 0xa855f7,
    overlayColor: 0x0f172a,
    overlayAlpha: 0.35,
  },
  candy_world: {
    id: 'candy_world',
    name: 'Candy World',
    emoji: '🍭',
    textureKey: 'bg_candy_world',
    primaryColor: 0xf472b6,
    overlayColor: 0x1e1b4b,
    overlayAlpha: 0.22,
  },
  space_rush: {
    id: 'space_rush',
    name: 'Space Rush',
    emoji: '🚀',
    textureKey: 'bg_space_rush',
    primaryColor: 0x818cf8,
    overlayColor: 0x0f172a,
    overlayAlpha: 0.35,
  },
};

const STORAGE_KEYS = {
  HIGH_SCORE_TIME_ATTACK: 'pop_rush_high_score', // preserved for backward compatibility
  HIGH_SCORE_ENDLESS: 'pop_rush_endless_high_score',
  BEST_TIME_ENDLESS: 'pop_rush_endless_best_time',
  HIGH_SCORE_COLOR_CHAOS: 'pop_rush_color_chaos_high_score',
  HIGH_SCORE_ONE_LIFE: 'pop_rush_one_life_high_score',
  BEST_TIME_ONE_LIFE: 'pop_rush_one_life_best_time',
  SETTINGS: 'pop_rush_settings',
  PLAYER_NICKNAME: 'pop_rush_player_nickname',
  NICKNAME_PROMPTED: 'pop_rush_nickname_prompted',
  FIREBASE_UID: 'pop_rush_firebase_uid',
  BACKGROUND_THEME: 'pop_rush_bg_theme',
};

export class StorageService {
  private static instance: StorageService;
  private settings: GameSettings;

  private constructor() {
    this.settings = this.loadSettings();
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  // --- TIME ATTACK RECORDS ---

  public getTimeAttackHighScore(): number {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.HIGH_SCORE_TIME_ATTACK);
      return val ? parseInt(val, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  public saveTimeAttackHighScore(score: number): boolean {
    const current = this.getTimeAttackHighScore();
    if (score > current) {
      try {
        localStorage.setItem(STORAGE_KEYS.HIGH_SCORE_TIME_ATTACK, score.toString());
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  // --- ENDLESS RUSH RECORDS ---

  public getEndlessHighScore(): number {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.HIGH_SCORE_ENDLESS);
      return val ? parseInt(val, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  public saveEndlessHighScore(score: number): boolean {
    const current = this.getEndlessHighScore();
    if (score > current) {
      try {
        localStorage.setItem(STORAGE_KEYS.HIGH_SCORE_ENDLESS, score.toString());
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  public getEndlessBestTime(): number {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.BEST_TIME_ENDLESS);
      return val ? Math.floor(parseFloat(val)) || 0 : 0;
    } catch {
      return 0;
    }
  }

  public saveEndlessBestTime(seconds: number): boolean {
    const current = this.getEndlessBestTime();
    const rounded = Math.floor(seconds);
    if (rounded > current) {
      try {
        localStorage.setItem(STORAGE_KEYS.BEST_TIME_ENDLESS, rounded.toString());
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  // --- COLOR CHAOS RECORDS ---

  public getColorChaosHighScore(): number {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.HIGH_SCORE_COLOR_CHAOS);
      return val ? parseInt(val, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  public saveColorChaosHighScore(score: number): boolean {
    const current = this.getColorChaosHighScore();
    if (score > current) {
      try {
        localStorage.setItem(STORAGE_KEYS.HIGH_SCORE_COLOR_CHAOS, score.toString());
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  // --- ONE LIFE RECORDS ---

  public getOneLifeHighScore(): number {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.HIGH_SCORE_ONE_LIFE);
      return val ? parseInt(val, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  public saveOneLifeHighScore(score: number): boolean {
    const current = this.getOneLifeHighScore();
    if (score > current) {
      try {
        localStorage.setItem(STORAGE_KEYS.HIGH_SCORE_ONE_LIFE, score.toString());
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  public getOneLifeBestTime(): number {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.BEST_TIME_ONE_LIFE);
      return val ? Math.floor(parseFloat(val)) || 0 : 0;
    } catch {
      return 0;
    }
  }

  public saveOneLifeBestTime(seconds: number): boolean {
    const current = this.getOneLifeBestTime();
    const rounded = Math.floor(seconds);
    if (rounded > current) {
      try {
        localStorage.setItem(STORAGE_KEYS.BEST_TIME_ONE_LIFE, rounded.toString());
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  // --- MODE-GENERIC HELPERS ---

  public getHighScoreForMode(mode: string): number {
    switch (mode) {
      case 'time_attack':
        return this.getTimeAttackHighScore();
      case 'endless':
        return this.getEndlessHighScore();
      case 'color_chaos':
        return this.getColorChaosHighScore();
      case 'one_life':
        return this.getOneLifeHighScore();
      default:
        return 0;
    }
  }

  public saveHighScoreForMode(mode: string, score: number): boolean {
    switch (mode) {
      case 'time_attack':
        return this.saveTimeAttackHighScore(score);
      case 'endless':
        return this.saveEndlessHighScore(score);
      case 'color_chaos':
        return this.saveColorChaosHighScore(score);
      case 'one_life':
        return this.saveOneLifeHighScore(score);
      default:
        return false;
    }
  }

  public getBestTimeForMode(mode: string): number | null {
    if (mode === 'endless') return this.getEndlessBestTime();
    if (mode === 'one_life') return this.getOneLifeBestTime();
    return null;
  }

  public saveBestTimeForMode(mode: string, seconds: number): boolean {
    if (mode === 'endless') return this.saveEndlessBestTime(seconds);
    if (mode === 'one_life') return this.saveOneLifeBestTime(seconds);
    return false;
  }

  // Backward compatibility helper
  public getHighScore(): number {
    return this.getTimeAttackHighScore();
  }

  public saveHighScore(score: number): boolean {
    return this.saveTimeAttackHighScore(score);
  }

  // --- PLAYER PROFILE & NICKNAME ---

  public isNicknamePrompted(): boolean {
    try {
      const prompted = localStorage.getItem(STORAGE_KEYS.NICKNAME_PROMPTED);
      if (prompted === 'true') return true;
      const nick = this.getNickname();
      return Boolean(nick && nick !== 'Player');
    } catch {
      return false;
    }
  }

  public setNicknamePrompted(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.NICKNAME_PROMPTED, 'true');
    } catch {
      // Ignore quota error
    }
  }

  public getNickname(): string | null {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.PLAYER_NICKNAME);
      return val ? val.trim() : null;
    } catch {
      return null;
    }
  }

  public saveNickname(nickname: string): string {
    const sanitized = StorageService.sanitizeNickname(nickname);
    try {
      localStorage.setItem(STORAGE_KEYS.PLAYER_NICKNAME, sanitized);
      localStorage.setItem(STORAGE_KEYS.NICKNAME_PROMPTED, 'true');
    } catch {
      // Ignore quota errors
    }
    return sanitized;
  }

  public getFirebaseUid(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.FIREBASE_UID);
    } catch {
      return null;
    }
  }

  public saveFirebaseUid(uid: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.FIREBASE_UID, uid);
    } catch {
      // Ignore quota errors
    }
  }

  // --- BACKGROUND THEMES ---

  public getBackgroundTheme(): BackgroundThemeId {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.BACKGROUND_THEME) as BackgroundThemeId | null;
      if (val && BACKGROUND_THEMES[val]) {
        return val;
      }
    } catch {
      // Ignore
    }
    return 'dreamy_sky';
  }

  public saveBackgroundTheme(themeId: BackgroundThemeId): void {
    if (!BACKGROUND_THEMES[themeId]) return;
    try {
      localStorage.setItem(STORAGE_KEYS.BACKGROUND_THEME, themeId);
    } catch {
      // Ignore quota errors
    }
  }

  public static sanitizeNickname(raw: string): string {
    if (!raw) return 'Player';
    // Strip HTML/script characters and keep alphanumeric, spaces, dashes, and underscores
    let cleaned = raw.replace(/[<>&"'/\\`]/g, '').trim();
    if (cleaned.length < 2) {
      cleaned = 'Player';
    } else if (cleaned.length > 20) {
      cleaned = cleaned.substring(0, 20).trim();
    }
    return cleaned;
  }

  // --- SETTINGS ---

  public getSettings(): GameSettings {
    return { ...this.settings };
  }

  public saveSettings(updated: Partial<GameSettings>): void {
    this.settings = { ...this.settings, ...updated };
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    } catch {
      // Ignore quota errors
    }
  }

  private loadSettings(): GameSettings {
    const defaultReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const defaults: GameSettings = {
      soundEnabled: true,
      sfxVolume: 0.8,
      reducedMotion: defaultReducedMotion || false,
    };

    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaults,
          ...parsed,
        };
      }
    } catch {
      // Fallback
    }

    return defaults;
  }
}
