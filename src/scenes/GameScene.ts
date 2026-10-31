import Phaser from 'phaser';
import { Balloon, BalloonType } from '../entities/Balloon';
import { SoundService } from '../services/SoundService';
import { StorageService, BACKGROUND_THEMES } from '../services/StorageService';
import { FloatingText } from '../ui/FloatingText';
import { GameModals } from '../ui/GameModals';
import { ColorRushManager } from '../services/ColorRushManager';
import { FeverManager } from '../services/FeverManager';
import { BalloonTheme, BALLOON_COLORS } from '../services/AssetGenerator';
import { LeaderboardService } from '../services/LeaderboardService';

export type GameModeType = 'time_attack' | 'endless';

export interface GameStats {
  mode: GameModeType;
  score: number;
  highScore: number;
  survivalTime: number; // in seconds
  bestSurvivalTime: number; // in seconds
  balloonsPopped: number;
  perfectPops: number;
  goldenPopped: number;
  hazardsHit: number;
  maxCombo: number;
  feverActivations: number;
  isNewBestScore: boolean;
  isNewBestTime: boolean;
}

export class GameScene extends Phaser.Scene {
  // Mode configuration
  private mode: GameModeType = 'time_attack';

  // Game State
  private score: number = 0;
  private displayedScore: number = 0;
  private timeLeft: number = 30; // Time Attack countdown
  private survivalTime: number = 0; // Endless
  private elapsedGameplayTime: number = 0; // Elapsed active gameplay time for progressive difficulty
  private currentDifficultyTier: number = 1; // Current progression tier
  private lives: number = 3; // Endless
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private isEnding: boolean = false;

  // Combo & Fever
  private combo: number = 1;
  private maxCombo: number = 1;
  private comboTimer: number = 0;
  private readonly COMBO_WINDOW: number = 1.4;
  private feverManager: FeverManager = new FeverManager();
  private feverActivations: number = 0;

  // Color Rush System
  private colorRushManager!: ColorRushManager;
  private targetColorBadge!: Phaser.GameObjects.Container;
  private targetColorBg!: Phaser.GameObjects.Graphics;
  private targetColorDot!: Phaser.GameObjects.Graphics;
  private targetColorText!: Phaser.GameObjects.Text;
  private targetColorProgressRing!: Phaser.GameObjects.Graphics;
  private isAnnouncementActive: boolean = false;

  // Freeze Mechanic
  private isFreezeActive: boolean = false;
  private freezeTimer: number = 0;
  private freezeOverlay!: Phaser.GameObjects.Rectangle;

  // Stats Tracking
  private totalPopped: number = 0;
  private perfectPops: number = 0;
  private goldenPopped: number = 0;
  private hazardsHit: number = 0;

  // Spawning & Anti-Grouping System
  private spawnTimer: number = 0;
  private balloons: Balloon[] = [];
  private spawnsSinceTarget: number = 1;
  private readonly minDistractorsBetweenTargets: number = 2;
  private readonly maxDistractorsBetweenTargets: number = 3;

  // HUD Elements
  private timerText!: Phaser.GameObjects.Text;
  private timerRing!: Phaser.GameObjects.Graphics;
  private heartSprites: Phaser.GameObjects.Sprite[] = [];
  private scoreText!: Phaser.GameObjects.Text;
  private comboBadge!: Phaser.GameObjects.Container;
  private comboText!: Phaser.GameObjects.Text;
  private comboGauge!: Phaser.GameObjects.Graphics;
  private feverBarBg!: Phaser.GameObjects.Graphics;
  private feverBarFill!: Phaser.GameObjects.Graphics;
  private feverLabel!: Phaser.GameObjects.Text;
  private pauseOverlay!: Phaser.GameObjects.Container;
  private soundBtnIcon!: Phaser.GameObjects.Sprite;

  constructor() {
    super({ key: 'GameScene' });
  }

  public init(data?: { mode?: GameModeType }): void {
    this.mode = data?.mode || 'time_attack';
  }

  public create(): void {
    const { width, height } = this.cameras.main;

    // Reset game state
    this.score = 0;
    this.displayedScore = 0;
    this.timeLeft = 30;
    this.survivalTime = 0;
    this.elapsedGameplayTime = 0;
    this.currentDifficultyTier = 1;
    this.lives = 3;
    this.isPlaying = false;
    this.isPaused = false;
    this.isEnding = false;
    this.isAnnouncementActive = false;
    this.combo = 1;
    this.maxCombo = 1;
    this.comboTimer = 0;
    this.feverActivations = 0;
    this.isFreezeActive = false;
    this.freezeTimer = 0;
    this.totalPopped = 0;
    this.perfectPops = 0;
    this.goldenPopped = 0;
    this.hazardsHit = 0;
    this.spawnTimer = 0;
    this.spawnsSinceTarget = 1; // 1 initial distractor, then isolated target
    this.balloons = [];
    this.heartSprites = [];

    // Initialize Managers
    const switchInterval = this.mode === 'time_attack' ? 7.2 : 7.5;
    this.colorRushManager = new ColorRushManager(switchInterval);
    this.feverManager.reset();

    this.setupColorRushCallbacks();
    this.setupFeverCallbacks();

    // --- BACKGROUND ---
    this.createBackground(width, height);

    // --- FREEZE VISUAL OVERLAY ---
    this.freezeOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x38bdf8, 0).setDepth(25);

    // --- HUD (TOP BAR & COLOR RUSH INDICATOR) ---
    this.createHUD(width);

    // --- PAUSE OVERLAY ---
    this.createPauseOverlay(width, height);

    // --- INPUT HANDLING ---
    this.setupInput();

    // --- START COUNTDOWN ---
    this.startCountdown(width, height);

    // Fade in
    this.cameras.main.fadeIn(250, 15, 23, 42);

