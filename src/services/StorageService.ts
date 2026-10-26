export interface GameSettings {
  soundEnabled: boolean;
  sfxVolume: number;
  reducedMotion: boolean;
}

export interface GameRecords {
  timeAttackHighScore: number;
  endlessHighScore: number;
  endlessBestTime: number; // in seconds
}

const STORAGE_KEYS = {
  HIGH_SCORE_TIME_ATTACK: 'pop_rush_high_score', // preserved for backward compatibility
  HIGH_SCORE_ENDLESS: 'pop_rush_endless_high_score',
  BEST_TIME_ENDLESS: 'pop_rush_endless_best_time',
  SETTINGS: 'pop_rush_settings',
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

  // Backward compatibility helper
  public getHighScore(): number {
    return this.getTimeAttackHighScore();
  }

  public saveHighScore(score: number): boolean {
    return this.saveTimeAttackHighScore(score);
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
