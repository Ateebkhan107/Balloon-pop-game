import Phaser from 'phaser';
import { StorageService } from '../services/StorageService';
import { SoundService } from '../services/SoundService';
import { GameModals } from '../ui/GameModals';

export class MenuScene extends Phaser.Scene {
  private ambientBalloons: Phaser.GameObjects.Sprite[] = [];
  private soundBtnIcon!: Phaser.GameObjects.Sprite;
  private selectedButtonIndex: number = 0;
  private buttons: Phaser.GameObjects.Container[] = [];
  private isStartingGame: boolean = false;

  constructor() {
    super({ key: 'MenuScene' });
  }

  public create(): void {
    const { width, height } = this.cameras.main;
    this.buttons = [];
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

    // --- BEST SCORE BADGE ---
    this.createBestScoreBadge(width, height);

    // --- MENU BUTTONS ---
    this.createMenuButtons(width, height);

    // --- KEYBOARD CONTROLS ---
    this.setupKeyboard();

    // Scene transition fade in
    this.cameras.main.fadeIn(300, 15, 23, 42);

    // Clean up all input listeners when shutting down
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.removeAllListeners();
      this.input.removeAllListeners();
    });
  }

  private createBackground(width: number, height: number): void {
    if (this.textures.exists('bg_sky')) {
      const bg = this.add.image(width / 2, height / 2, 'bg_sky');
      const scaleX = width / bg.width;
      const scaleY = height / bg.height;
      bg.setScale(Math.max(scaleX, scaleY));
      bg.setTint(0x94a3b8);
    } else {
      const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x1e1b4b);
      bg.setOrigin(0.5);
    }

    // Soft gradient overlay
    const overlay = this.add.graphics();
    overlay.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e1b4b, 0x1e1b4b, 0.65, 0.65, 0.85, 0.85);
    overlay.fillRect(0, 0, width, height);
  }

  private createAmbientBalloons(width: number, height: number): void {
    const textures = ['balloon_pink', 'balloon_blue', 'balloon_green', 'balloon_purple', 'balloon_golden'];
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
    // Center of 48x48 container in normalized space is (24, 24)
    soundBtn.setInteractive(new Phaser.Geom.Circle(24, 24, 24), Phaser.Geom.Circle.Contains);
    if (soundBtn.input) {
      soundBtn.input.cursor = 'pointer';
    }

    soundBtn.on('pointerdown', () => {
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

    fsBtn.on('pointerdown', () => {
      soundService.playClick();
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      } else {
        this.scale.startFullscreen();
      }
    });
  }

  private createTitle(width: number, height: number): void {
    const titleContainer = this.add.container(width / 2, height * 0.22).setDepth(10);

    // Mascot balloon floating next to title
    const mascot = this.add.sprite(-165, -15, 'balloon_pink').setScale(0.85);
    this.tweens.add({
      targets: mascot,
      y: '-=18',
      rotation: 0.08,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Main Logo Text
    const logoMain = this.add.text(25, -20, 'POP RUSH', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '68px',
      fontStyle: 'bold',
      color: '#f43f5e',
      stroke: '#0f172a',
      strokeThickness: 10,
      align: 'center',
    }).setOrigin(0.5);

    // Glowing subtitle badge
    const subBadge = this.add.graphics();
    subBadge.fillStyle(0x4338ca, 0.9);
    subBadge.fillRoundedRect(-120, 32, 240, 34, 17);
    subBadge.lineStyle(2, 0x818cf8);
    subBadge.strokeRoundedRect(-120, 32, 240, 34, 17);

    const subText = this.add.text(0, 48, '⚡ 30s TIME ATTACK ⚡', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#e0e7ff',
      letterSpacing: 1,
    }).setOrigin(0.5);

    titleContainer.add([mascot, logoMain, subBadge, subText]);

    // Gentle floating breathing animation on entire title
    this.tweens.add({
      targets: titleContainer,
      y: height * 0.22 - 6,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createBestScoreBadge(width: number, height: number): void {
    const highScore = StorageService.getInstance().getHighScore();
    const badgeY = height * 0.41;

    const badge = this.add.container(width / 2, badgeY).setDepth(10);

    const bg = this.add.graphics();
    bg.fillStyle(0x1e1b4b, 0.9);
    bg.lineStyle(3, 0xf59e0b, 1);
    bg.fillRoundedRect(-160, -28, 320, 56, 16);
    bg.strokeRoundedRect(-160, -28, 320, 56, 16);

    const star = this.add.sprite(-120, 0, 'particle_star').setScale(1.4);
    this.tweens.add({
      targets: star,
      rotation: Math.PI * 2,
      duration: 5000,
      repeat: -1,
      ease: 'Linear',
    });

    const label = this.add.text(10, 0, `BEST SCORE: ${highScore.toLocaleString()}`, {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#fef08a',
    }).setOrigin(0.5);

    badge.add([bg, star, label]);
  }

  private createMenuButtons(width: number, height: number): void {
    const startY = height * 0.55;
    const spacing = 86;

    // 1. PLAY BUTTON
    const playBtn = this.createArcadeButton(
      width / 2,
      startY,
      'PLAY NOW',
      0xf43f5e,
      0xbe123c,
      () => this.startGame(),
      true
    );

    // 2. HOW TO PLAY BUTTON
    const howBtn = this.createArcadeButton(
      width / 2,
      startY + spacing,
      'HOW TO PLAY',
      0x0284c7,
      0x0369a1,
      () => {
        SoundService.getInstance().playClick();
        GameModals.showHowToPlay(this);
      }
    );

    // 3. SETTINGS BUTTON
    const settingsBtn = this.createArcadeButton(
      width / 2,
      startY + spacing * 2,
      'SETTINGS',
      0x7c3aed,
      0x6d28d9,
      () => {
        SoundService.getInstance().playClick();
        GameModals.showSettings(this, () => {
          this.soundBtnIcon.setTexture(SoundService.getInstance().isSoundEnabled() ? 'icon_sound_on' : 'icon_sound_off');
        });
      }
    );

    this.buttons = [playBtn, howBtn, settingsBtn];
    this.highlightButton(0);
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
    const btnHeight = isProminent ? 66 : 56;
    const container = this.add.container(x, y).setDepth(10);

    // Shadow / 3D base
    const base = this.add.graphics();
    base.fillStyle(darkColor, 1);
    base.fillRoundedRect(-btnWidth / 2, -btnHeight / 2 + 5, btnWidth, btnHeight, 18);

    // Face
    const face = this.add.graphics();
    face.fillStyle(primaryColor, 1);
    face.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 18);

    const label = this.add.text(0, -2, text, {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: isProminent ? '26px' : '22px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    container.add([base, face, label]);
    container.setSize(btnWidth, btnHeight);

    // HitArea matches Phaser's Container coordinate normalization (0, 0, width, height)
    container.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, btnWidth, btnHeight),
      Phaser.Geom.Rectangle.Contains
    );
    if (container.input) {
      container.input.cursor = 'pointer';
    }

    let pulseTween: Phaser.Tweens.Tween | null = null;
    if (isProminent) {
      pulseTween = this.tweens.add({
        targets: container,
        scaleX: 1.04,
        scaleY: 1.04,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Quad.easeInOut',
      });
    }

    let isClicked = false;

    container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Accept primary click/touch only
      if (pointer.button !== 0 && pointer.button !== undefined) return;
      if (isClicked) return;
      isClicked = true;

      if (pulseTween) {
        pulseTween.stop();
        pulseTween = null;
      }
      this.tweens.killTweensOf(container);

      SoundService.getInstance().playClick();

      // Reliable depression animation with guaranteed single-callback
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

  private highlightButton(index: number): void {
    this.selectedButtonIndex = index;
  }

  private setupKeyboard(): void {
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.code === 'Enter' || event.code === 'Space') {
        const btn = this.buttons[this.selectedButtonIndex];
        if (btn) btn.emit('pointerdown', { button: 0 });
      } else if (event.code === 'ArrowDown') {
        SoundService.getInstance().playClick();
        this.selectedButtonIndex = (this.selectedButtonIndex + 1) % this.buttons.length;
        this.highlightButton(this.selectedButtonIndex);
      } else if (event.code === 'ArrowUp') {
        SoundService.getInstance().playClick();
        this.selectedButtonIndex = (this.selectedButtonIndex - 1 + this.buttons.length) % this.buttons.length;
        this.highlightButton(this.selectedButtonIndex);
      } else if (event.key === 'h' || event.key === 'H') {
        GameModals.showHowToPlay(this);
      } else if (event.key === 's' || event.key === 'S') {
        GameModals.showSettings(this);
      }
    });
  }

  private startGame(): void {
    if (this.isStartingGame) return;
    this.isStartingGame = true;
    SoundService.getInstance().playClick();
    this.cameras.main.fadeOut(200, 15, 23, 42);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene');
    });
  }
}
