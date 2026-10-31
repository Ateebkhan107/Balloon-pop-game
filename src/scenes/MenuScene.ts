import Phaser from 'phaser';
import { StorageService, BACKGROUND_THEMES, BackgroundThemeId } from '../services/StorageService';
import { SoundService } from '../services/SoundService';
import { GameModals } from '../ui/GameModals';
import { LeaderboardService, GameModeKey } from '../services/LeaderboardService';
import { ChampionTracker } from '../services/ChampionTracker';

export class MenuScene extends Phaser.Scene {
  private ambientBalloons: Phaser.GameObjects.Sprite[] = [];
  private soundBtnIcon!: Phaser.GameObjects.Sprite;
  private selectedButtonIndex: number = 0;
  private modeButtons: Phaser.GameObjects.Container[] = [];
  private isStartingGame: boolean = false;
  private playerPillText?: Phaser.GameObjects.Text;
  private bgImage?: Phaser.GameObjects.Image;

  constructor() {
    super({ key: 'MenuScene' });
  }

  public create(): void {
    const { width, height } = this.cameras.main;
    this.modeButtons = [];
    this.ambientBalloons = [];
    this.isStartingGame = false;

    // --- BACKGROUND ---
    this.createBackground(width, height);

    // --- AMBIENT FLOATING BALLOONS ---
    this.createAmbientBalloons(width, height);

    // --- TOP BAR: SOUND & FULLSCREEN TOGGLE ---
    this.createTopControls(width);

    // --- LOGO & TITLE ---
    this.createTitle(width, height);

    // --- TWO PROMINENT GAME MODE SELECTION CARDS ---
    this.createModeCards(width, height);

    // --- SHARED FAMILY LEADERBOARD BUTTON ---
    this.createLeaderboardButton(width, height);

    // --- BOTTOM NAVIGATION BUTTONS (HOW TO PLAY & SETTINGS) ---
    this.createSecondaryButtons(width, height);

    // --- KEYBOARD CONTROLS ---
    this.setupKeyboard();

    // Check first-time visitor: wait for auth, restore profile, or prompt if new
    this.checkFirstTimeVisitor();

    // Scene transition fade in
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
      this.bgImage = this.add.image(width / 2, height / 2, theme.textureKey);
      const scaleX = width / this.bgImage.width;
      const scaleY = height / this.bgImage.height;
      this.bgImage.setScale(Math.max(scaleX, scaleY));
    } else if (this.textures.exists('bg_sky')) {
      this.bgImage = this.add.image(width / 2, height / 2, 'bg_sky');
      const scaleX = width / this.bgImage.width;
      const scaleY = height / this.bgImage.height;
      this.bgImage.setScale(Math.max(scaleX, scaleY));
      this.bgImage.setTint(0x94a3b8);
    } else {
      const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x1e1b4b);
      bg.setOrigin(0.5);
    }

    const overlay = this.add.graphics();
    overlay.fillGradientStyle(0x0f172a, 0x0f172a, theme.overlayColor, theme.overlayColor, 0.55, 0.55, theme.overlayAlpha + 0.35, theme.overlayAlpha + 0.35);
    overlay.fillRect(0, 0, width, height);
  }

  public updateBackgroundTheme(themeId: BackgroundThemeId): void {
    const theme = BACKGROUND_THEMES[themeId];
    if (this.bgImage && theme && this.textures.exists(theme.textureKey)) {
      this.bgImage.setTexture(theme.textureKey);
      const { width, height } = this.cameras.main;
      const scaleX = width / this.bgImage.width;
      const scaleY = height / this.bgImage.height;
      this.bgImage.setScale(Math.max(scaleX, scaleY));
    }
  }

  private createAmbientBalloons(width: number, height: number): void {
    const textures = ['balloon_red', 'balloon_blue', 'balloon_green', 'balloon_yellow', 'balloon_purple', 'balloon_golden'];
    for (let i = 0; i < 6; i++) {
      const tex = textures[i % textures.length];
      const x = Phaser.Math.Between(40, width - 40);
      const y = Phaser.Math.Between(height, height + 500);
      const balloon = this.add.sprite(x, y, tex);
      balloon.setScale(Phaser.Math.FloatBetween(0.35, 0.6));
      balloon.setAlpha(0.35);
      balloon.setDepth(1);
      this.ambientBalloons.push(balloon);

      const duration = Phaser.Math.Between(6000, 11000);
      this.tweens.add({
        targets: balloon,
        y: -120,
        x: `+=${Phaser.Math.Between(-60, 60)}`,
        duration,
        repeat: -1,
        delay: Phaser.Math.Between(0, 4000),
        onRepeat: () => {
          balloon.y = height + 100;
          balloon.x = Phaser.Math.Between(40, width - 40);
        },
      });
    }
  }

  private createTopControls(width: number): void {
    const soundService = SoundService.getInstance();

    // Sound toggle button (48x48)
    const soundBtn = this.add.container(width - 55, 55).setDepth(20);
    const soundBg = this.add.circle(0, 0, 24, 0x1e1b4b, 0.85);
    soundBg.setStrokeStyle(2, 0x6366f1);
    this.soundBtnIcon = this.add.sprite(0, 0, soundService.isSoundEnabled() ? 'icon_sound_on' : 'icon_sound_off').setScale(0.75);

    soundBtn.add([soundBg, this.soundBtnIcon]);
    soundBtn.setSize(48, 48);
    soundBtn.setInteractive(new Phaser.Geom.Circle(24, 24, 24), Phaser.Geom.Circle.Contains);
    if (soundBtn.input) {
      soundBtn.input.cursor = 'pointer';
    }

    soundBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0 && pointer.button !== undefined) return;
      const enabled = soundService.toggleSound();
      this.soundBtnIcon.setTexture(enabled ? 'icon_sound_on' : 'icon_sound_off');
    });

    // Fullscreen toggle button (48x48)
    const fsBtn = this.add.container(width - 115, 55).setDepth(20);
    const fsBg = this.add.circle(0, 0, 24, 0x1e1b4b, 0.85);
    fsBg.setStrokeStyle(2, 0x6366f1);
    const fsText = this.add.text(0, 0, '⛶', {
      fontSize: '22px',
      color: '#ffffff',
    }).setOrigin(0.5);

    fsBtn.add([fsBg, fsText]);
    fsBtn.setSize(48, 48);
    fsBtn.setInteractive(new Phaser.Geom.Circle(24, 24, 24), Phaser.Geom.Circle.Contains);
    if (fsBtn.input) {
      fsBtn.input.cursor = 'pointer';
    }

    fsBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0 && pointer.button !== undefined) return;
      soundService.playClick();
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      } else {
        this.scale.startFullscreen();
      }
    });

    // Theme selector button (48x48)
    const themeBtn = this.add.container(width - 175, 55).setDepth(20);
    const themeBg = this.add.circle(0, 0, 24, 0x1e1b4b, 0.85);
    themeBg.setStrokeStyle(2, 0xa855f7);
    const themeIcon = this.add.text(0, 0, '🎨', {
      fontSize: '22px',
    }).setOrigin(0.5);

    themeBtn.add([themeBg, themeIcon]);
    themeBtn.setSize(48, 48);
    themeBtn.setInteractive(new Phaser.Geom.Circle(24, 24, 24), Phaser.Geom.Circle.Contains);
    if (themeBtn.input) {
      themeBtn.input.cursor = 'pointer';
    }

    themeBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0 && pointer.button !== undefined) return;
      soundService.playClick();
      GameModals.showThemeSelector(this, (newTheme) => {
        this.updateBackgroundTheme(newTheme);
      });
    });

    // Player Nickname Pill (top-left)
    const playerPill = this.add.container(135, 55).setDepth(20);
    const pillBg = this.add.graphics();
    pillBg.fillStyle(0x1e1b4b, 0.85);
    pillBg.lineStyle(1.5, 0x6366f1);
    pillBg.fillRoundedRect(-95, -18, 190, 36, 18);
    pillBg.strokeRoundedRect(-95, -18, 190, 36, 18);

    const initialNick = StorageService.getInstance().getNickname() || 'Player';
    const displayNick = initialNick.length > 10 ? `${initialNick.substring(0, 9)}…` : initialNick;
    this.playerPillText = this.add.text(0, 0, `👤 ${displayNick} ✏️`, {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#e0e7ff',
    }).setOrigin(0.5);

    playerPill.add([pillBg, this.playerPillText]);
    playerPill.setSize(190, 36);
    playerPill.setInteractive(new Phaser.Geom.Rectangle(0, 0, 190, 36), Phaser.Geom.Rectangle.Contains);
    if (playerPill.input) {
      playerPill.input.cursor = 'pointer';
    }

    playerPill.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0 && pointer.button !== undefined) return;
      this.openNicknameModal();
    });
  }

  public openNicknameModal(): void {
    SoundService.getInstance().playClick();
    GameModals.showNicknamePrompt(this, (newName) => {
      this.updatePlayerPill(newName);
    });
  }

  private async checkFirstTimeVisitor(): Promise<void> {
    const storage = StorageService.getInstance();
    const leaderboard = LeaderboardService.getInstance();

    // If already prompted or has saved nickname, not a first-time visitor
    if (storage.isNicknamePrompted() && storage.getNickname()) {
      this.updatePlayerPill();
      return;
    }

    // Wait for Firebase auth to initialize and restore any existing profile
    await leaderboard.waitForAuthReady();

    // If profile was restored from Firebase during auth, update pill and return
    const restoredNick = storage.getNickname();
    if (restoredNick && restoredNick !== 'Player') {
      storage.setNicknamePrompted();
      this.updatePlayerPill(restoredNick);
      return;
    }

    // Only prompt if player has never been prompted before
    if (!storage.isNicknamePrompted()) {
      GameModals.showNicknamePrompt(this, (name) => {
        this.updatePlayerPill(name);
      });
    } else {
      this.updatePlayerPill();
    }
  }

  private updatePlayerPill(name?: string): void {
    const nick = name || StorageService.getInstance().getNickname() || 'Player';
    const displayNick = nick.length > 10 ? `${nick.substring(0, 9)}…` : nick;
    this.playerPillText?.setText(`👤 ${displayNick} ✏️`);
  }

  private createTitle(width: number, height: number): void {
    const titleContainer = this.add.container(width / 2, height * 0.16).setDepth(10);

    const mascot = this.add.sprite(-175, -15, 'balloon_rainbow').setScale(0.75);
    this.tweens.add({
      targets: mascot,
      y: '-=16',
      rotation: 0.08,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const logoMain = this.add.text(25, -20, 'POP RUSH', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '66px',
      fontStyle: 'bold',
      color: '#f43f5e',
      stroke: '#0f172a',
      strokeThickness: 10,
      align: 'center',
    }).setOrigin(0.5);

    const subBadge = this.add.graphics();
    subBadge.fillStyle(0x4338ca, 0.9);
    subBadge.fillRoundedRect(-140, 32, 280, 34, 17);
    subBadge.lineStyle(2, 0x818cf8);
    subBadge.strokeRoundedRect(-140, 32, 280, 34, 17);

    const subText = this.add.text(0, 48, '🎯 COLOR RUSH ARCADE 🎯', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#e0e7ff',
      letterSpacing: 1,
    }).setOrigin(0.5);

    titleContainer.add([mascot, logoMain, subBadge, subText]);

    this.tweens.add({
      targets: titleContainer,
      y: height * 0.16 - 6,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createModeCards(width: number, _height: number): void {
    const storage = StorageService.getInstance();
    const timeAttackBest = storage.getTimeAttackHighScore();
    const endlessBest = storage.getEndlessHighScore();
    const endlessTime = storage.getEndlessBestTime();
    const colorChaosBest = storage.getColorChaosHighScore();
    const oneLifeBest = storage.getOneLifeHighScore();
    const oneLifeTime = storage.getOneLifeBestTime();

    const formatTime = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const cardWidth = 310;
    const cardHeight = 162;
    const colLeftX = width / 2 - 165;
    const colRightX = width / 2 + 165;
    const row1Y = 355;
    const row2Y = 535;

    // --- 1. TIME ATTACK MODE CARD ---
    const taCard = this.createPlayableModeCard({
      x: colLeftX,
      y: row1Y,
      width: cardWidth,
      height: cardHeight,
      title: 'TIME ATTACK',
      tag: '⏱️ 30s COUNTDOWN',
      description: 'Race against 30s! Pop target colors, golden balloons & trigger Fever Mode!',
      badgeText: `BEST: ${timeAttackBest.toLocaleString()}`,
      primaryColor: 0xf43f5e,
      darkColor: 0xbe123c,
      accentColor: 0xfef08a,
      onClick: () => this.startGame('time_attack'),
    });

    // --- 2. ENDLESS RUSH MODE CARD ---
    const erCard = this.createPlayableModeCard({
      x: colRightX,
      y: row1Y,
      width: cardWidth,
      height: cardHeight,
      title: 'ENDLESS RUSH',
      tag: '❤️ 3 LIVES',
      description: 'Survive as long as you can! Wrong pops, bombs, or missed targets cost a life!',
      badgeText: `BEST: ${endlessBest.toLocaleString()} • ${formatTime(endlessTime)}`,
      primaryColor: 0x0284c7,
      darkColor: 0x0369a1,
      accentColor: 0x38bdf8,
      onClick: () => this.startGame('endless'),
    });

    // --- 3. COLOR CHAOS MODE CARD ---
    const ccCard = this.createPlayableModeCard({
      x: colLeftX,
      y: row2Y,
      width: cardWidth,
      height: cardHeight,
      title: 'COLOR CHAOS',
      tag: '🌈 SHIFT EVERY 3',
      description: 'Target color switches every 3 (then 2) correct pops! Quick reactions required!',
      badgeText: `BEST: ${colorChaosBest.toLocaleString()}`,
      primaryColor: 0xa855f7,
      darkColor: 0x7e22ce,
      accentColor: 0xf0abfc,
      onClick: () => this.startGame('color_chaos'),
    });

    // --- 4. ONE LIFE CHALLENGE MODE CARD ---
    const olCard = this.createPlayableModeCard({
      x: colRightX,
      y: row2Y,
      width: cardWidth,
      height: cardHeight,
      title: 'ONE LIFE',
      tag: '💀 1 MISTAKE OVER',
      description: 'High stakes survival! One wrong pop, bomb, or missed target ends the game!',
      badgeText: `BEST: ${oneLifeBest.toLocaleString()} • ${formatTime(oneLifeTime)}`,
      primaryColor: 0xef4444,
      darkColor: 0x991b1b,
      accentColor: 0xfca5a5,
      onClick: () => this.startGame('one_life'),
    });

    this.modeButtons = [taCard, erCard, ccCard, olCard];
    this.highlightMode(0);

    // Asynchronously fetch real Firebase leaderboard targets and display nearest opponent
    const tracker = ChampionTracker.getInstance();
    const modes: { mode: GameModeKey; card: Phaser.GameObjects.Container; defaultStr: string }[] = [
      { mode: 'time_attack', card: taCard, defaultStr: `BEST: ${timeAttackBest.toLocaleString()}` },
      { mode: 'endless', card: erCard, defaultStr: `BEST: ${endlessBest.toLocaleString()} • ${formatTime(endlessTime)}` },
      { mode: 'color_chaos', card: ccCard, defaultStr: `BEST: ${colorChaosBest.toLocaleString()}` },
      { mode: 'one_life', card: olCard, defaultStr: `BEST: ${oneLifeBest.toLocaleString()} • ${formatTime(oneLifeTime)}` },
    ];

    modes.forEach(({ mode, card, defaultStr }) => {
      tracker
        .getTargetForMode(mode)
        .then((target) => {
          if (!this.scene.isActive()) return;
          const badge = (card as unknown as { badgeText?: Phaser.GameObjects.Text }).badgeText;
          if (badge) {
            if (target.isCurrentLeader) {
              badge.setText(`👑 DEFEND CROWN! (${defaultStr})`);
            } else if (target.hasOpponent) {
              badge.setText(`🎯 BEAT: ${target.opponentNickname} (${target.opponentScore.toLocaleString()})`);
            }
          }
        })
        .catch(() => {});
    });
  }

  private createPlayableModeCard(config: {
    x: number;
    y: number;
    width: number;
    height: number;
    title: string;
    tag: string;
    description: string;
    badgeText: string;
    primaryColor: number;
    darkColor: number;
    accentColor: number;
    onClick: () => void;
  }): Phaser.GameObjects.Container {
    const container = this.add.container(config.x, config.y).setDepth(10);

    // 3D Shadow Base
    const base = this.add.graphics();
    base.fillStyle(config.darkColor, 1);
    base.fillRoundedRect(-config.width / 2, -config.height / 2 + 5, config.width, config.height, 16);

    // Face Card
    const face = this.add.graphics();
    face.fillStyle(0x1e1b4b, 0.96);
    face.lineStyle(2.5, config.primaryColor, 1);
    face.fillRoundedRect(-config.width / 2, -config.height / 2, config.width, config.height, 16);
    face.strokeRoundedRect(-config.width / 2, -config.height / 2, config.width, config.height, 16);

    // Title (left-aligned)
    const title = this.add.text(-config.width / 2 + 16, -config.height / 2 + 14, config.title, {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff',
    });

    // Tag badge (right-aligned in card header)
    const tagW = Math.min(136, config.width * 0.44);
    const tagBg = this.add.graphics();
    tagBg.fillStyle(config.primaryColor, 1);
    tagBg.fillRoundedRect(config.width / 2 - tagW - 12, -config.height / 2 + 12, tagW, 22, 11);

    const tagText = this.add.text(config.width / 2 - tagW / 2 - 12, -config.height / 2 + 23, config.tag, {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Description
    const desc = this.add.text(-config.width / 2 + 16, -config.height / 2 + 42, config.description, {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '12px',
      color: '#cbd5e1',
      lineSpacing: 1.5,
      wordWrap: { width: config.width - 32 },
    });

    // Record / Badge pill
    const badgeW = config.width - 28;
    const badgeBg = this.add.graphics();
    badgeBg.fillStyle(0x312e81, 0.85);
    badgeBg.fillRoundedRect(-config.width / 2 + 14, config.height / 2 - 38, badgeW, 28, 8);

    const badge = this.add.text(-config.width / 2 + 22, config.height / 2 - 24, config.badgeText, {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#fef08a',
    }).setOrigin(0, 0.5);

    (container as unknown as { badgeText?: Phaser.GameObjects.Text }).badgeText = badge;

    // Play action indicator arrow
    const playIndicator = this.add.text(config.width / 2 - 30, config.height / 2 - 24, 'PLAY ▶', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#4ade80',
    }).setOrigin(0.5);

    container.add([base, face, title, tagBg, tagText, desc, badgeBg, badge, playIndicator]);
    container.setSize(config.width, config.height);

    // Interactive HitArea
    container.setInteractive(new Phaser.Geom.Rectangle(0, 0, config.width, config.height), Phaser.Geom.Rectangle.Contains);
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
        scaleX: 0.96,
        scaleY: 0.96,
        duration: 70,
        yoyo: true,
        onComplete: () => {
          config.onClick();
        },
      });
    });

    container.on('pointerover', () => {
      if (!isClicked) {
        this.tweens.add({ targets: container, scaleX: 1.03, scaleY: 1.03, duration: 120 });
      }
    });

    container.on('pointerout', () => {
      if (!isClicked) {
        this.tweens.add({ targets: container, scaleX: 1.0, scaleY: 1.0, duration: 120 });
      }
    });

    return container;
  }

  private createLeaderboardButton(width: number, _height: number): void {
    const btnWidth = Math.min(width * 0.76, 380);
    const btnHeight = 52;
    const btnY = 695;

    const container = this.add.container(width / 2, btnY).setDepth(10);

    const base = this.add.graphics();
    base.fillStyle(0x78350f, 1);
    base.fillRoundedRect(-btnWidth / 2, -btnHeight / 2 + 5, btnWidth, btnHeight, 18);

    const face = this.add.graphics();
    face.fillStyle(0xf59e0b, 1);
    face.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 18);

    const label = this.add.text(0, -2, '🏆 FAMILY LEADERBOARD 🏆', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#78350f',
      strokeThickness: 3,
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

      SoundService.getInstance().playClick();
      this.tweens.add({
        targets: container,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 70,
        yoyo: true,
        onComplete: () => {
          isClicked = false;
          GameModals.showLeaderboard(this, { initialMode: 'time_attack' });
        },
      });
    });

    container.on('pointerover', () => {
      if (!isClicked) {
        this.tweens.add({ targets: container, scaleX: 1.04, scaleY: 1.04, duration: 120 });
      }
    });
    container.on('pointerout', () => {
      if (!isClicked) {
        this.tweens.add({ targets: container, scaleX: 1.0, scaleY: 1.0, duration: 120 });
      }
    });

    this.add.existing(container);
  }

  private createSecondaryButtons(width: number, _height: number): void {
    const btnY = 765;
    const btnWidth = 170;
    const btnHeight = 46;

    // How to Play button
    const howBtn = this.createPillButton(
      width / 2 - 95,
      btnY,
      btnWidth,
      btnHeight,
      '📖 HOW TO PLAY',
      0x6366f1,
      () => {
        SoundService.getInstance().playClick();
        GameModals.showHowToPlay(this);
      }
    );

    // Settings button
    const setBtn = this.createPillButton(
      width / 2 + 95,
      btnY,
      btnWidth,
      btnHeight,
      '⚙️ SETTINGS',
      0xec4899,
      () => {
        SoundService.getInstance().playClick();
        GameModals.showSettings(this, () => {
          this.soundBtnIcon.setTexture(SoundService.getInstance().isSoundEnabled() ? 'icon_sound_on' : 'icon_sound_off');
          this.updatePlayerPill();
        });
      }
    );

    this.add.existing(howBtn);
    this.add.existing(setBtn);
  }

  private createPillButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    color: number,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y).setDepth(10);

    const bg = this.add.graphics();
    bg.fillStyle(0x1e1b4b, 0.9);
    bg.lineStyle(2, color, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 14);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 14);

    const txt = this.add.text(0, 0, label, {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    container.add([bg, txt]);
    container.setSize(width, height);
    container.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    if (container.input) {
      container.input.cursor = 'pointer';
    }

    container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0 && pointer.button !== undefined) return;
      onClick();
    });

    container.on('pointerover', () => {
      this.tweens.add({ targets: container, scaleX: 1.05, scaleY: 1.05, duration: 120 });
    });
    container.on('pointerout', () => {
      this.tweens.add({ targets: container, scaleX: 1.0, scaleY: 1.0, duration: 120 });
    });

    return container;
  }

  private highlightMode(index: number): void {
    this.selectedButtonIndex = index;
  }

  private setupKeyboard(): void {
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.code === 'Enter' || event.code === 'Space') {
        const btn = this.modeButtons[this.selectedButtonIndex];
        if (btn) btn.emit('pointerdown', { button: 0 });
      } else if (event.code === 'ArrowDown' || event.code === 'ArrowRight') {
        SoundService.getInstance().playClick();
        this.selectedButtonIndex = (this.selectedButtonIndex + 1) % this.modeButtons.length;
        this.highlightMode(this.selectedButtonIndex);
      } else if (event.code === 'ArrowUp' || event.code === 'ArrowLeft') {
        SoundService.getInstance().playClick();
        this.selectedButtonIndex = (this.selectedButtonIndex - 1 + this.modeButtons.length) % this.modeButtons.length;
        this.highlightMode(this.selectedButtonIndex);
      } else if (event.key === 'h' || event.key === 'H') {
        GameModals.showHowToPlay(this);
      } else if (event.key === 's' || event.key === 'S') {
        GameModals.showSettings(this);
      } else if (event.key === 'l' || event.key === 'L') {
        GameModals.showLeaderboard(this);
      } else if (event.key === 't' || event.key === 'T') {
        GameModals.showThemeSelector(this, (newTheme) => {
          this.updateBackgroundTheme(newTheme);
        });
      }
    });
  }

  public startGame(mode: GameModeKey): void {
    if (this.isStartingGame) return;
    this.isStartingGame = true;
    SoundService.getInstance().playClick();
    let transitioned = false;
    const doTransition = () => {
      if (transitioned) return;
      transitioned = true;
      this.scene.start('GameScene', { mode });
    };
    this.cameras.main.fadeOut(200, 15, 23, 42);
    this.cameras.main.once('camerafadeoutcomplete', doTransition);
    this.time.delayedCall(250, doTransition);
  }
}
