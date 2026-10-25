export interface GameSettings {
  soundEnabled: boolean;
  sfxVolume: number;
  reducedMotion: boolean;
}

const HIGH_SCORE_KEY = 'pop_rush_high_score';
const SETTINGS_KEY = 'pop_rush_settings';

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

  public getHighScore(): number {
    try {
      const val = localStorage.getItem(HIGH_SCORE_KEY);
      return val ? parseInt(val, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  public saveHighScore(score: number): boolean {
    const currentHigh = this.getHighScore();
    if (score > currentHigh) {
      try {
        localStorage.setItem(HIGH_SCORE_KEY, score.toString());
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  public getSettings(): GameSettings {
    return { ...this.settings };
  }

  public saveSettings(updated: Partial<GameSettings>): void {
    this.settings = { ...this.settings, ...updated };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      // Ignore quota or disabled localStorage errors
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
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaults,
          ...parsed,
        };
      }
    } catch {
      // Fallback to defaults
    }

    return defaults;
  }
}
