import Phaser from 'phaser';
import { GameStats } from './GameScene';
import { SoundService } from '../services/SoundService';
import { StorageService, BACKGROUND_THEMES } from '../services/StorageService';
import { GameModals } from '../ui/GameModals';

export class GameOverScene extends Phaser.Scene {
  public stats!: GameStats;
  private isActionTriggered: boolean = false;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  public init(data: GameStats): void {
    this.stats = data;
    this.isActionTriggered = false;
  }

  public create(): void {
    const { width, height } = this.cameras.main;
    this.isActionTriggered = false;

    // --- BACKGROUND ---
    this.createBackground(width, height);

    // --- CELEBRATION PARTICLES IF NEW BEST ---
    if (this.stats.isNewBestScore || this.stats.isNewBestTime) {
      this.createConfettiShower(width, height);
    }

    // --- TITLE ---
    this.createTitle(width, height);

    // --- STATS SUMMARY CARD ---
    this.createStatsCard(width, height);

    // --- ACTION BUTTONS ---
    this.createActionButtons(width, height);

    // --- KEYBOARD SHORTCUTS ---
    this.setupKeyboard();

    // Fade in
    this.cameras.main.fadeIn(300, 15, 23, 42);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.removeAllListeners();
      this.input.removeAllListeners();
    });
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
      bg.setTint(0x64748b);
    } else if (this.textures.exists('bg_sky')) {
      const bg = this.add.image(width / 2, height / 2, 'bg_sky');
      const scaleX = width / bg.width;
      const scaleY = height / bg.height;
      bg.setScale(Math.max(scaleX, scaleY));
      bg.setTint(0x475569);
    } else {
      this.add.rectangle(width / 2, height / 2, width, height, 0x0f172a);
    }

    const overlay = this.add.graphics();
    overlay.fillGradientStyle(0x0f172a, 0x0f172a, theme.overlayColor, theme.overlayColor, 0.75, 0.75, 0.9, 0.9);
    overlay.fillRect(0, 0, width, height);
  }

  private createConfettiShower(width: number, _height: number): void {
    const colors = [0xf43f5e, 0xf59e0b, 0x10b981, 0x38bdf8, 0xa855f7];
    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(20, width - 20);
      const y = Phaser.Math.Between(-80, -20);
      const p = this.add.sprite(x, y, 'particle_confetti');
      p.setTint(colors[i % colors.length]);
      p.setScale(Phaser.Math.FloatBetween(0.8, 1.4));
      p.setDepth(50);

      this.tweens.add({
        targets: p,
        y: Phaser.Math.Between(700, 1100),
        x: `+=${Phaser.Math.Between(-100, 100)}`,
        rotation: Phaser.Math.FloatBetween(-6, 6),
        duration: Phaser.Math.Between(2500, 4500),
        delay: Phaser.Math.Between(0, 1800),
        repeat: -1,
      });
    }
  }

  private createTitle(width: number, height: number): void {
    const titleContainer = this.add.container(width / 2, height * 0.14).setDepth(10);

    // Mode Tag
    const modeConfig: Record<string, { label: string; color: number; title: string }> = {
      time_attack: { label: '⏱️ TIME ATTACK', color: 0xf43f5e, title: "TIME'S UP!" },
      endless: { label: '❤️ ENDLESS RUSH', color: 0x0284c7, title: 'GAME OVER!' },
      color_chaos: { label: '🌈 COLOR CHAOS', color: 0xa855f7, title: 'CHAOS OVER!' },
      one_life: { label: '💀 ONE LIFE', color: 0xef4444, title: 'SURVIVAL FAILED!' },
    };
    const currentModeInfo = modeConfig[this.stats.mode] || modeConfig.time_attack;

    const tagBg = this.add.graphics();
    tagBg.fillStyle(currentModeInfo.color, 0.9);
    tagBg.fillRoundedRect(-95, -42, 190, 28, 14);

    const tagText = this.add.text(0, -28, currentModeInfo.label, {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    const mainTitle = this.add.text(0, 8, currentModeInfo.title, {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '60px',
      fontStyle: 'bold',
      color: '#f43f5e',
      stroke: '#0f172a',
      strokeThickness: 10,
    }).setOrigin(0.5);

    titleContainer.add([tagBg, tagText, mainTitle]);

    const hasBeaten = !!this.stats.postGameSummary?.championBeaten;

    if (hasBeaten || this.stats.isNewBestScore || this.stats.isNewBestTime) {
      const bestBadge = this.add.container(0, 58);
      const bg = this.add.graphics();
      bg.fillStyle(hasBeaten ? 0x10b981 : 0xf59e0b, 1);
      bg.fillRoundedRect(-145, -18, 290, 36, 18);

      const label = hasBeaten
        ? '👑 CHAMPION BEATEN! 👑'
        : this.stats.isNewBestScore
        ? '🏆 NEW BEST SCORE! 🏆'
        : '⏱️ NEW BEST TIME! ⏱️';

      const txt = this.add.text(0, 0, label, {
        fontFamily: "'Fredoka', sans-serif",
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#0f172a',
      }).setOrigin(0.5);

      bestBadge.add([bg, txt]);
      titleContainer.add(bestBadge);

      this.tweens.add({
        targets: bestBadge,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 600,
        yoyo: true,
        repeat: -1,
      });
    }

    titleContainer.setScale(0.5);
    this.tweens.add({
      targets: titleContainer,
      scaleX: 1,
      scaleY: 1,
      duration: 380,
      ease: 'Back.easeOut',
    });
  }

  private createStatsCard(width: number, height: number): void {
    const cardY = height * 0.48;
    const cardWidth = Math.min(width * 0.88, 520);
    const cardHeight = 410;

    const card = this.add.container(width / 2, cardY).setDepth(10);

    const bg = this.add.graphics();
    bg.fillStyle(0x1e1b4b, 0.95);
    bg.lineStyle(3, 0x6366f1, 1);
    bg.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 22);
    bg.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 22);
    card.add(bg);

    const scoreLabel = this.add.text(0, -cardHeight / 2 + 38, 'FINAL SCORE', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#94a3b8',
      letterSpacing: 1,
    }).setOrigin(0.5);

    const scoreVal = this.add.text(0, -cardHeight / 2 + 78, '0', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '48px',
      fontStyle: 'bold',
      color: '#38bdf8',
    }).setOrigin(0.5);

    card.add([scoreLabel, scoreVal]);

    const targetScore = this.stats.score;
    let currentCount = 0;
    this.tweens.addCounter({
      from: 0,
      to: targetScore,
      duration: 900,
      ease: 'Cubic.easeOut',
      onUpdate: (tween) => {
        currentCount = Math.floor(tween.getValue() as number);
        scoreVal.setText(currentCount.toLocaleString());
      },
    });

    const div = this.add.graphics();
    div.lineStyle(2, 0x334155, 1);
    div.strokeLineShape(new Phaser.Geom.Line(-cardWidth / 2 + 30, -cardHeight / 2 + 120, cardWidth / 2 - 30, -cardHeight / 2 + 120));
    card.add(div);

    const formatTime = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // Rows tailored by mode & Beat the Champion
    let rows: { label: string; value: string; color: string }[] = [];
    const summary = this.stats.postGameSummary;

    if (this.stats.mode === 'time_attack') {
      rows = [
        { label: 'Balloons Popped', value: `${this.stats.balloonsPopped}`, color: '#fbcfe8' },
        { label: 'Perfect Pops (Bullseye)', value: `${this.stats.perfectPops}`, color: '#fef08a' },
        { label: 'Golden Balloons (+2s)', value: `${this.stats.goldenPopped}`, color: '#fef08a' },
        { label: 'Max Combo Streak', value: `${this.stats.maxCombo}x`, color: '#fbbf24' },
        { label: 'Fever Modes Triggered', value: `${this.stats.feverActivations}`, color: '#f43f5e' },
      ];
    } else if (this.stats.mode === 'color_chaos') {
      rows = [
        { label: 'Balloons Popped', value: `${this.stats.balloonsPopped}`, color: '#fbcfe8' },
        { label: 'Perfect Pops (Bullseye)', value: `${this.stats.perfectPops}`, color: '#fef08a' },
        { label: 'Golden Balloons (+2s)', value: `${this.stats.goldenPopped}`, color: '#fef08a' },
        { label: 'Max Combo Streak', value: `${this.stats.maxCombo}x`, color: '#fbbf24' },
        { label: 'Fever Modes Triggered', value: `${this.stats.feverActivations}`, color: '#c084fc' },
      ];
    } else if (this.stats.mode === 'one_life') {
      rows = [
        { label: 'Survival Time', value: formatTime(this.stats.survivalTime), color: '#fb7185' },
        { label: 'Best Survival Time', value: formatTime(this.stats.bestSurvivalTime), color: '#a7f3d0' },
        { label: 'Balloons Popped', value: `${this.stats.balloonsPopped}`, color: '#fbcfe8' },
        { label: 'Max Combo Streak', value: `${this.stats.maxCombo}x`, color: '#fbbf24' },
      ];
    } else {
      // Endless Rush
      rows = [
        { label: 'Survival Time', value: formatTime(this.stats.survivalTime), color: '#38bdf8' },
        { label: 'Best Survival Time', value: formatTime(this.stats.bestSurvivalTime), color: '#a7f3d0' },
        { label: 'Balloons Popped', value: `${this.stats.balloonsPopped}`, color: '#fbcfe8' },
        { label: 'Max Combo Streak', value: `${this.stats.maxCombo}x`, color: '#fbbf24' },
      ];
    }

    // Beat the Champion Rank & Next Opponent
    if (summary) {
      if (summary.updatedRank) {
        const rankDisplay =
          summary.previousRank && summary.previousRank !== summary.updatedRank
            ? `#${summary.previousRank} ➔ #${summary.updatedRank} 🚀`
            : `#${summary.updatedRank}`;
        rows.push({
          label: 'Leaderboard Rank',
          value: rankDisplay,
          color: '#fef08a',
        });
      }
      if (summary.nextOpponentNickname && summary.nextOpponentScore) {
        rows.push({
          label: 'Next Target',
          value: `${summary.nextOpponentNickname} (${summary.nextOpponentScore.toLocaleString()})`,
          color: '#38bdf8',
        });
      } else if (summary.isCurrentLeader) {
        rows.push({
          label: 'Family Champion',
          value: '👑 #1 Defended!',
          color: '#fef08a',
        });
      }
    }

    rows.push({
      label: 'Personal Best Score',
      value: `${this.stats.highScore.toLocaleString()}`,
      color: '#e2e8f0',
    });

    rows.forEach((row, idx) => {
      const rowY = -cardHeight / 2 + 144 + idx * 31;

      const lbl = this.add.text(-cardWidth / 2 + 35, rowY, row.label, {
        fontFamily: "'Fredoka', sans-serif",
        fontSize: '16px',
        color: '#cbd5e1',
      }).setOrigin(0, 0.5);

      const val = this.add.text(cardWidth / 2 - 35, rowY, row.value, {
        fontFamily: "'Fredoka', sans-serif",
        fontSize: '18px',
        fontStyle: 'bold',
        color: row.color,
      }).setOrigin(1, 0.5);

      card.add([lbl, val]);
    });
  }

  private createActionButtons(width: number, height: number): void {
    const btnY = height * 0.77;
    const spacing = 66;

    // 1. PLAY AGAIN (Instant Retry of the same mode)
    const retryBtn = this.createArcadeButton(
      width / 2,
      btnY,
      'PLAY AGAIN',
      0x10b981,
      0x059669,
      () => this.retryGame(),
      true
    );

    // 2. FAMILY LEADERBOARD
    const leaderboardBtn = this.createArcadeButton(
      width / 2,
      btnY + spacing,
      '🏆 LEADERBOARD',
      0xf59e0b,
      0xb45309,
      () => this.openLeaderboard()
    );

    // 3. MAIN MENU (Returns to Mode Selection)
    const menuBtn = this.createArcadeButton(
      width / 2,
      btnY + spacing * 2,
      'MAIN MENU',
      0x6366f1,
      0x4f46e5,
      () => this.returnToMenu()
    );

    this.add.existing(retryBtn);
    this.add.existing(leaderboardBtn);
    this.add.existing(menuBtn);
  }

  public openLeaderboard(): void {
    SoundService.getInstance().playClick();
    GameModals.showLeaderboard(this, {
      initialMode: this.stats.mode,
      fromGameOver: true,
      onPlayAgain: (m) => this.scene.start('GameScene', { mode: m }),
      onBackToMenu: () => this.returnToMenu(),
    });
  }

  private createArcadeButton(
    x: number,
    y: number,
    text: string,
    primaryColor: number,
    darkColor: number,
    onClick: () => void,
    isProminent: boolean = false
  ): Phaser.GameObjects.Container {
    const btnWidth = isProminent ? 280 : 250;
    const btnHeight = isProminent ? 64 : 54;
    const container = this.add.container(x, y).setDepth(10);

    const base = this.add.graphics();
    base.fillStyle(darkColor, 1);
    base.fillRoundedRect(-btnWidth / 2, -btnHeight / 2 + 5, btnWidth, btnHeight, 18);

    const face = this.add.graphics();
    face.fillStyle(primaryColor, 1);
    face.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 18);

    const label = this.add.text(0, -2, text, {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: isProminent ? '26px' : '20px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    container.add([base, face, label]);
    container.setSize(btnWidth, btnHeight);
    container.setInteractive(new Phaser.Geom.Rectangle(0, 0, btnWidth, btnHeight), Phaser.Geom.Rectangle.Contains);
    if (container.input) {
      container.input.cursor = 'pointer';
    }

    let isClicked = false;

    container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0 && pointer.button !== undefined) return;
      if (isClicked) return;
      isClicked = true;

      this.tweens.killTweensOf(container);
      SoundService.getInstance().playClick();

      this.tweens.add({
        targets: container,
        scaleX: 0.94,
        scaleY: 0.94,
        duration: 70,
        yoyo: true,
        onComplete: () => {
          onClick();
        },
      });
    });

    container.on('pointerover', () => {
      if (!isClicked) {
        this.tweens.add({ targets: container, scaleX: 1.05, scaleY: 1.05, duration: 120 });
      }
    });

    container.on('pointerout', () => {
      if (!isClicked) {
        this.tweens.add({ targets: container, scaleX: 1.0, scaleY: 1.0, duration: 120 });
      }
    });

    return container;
  }

  private setupKeyboard(): void {
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.code === 'Enter') {
        this.retryGame();
      } else if (event.code === 'Escape') {
        this.returnToMenu();
      } else if (event.key === 'l' || event.key === 'L') {
        this.openLeaderboard();
      }
    });
  }

  public retryGame(): void {
    if (this.isActionTriggered) return;
    this.isActionTriggered = true;
    SoundService.getInstance().playClick();
    let transitioned = false;
    const doTransition = () => {
      if (transitioned) return;
      transitioned = true;
      this.scene.start('GameScene', { mode: this.stats.mode });
    };
    this.cameras.main.fadeOut(200, 15, 23, 42);
    this.cameras.main.once('camerafadeoutcomplete', doTransition);
    this.time.delayedCall(250, doTransition);
  }

  public returnToMenu(): void {
    if (this.isActionTriggered) return;
    this.isActionTriggered = true;
    SoundService.getInstance().playClick();
    let transitioned = false;
    const doTransition = () => {
      if (transitioned) return;
      transitioned = true;
      this.scene.start('MenuScene');
    };
    this.cameras.main.fadeOut(200, 15, 23, 42);
    this.cameras.main.once('camerafadeoutcomplete', doTransition);
    this.time.delayedCall(250, doTransition);
  }
}
