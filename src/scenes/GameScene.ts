import Phaser from 'phaser';
import { Balloon, BalloonType } from '../entities/Balloon';
import { SoundService } from '../services/SoundService';
import { StorageService } from '../services/StorageService';
import { FloatingText } from '../ui/FloatingText';
import { GameModals } from '../ui/GameModals';

export interface GameStats {
  score: number;
  highScore: number;
  balloonsPopped: number;
  goldenPopped: number;
  hazardsHit: number;
  maxCombo: number;
  isNewBest: boolean;
}

export class GameScene extends Phaser.Scene {
  // Game State
  private score: number = 0;
  private displayedScore: number = 0;
  private timeLeft: number = 30;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private isEnding: boolean = false;
  private isRushModeAnnounced: boolean = false;

  // Combo System
  private combo: number = 1;
  private maxCombo: number = 1;
  private comboTimer: number = 0;
  private readonly COMBO_WINDOW: number = 1.4;

  // Stats Tracking
  private totalPopped: number = 0;
  private goldenPopped: number = 0;
  private hazardsHit: number = 0;

  // Spawning & Difficulty
  private spawnTimer: number = 0;
  private balloons: Balloon[] = [];

  // HUD Elements
  private scoreText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private timerRing!: Phaser.GameObjects.Graphics;
  private comboBadge!: Phaser.GameObjects.Container;
  private comboText!: Phaser.GameObjects.Text;
  private comboGauge!: Phaser.GameObjects.Graphics;
  private pauseOverlay!: Phaser.GameObjects.Container;
  private soundBtnIcon!: Phaser.GameObjects.Sprite;

  constructor() {
    super({ key: 'GameScene' });
  }