    // Clean up on scene shutdown
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.removeAllListeners();
      this.input.removeAllListeners();
      this.balloons.forEach((b) => b.destroy());
      this.balloons = [];
    });
  }

  private setupColorRushCallbacks(): void {
    this.colorRushManager.setCallbacks(
      (newColor: BalloonTheme, _prevColor: BalloonTheme) => {
        this.updateTargetColorBadge(newColor);
        this.announceTargetColor(newColor, false);
        // Reset counter so at least minDistractorsBetweenTargets distractors spawn first.
        // This ensures the target color NEVER spawns in a group or immediately in a bunch!
        this.spawnsSinceTarget = 0;
      },
      () => {
        // Warning 1 second before switch: subtle pulse on badge
        if (!this.isAnnouncementActive && this.targetColorBadge) {
          this.tweens.add({
            targets: this.targetColorBadge,
            scaleX: 1.12,
            scaleY: 1.12,
            duration: 200,
            yoyo: true,
            repeat: 2,
          });
        }
      }
    );
  }

  private setupFeverCallbacks(): void {
    const sound = SoundService.getInstance();
    const settings = StorageService.getInstance().getSettings();

    this.feverManager.setCallbacks(
      () => {
        this.feverActivations++;
        sound.playFeverStart();
        this.announceFeverMode();
        if (!settings.reducedMotion) {
          this.cameras.main.shake(200, 0.012);
        }
      },
      () => {
        FloatingText.show(this, this.cameras.main.width / 2, 210, 'FEVER ENDED', '#94a3b8', '24px');
      }
    );
  }

  private createBackground(width: number, height: number): void {
    const storage = StorageService.getInstance();
    const themeId = storage.getBackgroundTheme();
    const theme = BACKGROUND_THEMES[themeId] || BACKGROUND_THEMES.dreamy_sky;

    if (this.textures.exists(theme.textureKey)) {
      const bg = this.add.image(width / 2, height / 2, theme.textureKey);
      const scaleX = width / bg.width;
      const scaleY = height / bg.height;
      bg.setScale(Math.max(scaleX, scaleY));
    } else if (this.textures.exists('bg_sky')) {
      const bg = this.add.image(width / 2, height / 2, 'bg_sky');
      const scaleX = width / bg.width;
      const scaleY = height / bg.height;
      bg.setScale(Math.max(scaleX, scaleY));
      bg.setTint(this.mode === 'endless' ? 0x64748b : 0x7dd3fc);
    } else {
      this.add.rectangle(width / 2, height / 2, width, height, 0x0284c7);
    }

    const overlay = this.add.graphics();
    overlay.fillGradientStyle(0x0f172a, 0x0f172a, theme.overlayColor, theme.overlayColor, 0.40, 0.40, theme.overlayAlpha, theme.overlayAlpha);
    overlay.fillRect(0, 0, width, height);
  }

  private createHUD(width: number): void {
    const hudContainer = this.add.container(0, 0).setDepth(100);

    // Glassmorphic top bar background (y: 0 to 110)
    const barBg = this.add.graphics();
    barBg.fillStyle(0x0f172a, 0.92);
    barBg.fillRect(0, 0, width, 110);
    barBg.lineStyle(2, 0x334155, 1);
    barBg.strokeLineShape(new Phaser.Geom.Line(0, 110, width, 110));

    // Shield zone to block accidental touches behind HUD
    const hudShield = this.add.zone(width / 2, 55, width, 110);
    hudShield.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, 110), Phaser.Geom.Rectangle.Contains);
    hudContainer.add([barBg, hudShield]);

    // 1. LEFT: MODE TIMER OR LIVES DISPLAY
    if (this.mode === 'time_attack') {
      this.timerRing = this.add.graphics();
      hudContainer.add(this.timerRing);

      const timerLabel = this.add.text(65, 24, 'TIME', {
        fontFamily: "'Fredoka', sans-serif",
        fontSize: '13px',
        color: '#94a3b8',
        fontStyle: 'bold',
        letterSpacing: 1,
      }).setOrigin(0.5);

      this.timerText = this.add.text(65, 58, '30s', {
        fontFamily: "'Fredoka', sans-serif",
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#38bdf8',
      }).setOrigin(0.5);

      hudContainer.add([timerLabel, this.timerText]);
    } else {
      // Endless Rush: Lives & Survival Clock
      const livesLabel = this.add.text(70, 22, 'LIVES', {
        fontFamily: "'Fredoka', sans-serif",
        fontSize: '12px',
        color: '#94a3b8',
        fontStyle: 'bold',
        letterSpacing: 1,
      }).setOrigin(0.5);

      // 3 Heart sprites
      for (let i = 0; i < 3; i++) {
        const heart = this.add.sprite(42 + i * 28, 48, 'icon_heart_full').setScale(0.85);
        this.heartSprites.push(heart);
        hudContainer.add(heart);
      }

      this.timerText = this.add.text(70, 78, '00:00', {
        fontFamily: "'Fredoka', sans-serif",
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#38bdf8',
      }).setOrigin(0.5);

      hudContainer.add([livesLabel, this.timerText]);
    }

    // 2. CENTER: PROMINENT COLOR RUSH INDICATOR
    this.createTargetColorBadge(width, hudContainer);

    // 3. CENTER-RIGHT: SCORE DISPLAY
    const scoreBox = this.add.container(width / 2 + 130, 48);
    const scoreLabel = this.add.text(0, -20, 'SCORE', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '12px',
      color: '#94a3b8',
      fontStyle: 'bold',
      letterSpacing: 1,
    }).setOrigin(0.5);

    this.scoreText = this.add.text(0, 10, '0', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '30px',
      fontStyle: 'bold',
      color: '#f8fafc',
    }).setOrigin(0.5);

    scoreBox.add([scoreLabel, this.scoreText]);
    hudContainer.add(scoreBox);

    // 4. RIGHT: ACTION CONTROLS (Sound & Pause)
    const soundService = SoundService.getInstance();

    const soundBtn = this.add.container(width - 38, 42);
    const soundBg = this.add.circle(0, 0, 18, 0x1e293b, 0.9);
    soundBg.setStrokeStyle(2, 0x64748b);
    this.soundBtnIcon = this.add.sprite(0, 0, soundService.isSoundEnabled() ? 'icon_sound_on' : 'icon_sound_off').setScale(0.6);

    soundBtn.add([soundBg, this.soundBtnIcon]);
    soundBtn.setSize(36, 36);
    soundBtn.setInteractive(new Phaser.Geom.Circle(18, 18, 18), Phaser.Geom.Circle.Contains);
    if (soundBtn.input) soundBtn.input.cursor = 'pointer';

    soundBtn.on('pointerdown', () => {
      const enabled = soundService.toggleSound();
      this.soundBtnIcon.setTexture(enabled ? 'icon_sound_on' : 'icon_sound_off');
    });

    const pauseBtn = this.add.container(width - 38, 80);
    const pauseBg = this.add.circle(0, 0, 18, 0x1e293b, 0.9);
    pauseBg.setStrokeStyle(2, 0x64748b);
    const pauseIcon = this.add.sprite(0, 0, 'icon_pause').setScale(0.6);

    pauseBtn.add([pauseBg, pauseIcon]);
    pauseBtn.setSize(36, 36);
    pauseBtn.setInteractive(new Phaser.Geom.Circle(18, 18, 18), Phaser.Geom.Circle.Contains);
    if (pauseBtn.input) pauseBtn.input.cursor = 'pointer';

    pauseBtn.on('pointerdown', () => {
      this.togglePause();
    });

    hudContainer.add([soundBtn, pauseBtn]);

    // 5. UNDER HUD: COMBO & FEVER GAUGES
    this.createComboAndFeverHUD(width);
  }

  private createTargetColorBadge(width: number, parent: Phaser.GameObjects.Container): void {
    const activeTheme = this.colorRushManager.getActiveTheme();
    // Compact, unobtrusive indicator in HUD center
    this.targetColorBadge = this.add.container(width / 2 - 25, 52);

    this.targetColorBg = this.add.graphics();
    this.targetColorDot = this.add.graphics();
    this.targetColorProgressRing = this.add.graphics();

    this.targetColorText = this.add.text(6, -1, `🎯 ${activeTheme.label}`, {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#f8fafc',
      letterSpacing: 1,
    }).setOrigin(0.5);

    this.targetColorBadge.add([this.targetColorBg, this.targetColorDot, this.targetColorProgressRing, this.targetColorText]);
    parent.add(this.targetColorBadge);

    this.updateTargetColorBadge(activeTheme);
  }

  private updateTargetColorBadge(theme: BalloonTheme): void {
    if (!this.targetColorBg || !this.targetColorDot || !this.targetColorText) return;
    this.targetColorBg.clear();
    this.targetColorDot.clear();

    const badgeWidth = 120;
    const badgeHeight = 32;

    // Small, unobtrusive dark translucent pill with color-matched accent border
    this.targetColorBg.fillStyle(0x0f172a, 0.88);
    this.targetColorBg.fillRoundedRect(-badgeWidth / 2, -badgeHeight / 2, badgeWidth, badgeHeight, 16);
    this.targetColorBg.lineStyle(2, theme.hexNum, 0.9);
    this.targetColorBg.strokeRoundedRect(-badgeWidth / 2, -badgeHeight / 2, badgeWidth, badgeHeight, 16);

    // Glowing color dot indicator
    this.targetColorDot.fillStyle(theme.hexNum, 1);
    this.targetColorDot.fillCircle(-badgeWidth / 2 + 16, -1, 5.5);

    // Clean, unobtrusive label (e.g. "🎯 RED")
    this.targetColorText.setText(`🎯 ${theme.label}`);

    this.updateTargetColorProgress();
  }

  private updateTargetColorProgress(): void {
    if (!this.targetColorProgressRing || !this.colorRushManager) return;
    this.targetColorProgressRing.clear();

    const activeTheme = this.colorRushManager.getActiveTheme();
    const badgeWidth = 120;
    const badgeHeight = 32;
    const progress = this.colorRushManager.getProgress(); // 0 -> 1

    const barWidth = badgeWidth - 26;
    const currentW = Math.max(0, barWidth * (1 - progress));

    // Subtle dark countdown track at bottom of indicator
    this.targetColorProgressRing.fillStyle(0x334155, 0.6);
    this.targetColorProgressRing.fillRoundedRect(-barWidth / 2, badgeHeight / 2 - 5, barWidth, 3, 1.5);

    // Dynamic bright timer bar matching active color
    this.targetColorProgressRing.fillStyle(activeTheme.hexNum, 0.95);
    this.targetColorProgressRing.fillRoundedRect(-barWidth / 2, badgeHeight / 2 - 5, currentW, 3, 1.5);
  }

  /**
   * Displays the large animated arcade "POP {COLOR}!" announcement in the CENTER
   * of the gameplay screen. Briefly pauses balloon movement, timers, and scoring
   * so the player can read the new color fairly, then resumes automatically.
   */
  private announceTargetColor(theme: BalloonTheme, isGameStart: boolean = false): void {
    const { width, height } = this.cameras.main;
    const sound = SoundService.getInstance();
    const settings = StorageService.getInstance().getSettings();

    // 1. Pause gameplay movement & scoring during announcement
    this.isAnnouncementActive = true;

    // 2. Play satisfying transition sound
    sound.playColorAnnouncement();

    // 3. Keep top HUD indicator subtle while center announcement is front-and-center
    if (this.targetColorBadge) {
      this.targetColorBadge.setAlpha(0.35);
    }

    // 4. Center Announcement Container
    const announcement = this.add.container(width / 2, height * 0.46).setDepth(250);

    const cardWidth = Math.min(width * 0.88, 420);
    const cardHeight = 136;

    // Layer 1: Dark outer glow / shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(0x0f172a, 0.7);
    shadow.fillRoundedRect(-cardWidth / 2 - 4, -cardHeight / 2 - 4, cardWidth + 8, cardHeight + 8, 30);

    // Layer 2: Main vibrant color plate
    const plate = this.add.graphics();
    plate.fillStyle(theme.hexNum, 0.96);
    plate.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 26);
    plate.lineStyle(4, 0xffffff, 1);
    plate.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 26);

    // Header Kicker
    const kickerText = isGameStart ? '🎯 GET READY!' : '🔄 NEW TARGET COLOR!';
    const kicker = this.add.text(0, -cardHeight / 2 + 22, kickerText, {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#fef08a',
      stroke: '#0f172a',
      strokeThickness: 4,
      letterSpacing: 2,
    }).setOrigin(0.5);

    // Main Large "POP {COLOR}!" Text
    const mainTitle = this.add.text(0, 4, `POP ${theme.label}!`, {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '52px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#0f172a',
      strokeThickness: 10,
    }).setOrigin(0.5);

    // Bottom Subtitle Hint
    const subtitle = this.add.text(0, cardHeight / 2 - 22, `${theme.symbol} ONLY POP ${theme.label} BALLOONS ${theme.symbol}`, {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#0f172a',
      strokeThickness: 4,
    }).setOrigin(0.5);

    announcement.add([shadow, plate, kicker, mainTitle, subtitle]);

    // 5. Sparkle Particle Burst
    if (!settings.reducedMotion) {
      const colors = [theme.hexNum, 0xffffff, 0xfef08a];
      for (let i = 0; i < 14; i++) {
        const angle = (i / 14) * Math.PI * 2;
        const dist = Phaser.Math.Between(130, 200);
        const p = this.add.sprite(width / 2, height * 0.46, 'particle_star');
        p.setTint(colors[i % colors.length]);
        p.setScale(Phaser.Math.FloatBetween(0.5, 0.85));
        p.setDepth(251);

        this.tweens.add({
          targets: p,
          x: width / 2 + Math.cos(angle) * dist,
          y: height * 0.46 + Math.sin(angle) * dist * 0.65,
          alpha: 0,
          scaleX: 0.1,
          scaleY: 0.1,
          duration: 550,
          ease: 'Power2',
          onComplete: () => p.destroy(),
        });
      }
    }

    // 6. Smooth Arcade Zoom-in Pop Animation & Auto-resume
    const reduced = settings.reducedMotion;
    announcement.setScale(reduced ? 1 : 0.2);
    announcement.setAlpha(0);

    // Phase 1: Satisfying zoom-in pop
    this.tweens.add({
      targets: announcement,
      scaleX: reduced ? 1 : 1.15,
      scaleY: reduced ? 1 : 1.15,
      alpha: 1,
      duration: reduced ? 140 : 220,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Phase 2: Settle to normal scale
        this.tweens.add({
          targets: announcement,
          scaleX: 1.0,
          scaleY: 1.0,
          duration: reduced ? 90 : 120,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            // Phase 3: Hold for reading (~400ms), then smoothly zoom up & fade out
            this.tweens.add({
              targets: announcement,
              alpha: 0,
              scaleX: reduced ? 1 : 1.22,
              scaleY: reduced ? 1 : 1.22,
              duration: 250,
              delay: 420,
              ease: 'Cubic.easeIn',
              onComplete: () => {
                announcement.destroy();
                // Resume gameplay automatically
                this.isAnnouncementActive = false;

                // Restore & gently punch top indicator into focus
                if (this.targetColorBadge) {
                  this.tweens.add({
                    targets: this.targetColorBadge,
                    alpha: 1,
                    scaleX: 1.12,
                    scaleY: 1.12,
                    duration: 140,
                    yoyo: true,
                  });
                }
              },
            });
          },
        });
      },
    });
  }

  private createComboAndFeverHUD(width: number): void {
    // Floating Combo Badge
    this.comboBadge = this.add.container(width / 2 - 90, 138).setDepth(100);

    const comboBg = this.add.graphics();
    comboBg.fillStyle(0x1e1b4b, 0.9);
    comboBg.fillRoundedRect(-65, -16, 130, 32, 16);
    comboBg.lineStyle(2, 0xf59e0b, 1);
    comboBg.strokeRoundedRect(-65, -16, 130, 32, 16);

    this.comboText = this.add.text(0, -2, 'COMBO x1', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#fef08a',
    }).setOrigin(0.5);

    this.comboGauge = this.add.graphics();
    this.comboBadge.add([comboBg, this.comboGauge, this.comboText]);
    this.comboBadge.setAlpha(0);

    // Floating Fever Gauge (Right of combo badge)
    const feverContainer = this.add.container(width / 2 + 90, 138).setDepth(100);

    this.feverBarBg = this.add.graphics();
    this.feverBarBg.fillStyle(0x1e1b4b, 0.9);
    this.feverBarBg.fillRoundedRect(-65, -16, 130, 32, 16);
    this.feverBarBg.lineStyle(2, 0xf43f5e, 1);
    this.feverBarBg.strokeRoundedRect(-65, -16, 130, 32, 16);

    this.feverBarFill = this.add.graphics();

    this.feverLabel = this.add.text(0, -2, 'FEVER: 0%', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#fb7185',
    }).setOrigin(0.5);

    feverContainer.add([this.feverBarBg, this.feverBarFill, this.feverLabel]);
  }

  private announceFeverMode(): void {
    const { width, height } = this.cameras.main;
    const banner = this.add.text(width / 2, height * 0.35, '🔥 FEVER MODE! 2X POINTS! 🔥', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#fef08a',
      stroke: '#b45309',
      strokeThickness: 8,
      align: 'center',
    }).setOrigin(0.5).setDepth(150);

    this.tweens.add({
      targets: banner,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 300,
      yoyo: true,
      repeat: 2,
      onComplete: () => banner.destroy(),
    });
  }

  private createPauseOverlay(width: number, height: number): void {
    this.pauseOverlay = this.add.container(0, 0).setDepth(300).setVisible(false);

    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x0f172a, 0.88);
    bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    this.pauseOverlay.add(bg);

    const cardWidth = Math.min(width * 0.85, 460);
    const cardHeight = 440;
    const card = this.add.graphics();
    card.fillStyle(0x1e1b4b, 0.98);
    card.lineStyle(4, 0x6366f1, 1);
    card.fillRoundedRect(width / 2 - cardWidth / 2, height / 2 - cardHeight / 2, cardWidth, cardHeight, 24);
    card.strokeRoundedRect(width / 2 - cardWidth / 2, height / 2 - cardHeight / 2, cardWidth, cardHeight, 24);
    this.pauseOverlay.add(card);

    const title = this.add.text(width / 2, height / 2 - cardHeight / 2 + 55, 'GAME PAUSED', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#38bdf8',
    }).setOrigin(0.5);
    this.pauseOverlay.add(title);

    const btnData = [
      { text: 'RESUME', color: 0x10b981, action: () => this.togglePause() },
      { text: 'RESTART', color: 0x0284c7, action: () => this.restartGame() },
      {
        text: 'SETTINGS',
        color: 0x7c3aed,
        action: () => {
          GameModals.showSettings(this, () => {
            this.soundBtnIcon.setTexture(SoundService.getInstance().isSoundEnabled() ? 'icon_sound_on' : 'icon_sound_off');
          });
        },
      },
      { text: 'MAIN MENU', color: 0xef4444, action: () => this.returnToMenu() },
    ];

    btnData.forEach((item, idx) => {
      const btnY = height / 2 - cardHeight / 2 + 135 + idx * 64;
      const btn = this.add.container(width / 2, btnY);

      const bBg = this.add.graphics();
      bBg.fillStyle(item.color, 1);
      bBg.fillRoundedRect(-110, -24, 220, 48, 14);

      const bTxt = this.add.text(0, 0, item.text, {
        fontFamily: "'Fredoka', sans-serif",
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0.5);

      btn.add([bBg, bTxt]);
      btn.setSize(220, 48);
      btn.setInteractive(new Phaser.Geom.Rectangle(0, 0, 220, 48), Phaser.Geom.Rectangle.Contains);
      if (btn.input) btn.input.cursor = 'pointer';

      btn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (pointer.button !== 0 && pointer.button !== undefined) return;
        SoundService.getInstance().playClick();
        item.action();
      });

      btn.on('pointerover', () => {
        this.tweens.add({ targets: btn, scaleX: 1.05, scaleY: 1.05, duration: 120 });
      });
      btn.on('pointerout', () => {
        this.tweens.add({ targets: btn, scaleX: 1, scaleY: 1, duration: 120 });
      });

      this.pauseOverlay.add(btn);
    });
  }

  private startCountdown(width: number, height: number): void {
    const sound = SoundService.getInstance();
    const countSeq = ['3', '2', '1'];
    let step = 0;

    const countText = this.add.text(width / 2, height / 2, countSeq[0], {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '96px',
      fontStyle: 'bold',
      color: '#f43f5e',
      stroke: '#0f172a',
      strokeThickness: 12,
    }).setOrigin(0.5).setDepth(150);

    const playNext = () => {
      if (step >= countSeq.length) {
        countText.destroy();
        this.isPlaying = true;
        this.announceTargetColor(this.colorRushManager.getActiveTheme(), true);
        return;
      }

      const val = countSeq[step];
      countText.setText(val);
      countText.setScale(0.3);
      countText.setAlpha(1);

      sound.playCountdown(val === '1');

      this.tweens.add({
        targets: countText,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 450,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: countText,
            alpha: 0,
            scaleX: 1.6,
            scaleY: 1.6,
            duration: 250,
            onComplete: () => {
              step++;
              playNext();
            },
          });
        },
      });
    };

    playNext();
  }

  private setupInput(): void {
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.code === 'KeyP' || event.code === 'Escape') {
        this.togglePause();
      }
    });

    this.input.on('gameobjectdown', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      if (pointer.button !== 0 && pointer.button !== undefined) return;
      if (!this.isPlaying || this.isPaused || this.isEnding || this.isAnnouncementActive) return;
      if (gameObject instanceof Balloon) {
        this.handleBalloonPop(gameObject, pointer);
      }
    });
  }

  private handleBalloonPop(balloon: Balloon, pointer?: Phaser.Input.Pointer): void {
    if (balloon.isPopped || !this.isPlaying || this.isPaused || this.isEnding || this.isAnnouncementActive) return;

    const sound = SoundService.getInstance();
    const settings = StorageService.getInstance().getSettings();
    const bx = balloon.x;
    const by = balloon.y;
    const type = balloon.balloonType;
    const currentTime = this.time.now;

    // Check Accuracy-based "Perfect Pop" (distance from visual body center at y - 25 * scale)
    let isPerfect = false;
    const balloonScale = balloon.targetScale || 1.0;
    if (pointer) {
      const visualCenterY = by - 25 * balloonScale;
      const perfectRadius = 22 * balloonScale;
      const dist = Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, bx, visualCenterY);
      if (dist <= Math.max(16, perfectRadius)) {
        isPerfect = true;
      }
    }

    const feverActive = this.feverManager.isActive();
    const feverMultiplier = feverActive ? 2 : 1;
    const swiftBonus = balloon.isSmall ? 50 : 0;

    // --- 1. SPECIAL BALLOONS (All specials pop on tap) ---
    if (type === 'golden') {
      balloon.pop();
      this.totalPopped++;
      this.goldenPopped++;
      this.refreshCombo();

      if (isPerfect) {
        this.perfectPops++;
        sound.playPerfect();
        FloatingText.show(this, bx, by - 40, 'PERFECT! +50', '#fef08a', '26px');
        this.feverManager.addCharge(25);
      }

      if (balloon.isSmall) {
        FloatingText.show(this, bx, by - 65, 'SWIFT! +50', '#38bdf8', '22px');
      }

      const earned = (balloon.scoreValue + (isPerfect ? 50 : 0) + swiftBonus) * this.combo * feverMultiplier;
      this.addScore(earned);

      if (this.mode === 'time_attack') {
        this.addTime(2);
      }
      this.feverManager.addCharge(30);

      sound.playGold();
      this.createGoldSparkles(bx, by);
      FloatingText.show(this, bx, by, `+${earned}${this.mode === 'time_attack' ? ' & +2s!' : ''}`, '#fef08a', '32px');

      if (!settings.reducedMotion) this.cameras.main.shake(140, 0.008);
      return;
    }

    if (type === 'rainbow') {
      balloon.pop();
      this.totalPopped++;
      this.refreshCombo();

      if (isPerfect) {
        this.perfectPops++;
        sound.playPerfect();
        FloatingText.show(this, bx, by - 40, 'PERFECT! +50', '#fef08a', '26px');
        this.feverManager.addCharge(25);
      }

      if (balloon.isSmall) {
        FloatingText.show(this, bx, by - 65, 'SWIFT! +50', '#38bdf8', '22px');
      }

      const earned = (balloon.scoreValue + (isPerfect ? 50 : 0) + swiftBonus) * this.combo * feverMultiplier;
      this.addScore(earned);
      this.feverManager.addCharge(35);

      sound.playRainbow();
      this.createRainbowParticles(bx, by);
      FloatingText.show(this, bx, by, `RAINBOW! +${earned}`, '#38bdf8', '32px');
      return;
    }

    if (type === 'freeze') {
      balloon.pop();
      this.totalPopped++;
      this.refreshCombo();

      if (isPerfect) {
        this.perfectPops++;
        sound.playPerfect();
        FloatingText.show(this, bx, by - 40, 'PERFECT! +50', '#fef08a', '26px');
        this.feverManager.addCharge(25);
      }

      if (balloon.isSmall) {
        FloatingText.show(this, bx, by - 65, 'SWIFT! +50', '#38bdf8', '22px');
      }

      const earned = (balloon.scoreValue + (isPerfect ? 50 : 0) + swiftBonus) * this.combo * feverMultiplier;
      this.addScore(earned);
      this.activateFreeze();

      sound.playFreeze();
      this.createFreezeParticles(bx, by);
      FloatingText.show(this, bx, by, 'FREEZE! ❄️', '#7dd3fc', '32px');
      return;
    }

    if (type === 'hazard') {
      balloon.pop();
      this.hazardsHit++;
      this.breakCombo();
      this.feverManager.deductCharge(25);
      sound.playHazard();
      this.createHazardParticles(bx, by);

      if (this.mode === 'time_attack') {
        this.deductScore(200);
        this.deductTime(3);
        FloatingText.show(this, bx, by, '-200 & -3s!', '#ef4444', '32px');
      } else {
        // Endless Mode: Hitting bomb costs 1 life
        this.deductLife('BOMB HIT!');
      }

      if (!settings.reducedMotion) {
        this.cameras.main.shake(250, 0.02);
        this.cameras.main.flash(200, 239, 68, 68);
      }
      return;
    }

    // --- 2. NORMAL BALLOONS (COLOR RUSH MATCHING) ---
    const matchCheck = this.colorRushManager.isMatchingColor(balloon.colorKey, currentTime);
    const isValidTarget = matchCheck.isMatch || feverActive;

    if (isValidTarget) {
      // ONLY matching color balloon pops and earns points!
      balloon.pop();
      this.totalPopped++;
      this.refreshCombo();
      this.feverManager.addCharge(14);

      if (isPerfect) {
        this.perfectPops++;
        sound.playPerfect();
        FloatingText.show(this, bx, by - 40, 'PERFECT! +50', '#fef08a', '26px');
        this.feverManager.addCharge(25);
      }

      if (balloon.isSmall) {
        FloatingText.show(this, bx, by - 65, 'SWIFT! +50', '#38bdf8', '22px');
      }

      const theme = BALLOON_COLORS[balloon.colorKey] || BALLOON_COLORS.red;
      const earned = (balloon.scoreValue + (isPerfect ? 50 : 0) + swiftBonus) * this.combo * feverMultiplier;
      this.addScore(earned);

      sound.playPop(this.combo);
      this.createPopParticles(bx, by, theme.hexNum);

      FloatingText.show(
        this,
        bx,
        by,
        `+${earned}${this.combo > 1 ? ` (x${this.combo})` : ''}`,
        theme.highlight,
        this.combo >= 3 ? '32px' : '26px'
      );

      if (this.combo >= 4 && !settings.reducedMotion) {
        this.cameras.main.shake(120, 0.005);
      }
    } else {
      // WRONG COLOR TAP!
      // Balloon does NOT pop! Score does NOT increase!
      const lastWrongTap = (balloon as unknown as { lastWrongTapTime?: number }).lastWrongTapTime || 0;
      if (currentTime - lastWrongTap < 260) return;
      (balloon as unknown as { lastWrongTapTime?: number }).lastWrongTapTime = currentTime;

      // Small ❌ visual effect at tap location
      this.showWrongTapEffect(pointer ? pointer.worldX : bx, pointer ? pointer.worldY : by);

      // Subtle error sound
      sound.playWrongColor();

      // Reset combo
      this.breakCombo();
      this.feverManager.deductCharge(15);

      // Subtle wobble tween on the intact balloon
      this.tweens.add({
        targets: balloon,
        scaleX: 1.15,
        scaleY: 0.9,
        duration: 55,
        yoyo: true,
        repeat: 1,
        ease: 'Quad.easeInOut',
      });

      if (this.mode === 'endless') {
        // Endless Mode: Wrong color tap costs 1 life
        this.deductLife('WRONG COLOR!');
      } else {
        // Time Attack: No score gain, reset combo
        if (!settings.reducedMotion) this.cameras.main.shake(100, 0.005);
      }
    }
  }

  private showWrongTapEffect(x: number, y: number): void {
    const cross = this.add.text(x, y, '❌', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '28px',
    }).setOrigin(0.5).setDepth(160);

    cross.setScale(0.5);
    this.tweens.add({
      targets: cross,
      scaleX: 1.25,
      scaleY: 1.25,
      y: y - 28,
      alpha: 0,
      duration: 380,
      ease: 'Back.easeOut',
      onComplete: () => cross.destroy(),
    });
  }

  private handleBalloonEscape(balloon: Balloon): void {
    if (this.mode !== 'endless' || !this.isPlaying || this.isEnding) return;

    // In Endless, letting an active target color balloon escape costs 1 life
    if (balloon.balloonType === 'normal' && balloon.colorKey === this.colorRushManager.getActiveColorKey()) {
      if (!this.feverManager.isActive()) {
        this.deductLife('TARGET ESCAPED!');
      }
    }
  }

  private deductLife(reason: string): void {
    this.lives = Math.max(0, this.lives - 1);
    SoundService.getInstance().playLifeLost();

    // Update heart icons
    this.heartSprites.forEach((heart, idx) => {
      if (idx >= this.lives) {
        heart.setTexture('icon_heart_empty');
      }
    });

    FloatingText.show(this, this.cameras.main.width / 2, 190, `${reason} -1 LIFE`, '#ef4444', '30px');

    const settings = StorageService.getInstance().getSettings();
    if (!settings.reducedMotion) {
      this.cameras.main.shake(220, 0.015);
      this.cameras.main.flash(180, 239, 68, 68);
    }

    if (this.lives <= 0) {
      this.endGame();
    }
  }

  private activateFreeze(): void {
    this.isFreezeActive = true;
    this.freezeTimer = 4.0;
    this.balloons.forEach((b) => b.setFrozen(true));

    this.tweens.add({
      targets: this.freezeOverlay,
      fillAlpha: 0.25,
      duration: 200,
    });

    if (this.mode === 'time_attack') {
      this.addTime(2); // Bonus time freeze
    }
  }

  private refreshCombo(): void {
    this.comboTimer = this.COMBO_WINDOW;
    this.combo = Math.min(this.combo + 1, 5);
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }

    if (this.combo >= 2) {
      this.comboBadge.setAlpha(1);
      this.comboText.setText(`COMBO x${this.combo}`);

      this.tweens.add({
        targets: this.comboBadge,
        scaleX: 1.15,
        scaleY: 1.15,
        duration: 80,
        yoyo: true,
      });

      if (this.combo === 5) {
        SoundService.getInstance().playCombo(5);
        FloatingText.show(this, this.cameras.main.width / 2, 180, '🔥 MAX COMBO! 🔥', '#fbbf24', '30px');
      }
    }
  }

  private breakCombo(): void {
    this.combo = 1;
    this.comboTimer = 0;
    this.comboBadge.setAlpha(0);
  }

  private addScore(points: number): void {
    this.score += points;
  }

  private deductScore(points: number): void {
    this.score = Math.max(0, this.score - points);
  }

  private addTime(seconds: number): void {
    this.timeLeft += seconds;
    if (this.timerText) {
      this.timerText.setText(`${Math.ceil(this.timeLeft)}s`);
      this.tweens.add({
        targets: this.timerText,
        scaleX: 1.25,
        scaleY: 1.25,
        duration: 120,
        yoyo: true,
      });
    }
  }

  private deductTime(seconds: number): void {
    this.timeLeft = Math.max(0, this.timeLeft - seconds);
    if (this.timerText) {
      this.timerText.setText(`${Math.ceil(this.timeLeft)}s`);
    }
  }

  public update(time: number, delta: number): void {
    if (!this.isPlaying || this.isPaused || this.isEnding || this.isAnnouncementActive) return;

    const dt = delta / 1000;

    // Advance active elapsed gameplay time (automatically paused when isPaused is true)
    this.elapsedGameplayTime += dt;

    // 1. UPDATE MODE CLOCKS & PROGRESSIVE DIFFICULTY TIERS
    const difficulty = this.getDifficultyFactor();

    if (this.mode === 'time_attack') {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.endGame();
        return;
      }

      // Check Tier Milestones based on elapsed gameplay time:
      // 0-10s: Tier 1 (Easy, slow balloons)
      // 10-20s: Tier 2 (Medium speed, more balloons)
      // 20-30s+: Tier 3 (Fast balloons, quicker color changes)
      const expectedTier = this.elapsedGameplayTime >= 20 ? 3 : this.elapsedGameplayTime >= 10 ? 2 : 1;
      if (expectedTier > this.currentDifficultyTier) {
        this.currentDifficultyTier = expectedTier;
        if (expectedTier === 2) {
          this.announceSpeedUp(2, 'MEDIUM SPEED • MORE BALLOONS');
        } else if (expectedTier === 3) {
          this.announceSpeedUp(3, 'FAST BALLOONS • QUICK COLOR SHIFTS');
        }
      }

      const ceilTime = Math.ceil(this.timeLeft);
      this.timerText.setText(`${ceilTime}s`);

      if (this.timeLeft <= 5.0) {
        this.timerText.setColor('#ef4444');
        if (Math.floor(this.timeLeft) !== Math.floor(this.timeLeft + dt)) {
          SoundService.getInstance().playTick();
          this.tweens.add({
            targets: this.timerText,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 100,
            yoyo: true,
          });
        }
      } else {
        this.timerText.setColor('#38bdf8');
      }
    } else {
      // Endless Rush Clock
      this.survivalTime = this.elapsedGameplayTime;

      const m = Math.floor(this.survivalTime / 60);
      const s = Math.floor(this.survivalTime % 60);
      this.timerText.setText(`${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`);

      // Endless Mode: Keep increasing difficulty every 15 seconds!
      // Tier 1: 0-15s, Tier 2: 15-30s, Tier 3: 30-45s, Tier 4: 45-60s, etc.
      const expectedTier = Math.floor(this.elapsedGameplayTime / 15) + 1;
      if (expectedTier > this.currentDifficultyTier) {
        this.currentDifficultyTier = expectedTier;
        const subtitles: Record<number, string> = {
          2: 'TIER 2 • TEMPO UP',
          3: 'TIER 3 • MORE BALLOONS',
          4: 'TIER 4 • SWIFT FLOW',
          5: 'TIER 5 • HIGH SPEED',
          6: 'TIER 6 • RAPID SHIFT',
          7: 'TIER 7 • HYPER RUSH',
          8: 'TIER 8 • MASTER PACE',
          9: 'MAX DIFFICULTY REACHED',
        };
        const sub = subtitles[expectedTier] || `TIER ${expectedTier} • SPEED UP`;
        this.announceSpeedUp(expectedTier, sub);
      }
    }

    // 2. UPDATE COLOR RUSH SYSTEM
    // Target-color switching becomes faster as difficulty increases
    if (this.mode === 'time_attack') {
      const scaledInterval = Math.max(3.8, 7.2 - difficulty * 3.4); // 7.2s down to 3.8s
      this.colorRushManager.setInterval(scaledInterval);
    } else {
      const scaledInterval = Math.max(3.6, 7.5 - difficulty * 3.9); // 7.5s down to 3.6s
      this.colorRushManager.setInterval(scaledInterval);
    }
    this.colorRushManager.update(dt, time);
    this.updateTargetColorProgress();

    // 3. UPDATE FEVER SYSTEM
    this.feverManager.update(dt);
    this.updateFeverHUD();

    // 4. UPDATE FREEZE TIMER
    if (this.isFreezeActive) {
      this.freezeTimer -= dt;
      if (this.freezeTimer <= 0) {
        this.isFreezeActive = false;
        this.balloons.forEach((b) => b.setFrozen(false));
        this.tweens.add({
          targets: this.freezeOverlay,
          fillAlpha: 0,
          duration: 300,
        });
      }
    }

    // 5. UPDATE COMBO DECAY
    if (this.combo > 1) {
      this.comboTimer -= dt;
      const progress = Math.max(0, this.comboTimer / this.COMBO_WINDOW);

      this.comboGauge.clear();
      this.comboGauge.fillStyle(0xf59e0b, 1);
      this.comboGauge.fillRoundedRect(-60, 10, 120 * progress, 4, 2);

      if (this.comboTimer <= 0) {
        this.breakCombo();
      }
    }

    // 6. ROLLING SCORE
    if (this.displayedScore < this.score) {
      const step = Math.ceil((this.score - this.displayedScore) * 0.15);
      this.displayedScore += step;
      this.scoreText.setText(this.displayedScore.toLocaleString());
    } else if (this.displayedScore > this.score) {
      this.displayedScore = this.score;
      this.scoreText.setText(this.displayedScore.toLocaleString());
    }

    // 7. SPAWN SCHEDULER
    this.spawnTimer += dt;
    const spawnInterval = this.getSpawnInterval();

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      this.spawnBalloon();
    }

    // 8. UPDATE ACTIVE BALLOONS
    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const b = this.balloons[i];
      const alive = b.update(time, delta);
      if (!alive) {
        this.balloons.splice(i, 1);
      }
    }
  }

  private updateFeverHUD(): void {
    const charge = this.feverManager.getCharge();
    const isFever = this.feverManager.isActive();

    this.feverBarFill.clear();

    if (isFever) {
      const progress = this.feverManager.getRemainingTime() / 5.0;
      this.feverBarFill.fillStyle(0xfbbf24, 1);
      this.feverBarFill.fillRoundedRect(-60, -12, 120 * progress, 24, 12);
      this.feverLabel.setText('🔥 FEVER ACTIVE!');
      this.feverLabel.setColor('#0f172a');
    } else {
      this.feverBarFill.fillStyle(0xf43f5e, 0.85);
      this.feverBarFill.fillRoundedRect(-60, -12, 120 * (charge / 100), 24, 12);
      this.feverLabel.setText(`FEVER: ${Math.floor(charge)}%`);
      this.feverLabel.setColor('#ffffff');
    }
  }

  public getDifficultyFactor(): number {
    if (this.mode === 'time_attack') {
      // 0-30s based strictly on elapsed gameplay time:
      // 0-10s: Easy (0.0 -> 0.333)
      // 10-20s: Medium (0.333 -> 0.667)
      // 20-30s: Fast (0.667 -> 1.0)
      return Math.min(1.0, Math.max(0, this.elapsedGameplayTime / 30.0));
    } else {
      // Endless: Smooth progressive scaling every 15s up to 120s with reasonable limit
      return Math.min(1.0, Math.max(0, this.elapsedGameplayTime / 120.0));
    }
  }

  public getSpawnInterval(): number {
    const difficulty = this.getDifficultyFactor();
    if (this.mode === 'time_attack') {
      // 0-10s (d=0 -> 0.33): 0.82s down to 0.67s (easy, slow spawn)
      // 10-20s (d=0.33 -> 0.67): 0.67s down to 0.51s (more balloons)
      // 20-30s (d=0.67 -> 1.0): 0.51s down to 0.36s (fast rush)
      return 0.82 - difficulty * 0.46;
    } else {
      // Endless: scales smoothly every 15s up to 120s with reasonable limit (0.34s)
      return 0.82 - difficulty * 0.48; // 0.82s down to 0.34s
    }
  }

  private announceSpeedUp(_tier?: number, subtitle?: string): void {
    const { width } = this.cameras.main;
    SoundService.getInstance().playCombo(3);

    const badgeY = 175; // Non-blocking position beneath HUD & Gauges
    const banner = this.add.container(width / 2, badgeY).setDepth(150);

    const pillWidth = 270;
    const pillHeight = subtitle ? 50 : 42;

    const bg = this.add.graphics();
    bg.fillStyle(0x0f172a, 0.90);
    bg.fillRoundedRect(-pillWidth / 2, -pillHeight / 2, pillWidth, pillHeight, 22);
    bg.lineStyle(2, 0xf59e0b, 0.95);
    bg.strokeRoundedRect(-pillWidth / 2, -pillHeight / 2, pillWidth, pillHeight, 22);

    const title = this.add.text(0, subtitle ? -8 : 0, '⚡ SPEED UP! ⚡', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: subtitle ? '19px' : '21px',
      fontStyle: 'bold',
      color: '#fef08a',
      stroke: '#0f172a',
      strokeThickness: 3,
    }).setOrigin(0.5);

    banner.add([bg, title]);

    if (subtitle) {
      const sub = this.add.text(0, 13, subtitle, {
        fontFamily: "'Fredoka', sans-serif",
        fontSize: '11px',
        color: '#94a3b8',
        fontStyle: 'bold',
        letterSpacing: 1,
      }).setOrigin(0.5);
      banner.add(sub);
    }

    banner.setScale(0.7);
    banner.setAlpha(0);

    // Subtle scale-up, gentle upward float, and fade out
    this.tweens.add({
      targets: banner,
      scaleX: 1.05,
      scaleY: 1.05,
      alpha: 1,
      y: badgeY - 6,
      duration: 180,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: banner,
          scaleX: 1.0,
          scaleY: 1.0,
          y: badgeY - 22,
          alpha: 0,
          duration: 380,
          delay: 450,
          ease: 'Cubic.easeIn',
          onComplete: () => banner.destroy(),
        });
      },
    });

    const settings = StorageService.getInstance().getSettings();
    if (!settings.reducedMotion) {
      this.cameras.main.shake(90, 0.003);
    }
  }

  private spawnBalloon(): void {
    const { width, height } = this.cameras.main;
    const activeTargetKey = this.colorRushManager.getActiveColorKey();
    const difficulty = this.getDifficultyFactor();

    let type: BalloonType = 'normal';
    let colorKey = activeTargetKey;

    // Difficulty-scaled probabilities for special balloons:
    // Hazards scale up with time (6% -> 22%), rewarding precision
    const hazardChance = 0.06 + difficulty * 0.16;
    const goldenChance = Math.max(0.04, 0.07 - difficulty * 0.02);
    const rainbowChance = Math.max(0.03, 0.05 - difficulty * 0.01);
    const freezeChance = 0.05;

    const roll = Math.random();

    if (roll < goldenChance) {
      type = 'golden';
      this.spawnsSinceTarget++; // Specials act as visual buffers between target colors
    } else if (roll < goldenChance + rainbowChance) {
      type = 'rainbow';
      this.spawnsSinceTarget++;
    } else if (roll < goldenChance + rainbowChance + freezeChance) {
      type = 'freeze';
      this.spawnsSinceTarget++;
    } else if (roll < goldenChance + rainbowChance + freezeChance + hazardChance) {
      type = 'hazard';
      this.spawnsSinceTarget++;
    } else {
      // Normal balloon
      type = 'normal';

      // Anti-grouping algorithm:
      // Target balloons NEVER spawn in a group!
      // Must have at least minDistractorsBetweenTargets (2) non-target spawns between target spawns.
      const distractorColors = ['red', 'blue', 'green', 'yellow', 'purple'].filter(
        (c) => c !== activeTargetKey
      );

      const canSpawnTarget = this.spawnsSinceTarget >= this.minDistractorsBetweenTargets;
      const mustSpawnTarget = this.spawnsSinceTarget >= this.maxDistractorsBetweenTargets;

      if (!canSpawnTarget) {
        // Enforce distractor spawn: strictly pick from OTHER colors
        colorKey = distractorColors[Math.floor(Math.random() * distractorColors.length)];
        this.spawnsSinceTarget++;
      } else if (mustSpawnTarget) {
        // Guaranteed target spawn after enough distractors
        colorKey = activeTargetKey;
        this.spawnsSinceTarget = 0;
      } else {
        // Between min and max: 35% chance of target, 65% chance of distractor
        if (Math.random() < 0.35) {
          colorKey = activeTargetKey;
          this.spawnsSinceTarget = 0;
        } else {
          colorKey = distractorColors[Math.floor(Math.random() * distractorColors.length)];
          this.spawnsSinceTarget++;
        }
      }
    }

    // Dynamic speed scaling with elapsed gameplay time:
    // 0-10s (or 0-15s Endless): slow balloons (~190 px/s)
    // 10-20s (or 15-45s Endless): medium speed (~270 px/s)
    // 20-30s (or 45s+ Endless): fast balloons (~350 - 430 px/s)
    let baseSpeed: number;
    let swayAmp: number;
    let swayFreq: number;

    if (this.mode === 'time_attack') {
      baseSpeed = 190 + difficulty * 240; // 190 px/s early up to 430 px/s in final rush
      swayAmp = 16 + difficulty * 28;     // 16px up to 44px
      swayFreq = 1.2 + difficulty * 1.6;  // 1.2 up to 2.8 rad/s
    } else {
      baseSpeed = 190 + difficulty * 240; // 190 px/s early up to 430 px/s reasonable limit
      swayAmp = 16 + difficulty * 28;     // 16px up to 44px
      swayFreq = 1.2 + difficulty * 1.6;  // 1.2 up to 2.8 rad/s
    }

    // Introduce smaller and faster balloons at higher difficulty levels:
    // Starts appearing when difficulty > 0.25 (after early 10s phase in Time Attack, or after 30s in Endless)
    const smallBalloonChance = Math.max(0, (difficulty - 0.25) * 0.45); // 0% early up to ~34% at max
    const isSmall = Math.random() < smallBalloonChance;
    const balloonScale = isSmall ? Phaser.Math.FloatBetween(0.80, 0.85) : 1.0;
    const speedMultiplier = isSmall ? 1.25 : 1.0; // 25% faster float speed

    const speed = (baseSpeed + Phaser.Math.Between(-15, 20)) * speedMultiplier;
    const swayAmplitude = Phaser.Math.Between(Math.floor(swayAmp * 0.8), Math.floor(swayAmp * 1.2));
    const swayFrequency = Phaser.Math.FloatBetween(swayFreq * 0.85, swayFreq * 1.15);

    // Dynamic horizontal placement:
    // Prevent target balloons from spawning at the same X position as an already-rising target balloon
    let startX = Phaser.Math.Between(80, width - 80);
    if (colorKey === activeTargetKey) {
      const activeTargets = this.balloons.filter((b) => !b.isPopped && b.colorKey === activeTargetKey);
      if (activeTargets.length > 0) {
        const lastTarget = activeTargets[activeTargets.length - 1];
        if (Math.abs(startX - lastTarget.x) < 160) {
          startX = lastTarget.x < width / 2
            ? Phaser.Math.Between(width / 2 + 40, width - 80)
            : Phaser.Math.Between(80, width / 2 - 40);
        }
      }
    }

    const startY = height + 80;

    const balloon = new Balloon(this, {
      type,
      colorKey,
      speed,
      swayAmplitude,
      swayFrequency,
      startX,
      startY,
      scale: balloonScale,
      isSmall,
      scoreValue:
        type === 'golden'
          ? 300
          : type === 'rainbow'
          ? 250
          : type === 'freeze'
          ? 150
          : type === 'hazard'
          ? -200
          : 100,
      onEscape: (b) => this.handleBalloonEscape(b),
    });

    if (this.isFreezeActive) {
      balloon.setFrozen(true);
    }

    this.balloons.push(balloon);
  }

  // --- PARTICLE EMITTERS ---

  private createPopParticles(x: number, y: number, color: number): void {
    const settings = StorageService.getInstance().getSettings();
    const count = settings.reducedMotion ? 6 : 14;

    for (let i = 0; i < count; i++) {
      const p = this.add.sprite(x, y, 'particle_confetti');
      p.setTint(color);
      p.setScale(Phaser.Math.FloatBetween(0.6, 1.1));
      p.setDepth(45);

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.FloatBetween(90, 240);

      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        rotation: Phaser.Math.FloatBetween(-3, 3),
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: Phaser.Math.Between(300, 500),
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  private createGoldSparkles(x: number, y: number): void {
    const settings = StorageService.getInstance().getSettings();
    const count = settings.reducedMotion ? 6 : 16;

    for (let i = 0; i < count; i++) {
      const star = this.add.sprite(x, y, 'particle_star');
      star.setScale(Phaser.Math.FloatBetween(0.7, 1.3));
      star.setDepth(45);

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.FloatBetween(60, 200);

      this.tweens.add({
        targets: star,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        rotation: Phaser.Math.FloatBetween(0, Math.PI * 4),
        alpha: 0,
        duration: Phaser.Math.Between(400, 650),
        ease: 'Back.easeOut',
        onComplete: () => star.destroy(),
      });
    }
  }

  private createRainbowParticles(x: number, y: number): void {
    const colors = [0xf43f5e, 0xfb923c, 0xfacc15, 0x4ade80, 0x38bdf8, 0xa855f7];
    for (let i = 0; i < 18; i++) {
      const p = this.add.sprite(x, y, 'particle_star');
      p.setTint(colors[i % colors.length]);
      p.setScale(Phaser.Math.FloatBetween(0.6, 1.1));
      p.setDepth(45);

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.FloatBetween(70, 220);

      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 500,
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  private createFreezeParticles(x: number, y: number): void {
    for (let i = 0; i < 14; i++) {
      const s = this.add.sprite(x, y, 'particle_snowflake');
      s.setScale(Phaser.Math.FloatBetween(0.8, 1.4));
      s.setDepth(45);

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.FloatBetween(50, 180);

      this.tweens.add({
        targets: s,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        rotation: Phaser.Math.FloatBetween(-2, 2),
        alpha: 0,
        duration: 550,
        ease: 'Quad.easeOut',
        onComplete: () => s.destroy(),
      });
    }
  }

  private createHazardParticles(x: number, y: number): void {
    const settings = StorageService.getInstance().getSettings();
    const count = settings.reducedMotion ? 4 : 12;

    for (let i = 0; i < count; i++) {
      const smoke = this.add.sprite(x, y, 'particle_smoke');
      smoke.setTint(0xef4444);
      smoke.setDepth(45);

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.FloatBetween(40, 140);

      this.tweens.add({
        targets: smoke,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        scaleX: 1.8,
        scaleY: 1.8,
        alpha: 0,
        duration: 400,
        ease: 'Power2',
        onComplete: () => smoke.destroy(),
      });
    }
  }

  private togglePause(): void {
    if (!this.isPlaying || this.isEnding) return;
    this.isPaused = !this.isPaused;
    this.pauseOverlay.setVisible(this.isPaused);
    SoundService.getInstance().playClick();
    if (this.isPaused) {
      this.tweens.pauseAll();
    } else {
      this.tweens.resumeAll();
    }
  }

  private restartGame(): void {
    this.scene.restart({ mode: this.mode });
  }

  private returnToMenu(): void {
    this.scene.start('MenuScene');
  }

  private endGame(): void {
    if (this.isEnding) return;
    this.isEnding = true;
    this.isPlaying = false;
    SoundService.getInstance().playGameOver();

    const storage = StorageService.getInstance();
    let isNewBestScore = false;
    let isNewBestTime = false;
    let highScore = 0;
    let bestSurvivalTime = 0;

    const elapsedSecs = Math.floor(this.elapsedGameplayTime);

    if (this.mode === 'time_attack') {
      isNewBestScore = storage.saveTimeAttackHighScore(this.score);
      highScore = storage.getTimeAttackHighScore();
    } else {
      isNewBestScore = storage.saveEndlessHighScore(this.score);
      isNewBestTime = storage.saveEndlessBestTime(this.survivalTime);
      highScore = storage.getEndlessHighScore();
      bestSurvivalTime = storage.getEndlessBestTime();
    }

    // Automatically submit score to shared Firebase Family Leaderboard on round completion
    LeaderboardService.getInstance()
      .submitScore(this.mode, this.score, elapsedSecs)
      .catch((err) => {
        console.warn('[GameScene] Leaderboard submission error:', err);
      });

    const stats: GameStats = {
      mode: this.mode,
      score: this.score,
      highScore,
      survivalTime: elapsedSecs,
      bestSurvivalTime,
      balloonsPopped: this.totalPopped,
      perfectPops: this.perfectPops,
      goldenPopped: this.goldenPopped,
      hazardsHit: this.hazardsHit,
      maxCombo: this.maxCombo,
      feverActivations: this.feverActivations,
      isNewBestScore,
      isNewBestTime,
    };

    this.balloons.forEach((b) => b.destroy());
    this.balloons = [];

    this.cameras.main.fadeOut(350, 15, 23, 42);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameOverScene', stats);
    });
  }
}