  public create(): void {
    const { width, height } = this.cameras.main;

    // Reset game state
    this.score = 0;
    this.displayedScore = 0;
    this.timeLeft = 30;
    this.isPlaying = false;
    this.isPaused = false;
    this.isEnding = false;
    this.isRushModeAnnounced = false;
    this.combo = 1;
    this.maxCombo = 1;
    this.comboTimer = 0;
    this.totalPopped = 0;
    this.goldenPopped = 0;
    this.hazardsHit = 0;
    this.spawnTimer = 0;
    this.balloons = [];

    // --- BACKGROUND ---
    this.createBackground(width, height);

    // --- HUD (TOP BAR) ---
    this.createHUD(width);

    // --- PAUSE OVERLAY ---
    this.createPauseOverlay(width, height);

    // --- INPUT & KEYS ---
    this.setupInput();

    // --- START COUNTDOWN ---
    this.startCountdown(width, height);

    // Fade in
    this.cameras.main.fadeIn(250, 15, 23, 42);

    // Clean up all input listeners and active entities when shutting down
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.removeAllListeners();
      this.input.removeAllListeners();
      this.balloons.forEach((b) => b.destroy());
      this.balloons = [];
    });
  }

  private createBackground(width: number, height: number): void {
    if (this.textures.exists('bg_sky')) {
      const bg = this.add.image(width / 2, height / 2, 'bg_sky');
      const scaleX = width / bg.width;
      const scaleY = height / bg.height;
      bg.setScale(Math.max(scaleX, scaleY));
      bg.setTint(0x7dd3fc);
    } else {
      this.add.rectangle(width / 2, height / 2, width, height, 0x0284c7);
    }

    // Dynamic gradient overlay
    const overlay = this.add.graphics();
    overlay.fillGradientStyle(0x0f172a, 0x0f172a, 0x0284c7, 0x0284c7, 0.45, 0.45, 0.15, 0.15);
    overlay.fillRect(0, 0, width, height);
  }

  private createHUD(width: number): void {
    const hudContainer = this.add.container(0, 0).setDepth(100);

    // Glassmorphic top bar background with hit-blocking to shield HUD area
    const barBg = this.add.graphics();
    barBg.fillStyle(0x0f172a, 0.88);
    barBg.fillRect(0, 0, width, 100);
    barBg.lineStyle(2, 0x334155, 1);
    barBg.strokeLineShape(new Phaser.Geom.Line(0, 100, width, 100));

    // Prevent pointer events on the HUD bar from propagating to gameplay objects
    const hudShield = this.add.zone(width / 2, 50, width, 100);
    hudShield.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, 100), Phaser.Geom.Rectangle.Contains);

    hudContainer.add([barBg, hudShield]);

    // 1. TIMER DISPLAY (Left)
    this.timerRing = this.add.graphics();
    hudContainer.add(this.timerRing);

    const timerLabel = this.add.text(70, 24, 'TIME', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '13px',
      color: '#94a3b8',
      fontStyle: 'bold',
      letterSpacing: 1,
    }).setOrigin(0.5);

    this.timerText = this.add.text(70, 56, '30s', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#38bdf8',
    }).setOrigin(0.5);

    hudContainer.add([timerLabel, this.timerText]);

    // 2. SCORE DISPLAY (Center)
    const scoreBox = this.add.container(width / 2, 50);
    const scoreLabel = this.add.text(0, -26, 'SCORE', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '13px',
      color: '#94a3b8',
      fontStyle: 'bold',
      letterSpacing: 1,
    }).setOrigin(0.5);

    this.scoreText = this.add.text(0, 6, '0', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '40px',
      fontStyle: 'bold',
      color: '#f8fafc',
    }).setOrigin(0.5);

    scoreBox.add([scoreLabel, this.scoreText]);
    hudContainer.add(scoreBox);

    // 3. TOP ACTION BUTTONS (Right)
    const soundService = SoundService.getInstance();

    // Sound Toggle (44x44, center in normalized space is 22, 22)
    const soundBtn = this.add.container(width - 45, 50);
    const soundBg = this.add.circle(0, 0, 22, 0x1e293b, 0.9);
    soundBg.setStrokeStyle(2, 0x64748b);
    this.soundBtnIcon = this.add.sprite(0, 0, soundService.isSoundEnabled() ? 'icon_sound_on' : 'icon_sound_off').setScale(0.7);

    soundBtn.add([soundBg, this.soundBtnIcon]);
    soundBtn.setSize(44, 44);
    soundBtn.setInteractive(new Phaser.Geom.Circle(22, 22, 22), Phaser.Geom.Circle.Contains);
    if (soundBtn.input) {
      soundBtn.input.cursor = 'pointer';
    }

    soundBtn.on('pointerdown', () => {
      const enabled = soundService.toggleSound();
      this.soundBtnIcon.setTexture(enabled ? 'icon_sound_on' : 'icon_sound_off');
    });

    // Pause Button (44x44, center in normalized space is 22, 22)
    const pauseBtn = this.add.container(width - 100, 50);
    const pauseBg = this.add.circle(0, 0, 22, 0x1e293b, 0.9);
    pauseBg.setStrokeStyle(2, 0x64748b);
    const pauseIcon = this.add.sprite(0, 0, 'icon_pause').setScale(0.7);

    pauseBtn.add([pauseBg, pauseIcon]);
    pauseBtn.setSize(44, 44);
    pauseBtn.setInteractive(new Phaser.Geom.Circle(22, 22, 22), Phaser.Geom.Circle.Contains);
    if (pauseBtn.input) {
      pauseBtn.input.cursor = 'pointer';
    }

    pauseBtn.on('pointerdown', () => {
      this.togglePause();
    });

    hudContainer.add([soundBtn, pauseBtn]);

    // 4. COMBO BADGE & DECAY METER (Floating under score)
    this.comboBadge = this.add.container(width / 2, 130).setDepth(100);

    const comboBg = this.add.graphics();
    comboBg.fillStyle(0x1e1b4b, 0.9);
    comboBg.fillRoundedRect(-75, -20, 150, 40, 20);
    comboBg.lineStyle(2, 0xf59e0b, 1);
    comboBg.strokeRoundedRect(-75, -20, 150, 40, 20);

    this.comboText = this.add.text(0, -2, 'COMBO x1', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#fef08a',
    }).setOrigin(0.5);

    this.comboGauge = this.add.graphics();

    this.comboBadge.add([comboBg, this.comboGauge, this.comboText]);
    this.comboBadge.setAlpha(0);
  }

  private createPauseOverlay(width: number, height: number): void {
    this.pauseOverlay = this.add.container(0, 0).setDepth(300).setVisible(false);

    // Dim backdrop - blocks game clicks
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x0f172a, 0.88);
    bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    this.pauseOverlay.add(bg);

    // Card
    const cardWidth = Math.min(width * 0.85, 460);
    const cardHeight = 440;
    const card = this.add.graphics();
    card.fillStyle(0x1e1b4b, 0.98);
    card.lineStyle(4, 0x6366f1, 1);
    card.fillRoundedRect(width / 2 - cardWidth / 2, height / 2 - cardHeight / 2, cardWidth, cardHeight, 24);
    card.strokeRoundedRect(width / 2 - cardWidth / 2, height / 2 - cardHeight / 2, cardWidth, cardHeight, 24);
    this.pauseOverlay.add(card);

    // Title
    const title = this.add.text(width / 2, height / 2 - cardHeight / 2 + 55, 'GAME PAUSED', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#38bdf8',
    }).setOrigin(0.5);
    this.pauseOverlay.add(title);

    // Buttons: Resume, Restart, Settings, Quit
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

      // HitArea matches normalized container coordinates
      btn.setInteractive(new Phaser.Geom.Rectangle(0, 0, 220, 48), Phaser.Geom.Rectangle.Contains);
      if (btn.input) {
        btn.input.cursor = 'pointer';
      }

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
    const countSeq = ['3', '2', '1', 'POP!'];
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
        return;
      }

      const val = countSeq[step];
      countText.setText(val);
      countText.setScale(0.3);
      countText.setAlpha(1);

      sound.playCountdown(val === 'POP!');

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
    // Keyboard shortcuts
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.code === 'KeyP' || event.code === 'Escape') {
        this.togglePause();
      }
    });

    // Tap/Click handling on balloons
    this.input.on('gameobjectdown', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      if (pointer.button !== 0 && pointer.button !== undefined) return;
      if (!this.isPlaying || this.isPaused || this.isEnding) return;
      if (gameObject instanceof Balloon) {
        this.handleBalloonPop(gameObject);
      }
    });
  }

  private handleBalloonPop(balloon: Balloon): void {
    if (balloon.isPopped) return;
    // Trigger pop destruction & animation immediately (sets isPopped = true and disables interactivity)
    balloon.pop();

    const sound = SoundService.getInstance();
    const settings = StorageService.getInstance().getSettings();

    const bx = balloon.x;
    const by = balloon.y;
    const type = balloon.balloonType;

    if (type === 'normal') {
      this.totalPopped++;
      this.refreshCombo();

      const earned = balloon.scoreValue * this.combo;
      this.addScore(earned);

      sound.playPop(this.combo);
      this.createPopParticles(bx, by, 0xec4899);

      FloatingText.show(
        this,
        bx,
        by,
        `+${earned}${this.combo > 1 ? ` (x${this.combo})` : ''}`,
        '#fbcfe8',
        this.combo >= 3 ? '32px' : '26px'
      );

      if (this.combo >= 4 && !settings.reducedMotion) {
        this.cameras.main.shake(120, 0.005);
      }
    } else if (type === 'golden') {
      this.totalPopped++;
      this.goldenPopped++;
      this.refreshCombo();

      const earned = balloon.scoreValue * this.combo;
      this.addScore(earned);
      this.addTime(2);

      sound.playGold();
      this.createGoldSparkles(bx, by);

      FloatingText.show(this, bx, by, `+${earned} & +2s!`, '#fef08a', '32px');

      if (!settings.reducedMotion) {
        this.cameras.main.shake(150, 0.008);
      }
    } else if (type === 'hazard') {
      this.hazardsHit++;
      this.breakCombo();

      this.deductScore(200);
      this.deductTime(3);

      sound.playHazard();
      this.createHazardParticles(bx, by);

      FloatingText.show(this, bx, by, '-200 & -3s!', '#ef4444', '32px');

      if (!settings.reducedMotion) {
        this.cameras.main.shake(250, 0.018);
        this.cameras.main.flash(200, 239, 68, 68);
      }
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
    this.timerText.setText(`${Math.ceil(this.timeLeft)}s`);

    this.tweens.add({
      targets: this.timerText,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 120,
      yoyo: true,
    });
  }

  private deductTime(seconds: number): void {
    this.timeLeft = Math.max(0, this.timeLeft - seconds);
    this.timerText.setText(`${Math.ceil(this.timeLeft)}s`);
  }

  public update(time: number, delta: number): void {
    if (!this.isPlaying || this.isPaused || this.isEnding) return;

    const dt = delta / 1000;

    // 1. UPDATE TIMER
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.endGame();
      return;
    }

    const ceilTime = Math.ceil(this.timeLeft);
    this.timerText.setText(`${ceilTime}s`);

    // Warning state when time is low (< 6s)
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

    // 2. UPDATE COMBO DECAY
    if (this.combo > 1) {
      this.comboTimer -= dt;
      const progress = Math.max(0, this.comboTimer / this.COMBO_WINDOW);

      this.comboGauge.clear();
      this.comboGauge.fillStyle(0xf59e0b, 1);
      this.comboGauge.fillRoundedRect(-70, 12, 140 * progress, 5, 2);

      if (this.comboTimer <= 0) {
        this.breakCombo();
      }
    }

    // 3. SMOOTH SCORE ROLLING
    if (this.displayedScore < this.score) {
      const step = Math.ceil((this.score - this.displayedScore) * 0.15);
      this.displayedScore += step;
      this.scoreText.setText(this.displayedScore.toLocaleString());
    } else if (this.displayedScore > this.score) {
      this.displayedScore = this.score;
      this.scoreText.setText(this.displayedScore.toLocaleString());
    }

    // 4. ANNOUNCE RUSH MODE AT FINAL 10 SECONDS
    if (this.timeLeft <= 10 && !this.isRushModeAnnounced) {
      this.isRushModeAnnounced = true;
      this.announceRushMode();
    }

    // 5. BALLOON SPAWN SCHEDULER
    this.spawnTimer += dt;
    const spawnInterval = this.getSpawnInterval();

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      this.spawnBalloon();
    }

    // 6. UPDATE BALLOONS
    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const b = this.balloons[i];
      const alive = b.update(time, delta);
      if (!alive) {
        this.balloons.splice(i, 1);
      }
    }
  }

  private getSpawnInterval(): number {
    if (this.timeLeft > 20) return 0.8;
    if (this.timeLeft > 10) return 0.6;
    return 0.42;
  }

  private announceRushMode(): void {
    const { width, height } = this.cameras.main;
    const banner = this.add.text(width / 2, height * 0.4, '⚡ RUSH MODE! ⚡', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '48px',
      fontStyle: 'bold',
      color: '#fef08a',
      stroke: '#b45309',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(150);

    SoundService.getInstance().playCombo(4);

    this.tweens.add({
      targets: banner,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 350,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        banner.destroy();
      },
    });
  }

  private spawnBalloon(): void {
    const { width, height } = this.cameras.main;

    let type: BalloonType = 'normal';
    const roll = Math.random();

    if (this.timeLeft > 20) {
      type = roll < 0.12 ? 'golden' : 'normal';
    } else if (this.timeLeft > 10) {
      if (roll < 0.1) type = 'hazard';
      else if (roll < 0.25) type = 'golden';
      else type = 'normal';
    } else {
      if (roll < 0.15) type = 'hazard';
      else if (roll < 0.35) type = 'golden';
      else type = 'normal';
    }

    const colors = ['red', 'blue', 'green', 'pink', 'purple'];
    const colorKey = colors[Math.floor(Math.random() * colors.length)];

    let baseSpeed = 230;
    if (this.timeLeft <= 20) baseSpeed = 290;
    if (this.timeLeft <= 10) baseSpeed = 360;
    const speed = baseSpeed + Phaser.Math.Between(-30, 40);

    // Balloons spawn below the canvas and rise within the boundaries
    const startX = Phaser.Math.Between(75, width - 75);
    const startY = height + 80;

    const balloon = new Balloon(this, {
      type,
      colorKey,
      speed,
      swayAmplitude: Phaser.Math.Between(25, 45),
      swayFrequency: Phaser.Math.FloatBetween(1.8, 2.6),
      startX,
      startY,
      scoreValue: type === 'golden' ? 300 : type === 'hazard' ? -200 : 100,
    });

    this.balloons.push(balloon);
  }

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
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      this.tweens.add({
        targets: p,
        x: x + vx,
        y: y + vy,
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
  }

  private restartGame(): void {
    this.scene.restart();
  }

  private returnToMenu(): void {
    this.scene.start('MenuScene');
  }

  private endGame(): void {
    if (this.isEnding) return;
    this.isEnding = true;
    this.isPlaying = false;
    SoundService.getInstance().playGameOver();

    // Persist score
    const storage = StorageService.getInstance();
    const isNewBest = storage.saveHighScore(this.score);
    const highScore = storage.getHighScore();

    const stats: GameStats = {
      score: this.score,
      highScore,
      balloonsPopped: this.totalPopped,
      goldenPopped: this.goldenPopped,
      hazardsHit: this.hazardsHit,
      maxCombo: this.maxCombo,
      isNewBest,
    };

    // Clean remaining balloons
    this.balloons.forEach((b) => b.destroy());
    this.balloons = [];

    // Fade to GameOverScene
    this.cameras.main.fadeOut(350, 15, 23, 42);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameOverScene', stats);
    });
  }
}
