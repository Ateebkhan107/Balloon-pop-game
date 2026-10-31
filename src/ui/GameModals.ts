import Phaser from 'phaser';
import { StorageService, BackgroundThemeId, BACKGROUND_THEMES } from '../services/StorageService';
import { SoundService } from '../services/SoundService';
import { LeaderboardService, GameModeKey, LeaderboardEntry } from '../services/LeaderboardService';

export interface LeaderboardModalOptions {
  initialMode?: GameModeKey;
  fromGameOver?: boolean;
  onPlayAgain?: (mode: GameModeKey) => void;
  onBackToMenu?: () => void;
  onClose?: () => void;
}

export class GameModals {
  public static showHowToPlay(scene: Phaser.Scene, onClose?: () => void): Phaser.GameObjects.Container {
    const { width, height } = scene.cameras.main;
    const container = scene.add.container(0, 0).setDepth(200);

    // Dim background overlay - absorbs clicks
    const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x0f172a, 0.88);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    container.add(overlay);

    // Modal Card
    const cardWidth = Math.min(width * 0.9, 560);
    const cardHeight = Math.min(height * 0.86, 760);
    const card = scene.add.graphics();
    card.fillStyle(0x1e1b4b, 0.98);
    card.lineStyle(4, 0x6366f1, 1);
    card.fillRoundedRect(width / 2 - cardWidth / 2, height / 2 - cardHeight / 2, cardWidth, cardHeight, 24);
    card.strokeRoundedRect(width / 2 - cardWidth / 2, height / 2 - cardHeight / 2, cardWidth, cardHeight, 24);
    container.add(card);

    // Title
    const title = scene.add.text(width / 2, height / 2 - cardHeight / 2 + 45, 'HOW TO PLAY', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#f43f5e',
      stroke: '#0f172a',
      strokeThickness: 4,
    }).setOrigin(0.5);
    container.add(title);

    let contentY = height / 2 - cardHeight / 2 + 90;

    // --- SECTION 1: COLOR RUSH ---
    const crBox = scene.add.graphics();
    crBox.fillStyle(0x312e81, 0.6);
    crBox.fillRoundedRect(width / 2 - cardWidth / 2 + 25, contentY, cardWidth - 50, 95, 14);
    container.add(crBox);

    const crTitle = scene.add.text(width / 2, contentY + 20, '🎯 COLOR RUSH RULES', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#38bdf8',
    }).setOrigin(0.5);

    const crDesc = scene.add.text(width / 2, contentY + 56, 'Watch the top indicator (e.g. "POP RED 🔴"). Only pop balloons matching the target color! Other colors are distractions.', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '14px',
      color: '#e2e8f0',
      align: 'center',
      wordWrap: { width: cardWidth - 70 },
    }).setOrigin(0.5);
    container.add([crTitle, crDesc]);

    contentY += 115;

    // --- SECTION 2: GAME MODES ---
    const gmTitle = scene.add.text(width / 2, contentY, '⚡ FOUR GAME MODES', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#fbbf24',
    }).setOrigin(0.5);
    container.add(gmTitle);

    contentY += 24;

    const taText = scene.add.text(width / 2 - cardWidth / 2 + 35, contentY, '⏱️ TIME ATTACK: 30s countdown. Pop target colors & golden balloons (+2s)!', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '13px',
      color: '#cbd5e1',
      wordWrap: { width: cardWidth - 70 },
    });
    container.add(taText);

    contentY += 34;

    const erText = scene.add.text(width / 2 - cardWidth / 2 + 35, contentY, '❤️ ENDLESS RUSH: 3 Lives. Wrong pops, bombs, or missed targets cost a life.', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '13px',
      color: '#cbd5e1',
      wordWrap: { width: cardWidth - 70 },
    });
    container.add(erText);

    contentY += 34;

    const ccText = scene.add.text(width / 2 - cardWidth / 2 + 35, contentY, '🌈 COLOR CHAOS: 30s speedrun. Target color switches after every 3 (then 2) pops!', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '13px',
      color: '#cbd5e1',
      wordWrap: { width: cardWidth - 70 },
    });
    container.add(ccText);

    contentY += 34;

    const olText = scene.add.text(width / 2 - cardWidth / 2 + 35, contentY, '💀 ONE LIFE: 1 Life survival. One mistake (wrong pop, bomb, target escape) ends game!', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '13px',
      color: '#cbd5e1',
      wordWrap: { width: cardWidth - 70 },
    });
    container.add(olText);

    contentY += 46;

    // --- SECTION 3: SPECIAL BALLOONS GUIDE ---
    const specTitle = scene.add.text(width / 2, contentY, '✨ SPECIAL BALLOONS', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#f472b6',
    }).setOrigin(0.5);
    container.add(specTitle);

    contentY += 30;

    const items = [
      { key: 'balloon_golden', text: 'GOLDEN: Universal bonus! +300 pts (+2s in Time Attack). Always safe.' },
      { key: 'balloon_rainbow', text: 'RAINBOW: WILD! Matches any active color & gives huge Fever charge!' },
      { key: 'balloon_freeze', text: 'FREEZE: Glacial slow! Reduces all balloon speeds by 60% for 4 seconds.' },
      { key: 'balloon_hazard', text: 'BOMB: Hazard! -200 pts in Time Attack, or -1 Life in Endless Rush.' },
    ];

    items.forEach((item, idx) => {
      const itemY = contentY + idx * 48;
      const spr = scene.add.sprite(width / 2 - cardWidth / 2 + 55, itemY + 12, item.key).setScale(0.32);
      const txt = scene.add.text(width / 2 - cardWidth / 2 + 95, itemY, item.text, {
        fontFamily: "'Fredoka', sans-serif",
        fontSize: '13px',
        color: '#f1f5f9',
        wordWrap: { width: cardWidth - 130 },
      });
      container.add([spr, txt]);
    });

    contentY += 205;

    // --- SECTION 4: FEVER & PERFECT POPS ---
    const bonusText = scene.add.text(width / 2, contentY, '💥 Tap near balloon centers for PERFECT POP (+50 pts)!\nFill the Fever Gauge to unleash 5s of FEVER MODE (All balloons valid, 2x pts)!', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '13px',
      color: '#fef08a',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: cardWidth - 60 },
    }).setOrigin(0.5);
    container.add(bonusText);

    // Close Button (200x50)
    const btnY = height / 2 + cardHeight / 2 - 45;
    const closeBtn = scene.add.container(width / 2, btnY);
    const btnBg = scene.add.graphics();
    btnBg.fillStyle(0x10b981, 1);
    btnBg.fillRoundedRect(-100, -25, 200, 50, 14);
    const btnText = scene.add.text(0, 0, 'GOT IT!', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    closeBtn.add([btnBg, btnText]);
    closeBtn.setSize(200, 50);

    closeBtn.setInteractive(new Phaser.Geom.Rectangle(0, 0, 200, 50), Phaser.Geom.Rectangle.Contains);
    if (closeBtn.input) {
      closeBtn.input.cursor = 'pointer';
    }

    let isClosed = false;
    const doClose = () => {
      if (isClosed) return;
      isClosed = true;
      SoundService.getInstance().playClick();
      container.destroy();
      if (onClose) onClose();
    };

    closeBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0 && pointer.button !== undefined) return;
      doClose();
    });

    closeBtn.on('pointerover', () => {
      scene.tweens.add({ targets: closeBtn, scaleX: 1.05, scaleY: 1.05, duration: 150 });
    });
    closeBtn.on('pointerout', () => {
      scene.tweens.add({ targets: closeBtn, scaleX: 1, scaleY: 1, duration: 150 });
    });

    container.add(closeBtn);

    container.setScale(0.9);
    container.setAlpha(0);
    scene.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });

    const escKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    const escListener = () => {
      doClose();
      escKey?.removeListener('down', escListener);
    };
    escKey?.once('down', escListener);

    return container;
  }

  public static showSettings(scene: Phaser.Scene, onClose?: () => void): Phaser.GameObjects.Container {
    const { width, height } = scene.cameras.main;
    const storage = StorageService.getInstance();
    const sound = SoundService.getInstance();
    let currentSettings = storage.getSettings();

    const container = scene.add.container(0, 0).setDepth(200);

    const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x0f172a, 0.88);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    container.add(overlay);

    const cardWidth = Math.min(width * 0.88, 520);
    const cardHeight = Math.min(height * 0.85, 660);
    const card = scene.add.graphics();
    card.fillStyle(0x1e1b4b, 0.98);
    card.lineStyle(4, 0xec4899, 1);
    card.fillRoundedRect(width / 2 - cardWidth / 2, height / 2 - cardHeight / 2, cardWidth, cardHeight, 24);
    card.strokeRoundedRect(width / 2 - cardWidth / 2, height / 2 - cardHeight / 2, cardWidth, cardHeight, 24);
    container.add(card);

    const title = scene.add.text(width / 2, height / 2 - cardHeight / 2 + 45, 'SETTINGS', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#ec4899',
      stroke: '#0f172a',
      strokeThickness: 4,
    }).setOrigin(0.5);
    container.add(title);

    let rowY = height / 2 - cardHeight / 2 + 105;
    const rowSpacing = 68;

    // --- ROW 1: PLAYER NICKNAME (EDITABLE) ---
    const nickLabel = scene.add.text(width / 2 - cardWidth / 2 + 35, rowY, 'Player Nickname:', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0, 0.5);

    const editBtn = scene.add.container(width / 2 + cardWidth / 2 - 95, rowY);
    const editBg = scene.add.graphics();
    editBg.fillStyle(0x6366f1, 1);
    editBg.fillRoundedRect(-55, -18, 110, 36, 12);

    const initialNick = storage.getNickname() || 'Player';
    const displayNick = initialNick.length > 8 ? `${initialNick.substring(0, 7)}…` : initialNick;
    const editText = scene.add.text(0, 0, `✏️ ${displayNick}`, {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    editBtn.add([editBg, editText]);
    editBtn.setSize(110, 36);
    editBtn.setInteractive(new Phaser.Geom.Rectangle(0, 0, 110, 36), Phaser.Geom.Rectangle.Contains);
    if (editBtn.input) editBtn.input.cursor = 'pointer';

    editBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0 && pointer.button !== undefined) return;
      sound.playClick();
      GameModals.showNicknamePrompt(
        scene,
        (newName) => {
          const short = newName.length > 8 ? `${newName.substring(0, 7)}…` : newName;
          editText.setText(`✏️ ${short}`);
        },
        storage.getNickname() || ''
      );
    });
    container.add([nickLabel, editBtn]);

    // --- ROW 2: SOUND EFFECTS TOGGLE (100x40) ---
    rowY += rowSpacing;
    const soundLabel = scene.add.text(width / 2 - cardWidth / 2 + 35, rowY, 'Sound Effects:', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0, 0.5);

    const soundToggleBtn = scene.add.container(width / 2 + cardWidth / 2 - 100, rowY);
    const soundToggleBg = scene.add.graphics();
    const updateSoundToggle = () => {
      soundToggleBg.clear();
      soundToggleBg.fillStyle(currentSettings.soundEnabled ? 0x10b981 : 0x64748b, 1);
      soundToggleBg.fillRoundedRect(-50, -20, 100, 40, 20);
    };
    updateSoundToggle();
    const soundToggleText = scene.add.text(0, 0, currentSettings.soundEnabled ? 'ON' : 'OFF', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    soundToggleBtn.add([soundToggleBg, soundToggleText]);
    soundToggleBtn.setSize(100, 40);
    soundToggleBtn.setInteractive(new Phaser.Geom.Rectangle(0, 0, 100, 40), Phaser.Geom.Rectangle.Contains);
    if (soundToggleBtn.input) {
      soundToggleBtn.input.cursor = 'pointer';
    }

    soundToggleBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0 && pointer.button !== undefined) return;
      const newVal = sound.toggleSound();
      currentSettings.soundEnabled = newVal;
      soundToggleText.setText(newVal ? 'ON' : 'OFF');
      updateSoundToggle();
    });
    container.add([soundLabel, soundToggleBtn]);

    // --- ROW 2: VOLUME PRESET (56x36 each) ---
    rowY += rowSpacing;
    const volLabel = scene.add.text(width / 2 - cardWidth / 2 + 40, rowY, 'SFX Volume:', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '22px',
      color: '#ffffff',
    }).setOrigin(0, 0.5);

    const volLevels = [0.3, 0.7, 1.0];
    const volNames = ['30%', '70%', '100%'];
    const volBtns: Phaser.GameObjects.Container[] = [];

    volLevels.forEach((vol, idx) => {
      const btnX = width / 2 + cardWidth / 2 - 180 + idx * 65;
      const bContainer = scene.add.container(btnX, rowY);
      const bg = scene.add.graphics();
      const isSelected = Math.abs(currentSettings.sfxVolume - vol) < 0.15;

      const redraw = (selected: boolean) => {
        bg.clear();
        bg.fillStyle(selected ? 0x6366f1 : 0x334155, 1);
        bg.fillRoundedRect(-28, -18, 56, 36, 10);
      };
      redraw(isSelected);

      const txt = scene.add.text(0, 0, volNames[idx], {
        fontFamily: "'Fredoka', sans-serif",
        fontSize: '16px',
        color: '#ffffff',
      }).setOrigin(0.5);

      bContainer.add([bg, txt]);
      bContainer.setSize(56, 36);
      bContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, 56, 36), Phaser.Geom.Rectangle.Contains);
      if (bContainer.input) {
        bContainer.input.cursor = 'pointer';
      }

      bContainer.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (pointer.button !== 0 && pointer.button !== undefined) return;
        currentSettings.sfxVolume = vol;
        storage.saveSettings({ sfxVolume: vol });
        sound.updateVolume();
        sound.playClick();
        volBtns.forEach((btn, bIdx) => {
          const g = btn.list[0] as Phaser.GameObjects.Graphics;
          g.clear();
          g.fillStyle(bIdx === idx ? 0x6366f1 : 0x334155, 1);
          g.fillRoundedRect(-28, -18, 56, 36, 10);
        });
      });

      volBtns.push(bContainer);
      container.add(bContainer);
    });
    container.add(volLabel);

    // --- ROW 3: REDUCED MOTION (100x40) ---
    rowY += rowSpacing;
    const motionLabel = scene.add.text(width / 2 - cardWidth / 2 + 40, rowY, 'Reduced Motion:', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '22px',
      color: '#ffffff',
    }).setOrigin(0, 0.5);

    const motionToggleBtn = scene.add.container(width / 2 + cardWidth / 2 - 100, rowY);
    const motionToggleBg = scene.add.graphics();
    const updateMotionToggle = () => {
      motionToggleBg.clear();
      motionToggleBg.fillStyle(currentSettings.reducedMotion ? 0x10b981 : 0x64748b, 1);
      motionToggleBg.fillRoundedRect(-50, -20, 100, 40, 20);
    };
    updateMotionToggle();
    const motionToggleText = scene.add.text(0, 0, currentSettings.reducedMotion ? 'ON' : 'OFF', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    motionToggleBtn.add([motionToggleBg, motionToggleText]);
    motionToggleBtn.setSize(100, 40);
    motionToggleBtn.setInteractive(new Phaser.Geom.Rectangle(0, 0, 100, 40), Phaser.Geom.Rectangle.Contains);
    if (motionToggleBtn.input) {
      motionToggleBtn.input.cursor = 'pointer';
    }

    motionToggleBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0 && pointer.button !== undefined) return;
      currentSettings.reducedMotion = !currentSettings.reducedMotion;
      storage.saveSettings({ reducedMotion: currentSettings.reducedMotion });
      motionToggleText.setText(currentSettings.reducedMotion ? 'ON' : 'OFF');
      updateMotionToggle();
      sound.playClick();
    });
    container.add([motionLabel, motionToggleBtn]);

    // --- ROW 4: FULLSCREEN (100x40) ---
    rowY += rowSpacing;
    const fsLabel = scene.add.text(width / 2 - cardWidth / 2 + 40, rowY, 'Fullscreen Display:', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '22px',
      color: '#ffffff',
    }).setOrigin(0, 0.5);

    const fsBtn = scene.add.container(width / 2 + cardWidth / 2 - 100, rowY);
    const fsBg = scene.add.graphics();
    fsBg.fillStyle(0x0284c7, 1);
    fsBg.fillRoundedRect(-50, -20, 100, 40, 12);
    const fsText = scene.add.text(0, 0, scene.scale.isFullscreen ? 'EXIT' : 'ENTER', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    fsBtn.add([fsBg, fsText]);
    fsBtn.setSize(100, 40);
    fsBtn.setInteractive(new Phaser.Geom.Rectangle(0, 0, 100, 40), Phaser.Geom.Rectangle.Contains);
    if (fsBtn.input) {
      fsBtn.input.cursor = 'pointer';
    }

    fsBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0 && pointer.button !== undefined) return;
      sound.playClick();
      if (scene.scale.isFullscreen) {
        scene.scale.stopFullscreen();
        fsText.setText('ENTER');
      } else {
        scene.scale.startFullscreen();
        fsText.setText('EXIT');
      }
    });
    container.add([fsLabel, fsBtn]);

    // Close Button (180x48)
    const btnY = height / 2 + cardHeight / 2 - 50;
    const closeBtn = scene.add.container(width / 2, btnY);
    const btnBg = scene.add.graphics();
    btnBg.fillStyle(0xec4899, 1);
    btnBg.fillRoundedRect(-90, -24, 180, 48, 14);
    const btnText = scene.add.text(0, 0, 'SAVE & CLOSE', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    closeBtn.add([btnBg, btnText]);
    closeBtn.setSize(180, 48);
    closeBtn.setInteractive(new Phaser.Geom.Rectangle(0, 0, 180, 48), Phaser.Geom.Rectangle.Contains);
    if (closeBtn.input) {
      closeBtn.input.cursor = 'pointer';
    }

    let isClosed = false;
    const doClose = () => {
      if (isClosed) return;
      isClosed = true;
      sound.playClick();
      container.destroy();
      if (onClose) onClose();
    };

    closeBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0 && pointer.button !== undefined) return;
      doClose();
    });

    closeBtn.on('pointerover', () => {
      scene.tweens.add({ targets: closeBtn, scaleX: 1.05, scaleY: 1.05, duration: 150 });
    });
    closeBtn.on('pointerout', () => {
      scene.tweens.add({ targets: closeBtn, scaleX: 1, scaleY: 1, duration: 150 });
    });
    container.add(closeBtn);

    container.setScale(0.9);
    container.setAlpha(0);
    scene.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });

    const escKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    const escListener = () => {
      doClose();
      escKey?.removeListener('down', escListener);
    };
    escKey?.once('down', escListener);

    return container;
  }

  /**
   * Prompts the player for a nickname using a mobile-friendly HTML overlay.
   * Seamlessly integrates with soft keyboards on iOS and Android.
   */
  public static showNicknamePrompt(
    _scene: Phaser.Scene,
    onComplete: (nickname: string) => void,
    existingNickname?: string
  ): void {
    const existing = document.getElementById('pop-rush-nickname-modal');
    if (existing) {
      existing.remove();
    }

    const currentName = existingNickname || StorageService.getInstance().getNickname() || '';

    const overlay = document.createElement('div');
    overlay.id = 'pop-rush-nickname-modal';
    overlay.className = 'pop-rush-overlay';
    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      touch-action: auto;
      pointer-events: auto;
      animation: popRushFadeIn 0.2s ease-out;
    `;

    overlay.innerHTML = `
      <style>
        @keyframes popRushFadeIn {
          from { opacity: 0; transform: scale(0.94); }
          to { opacity: 1; transform: scale(1); }
        }
        .pop-rush-box {
          background: #1e1b4b;
          border: 3px solid #6366f1;
          border-radius: 24px;
          padding: 32px 28px;
          width: 90%;
          max-width: 440px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);
          text-align: center;
          font-family: 'Fredoka', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #ffffff;
          box-sizing: border-box;
        }
        .pop-rush-badge {
          display: inline-block;
          background: #4338ca;
          color: #e0e7ff;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 1.5px;
          padding: 5px 14px;
          border-radius: 12px;
          margin-bottom: 12px;
        }
        .pop-rush-title {
          font-size: 28px;
          font-weight: 800;
          color: #f43f5e;
          margin: 0 0 10px 0;
          letter-spacing: 0.5px;
        }
        .pop-rush-desc {
          font-size: 15px;
          color: #cbd5e1;
          margin: 0 0 20px 0;
          line-height: 1.4;
        }
        .pop-rush-input {
          width: 100%;
          box-sizing: border-box;
          background: #0f172a;
          border: 2px solid #6366f1;
          border-radius: 14px;
          padding: 14px 16px;
          font-size: 20px;
          font-family: 'Fredoka', sans-serif;
          font-weight: 700;
          color: #ffffff;
          text-align: center;
          outline: none;
          transition: border-color 0.2s;
        }
        .pop-rush-input:focus {
          border-color: #f43f5e;
        }
        .pop-rush-error {
          color: #fb7185;
          font-size: 13px;
          font-weight: 600;
          min-height: 22px;
          margin: 8px 0;
        }
        .pop-rush-actions {
          display: flex;
          gap: 12px;
          margin-top: 14px;
        }
        .pop-rush-btn-save {
          flex: 1;
          background: #10b981;
          border: none;
          border-radius: 14px;
          color: #ffffff;
          font-size: 18px;
          font-weight: 700;
          font-family: 'Fredoka', sans-serif;
          padding: 14px 18px;
          cursor: pointer;
          transition: transform 0.1s, background 0.15s;
        }
        .pop-rush-btn-save:hover {
          background: #059669;
          transform: translateY(-1px);
        }
        .pop-rush-btn-guest {
          background: #334155;
          border: none;
          border-radius: 14px;
          color: #cbd5e1;
          font-size: 15px;
          font-weight: 600;
          font-family: 'Fredoka', sans-serif;
          padding: 14px 16px;
          cursor: pointer;
        }
        .pop-rush-btn-guest:hover {
          background: #475569;
        }
      </style>
      <div class="pop-rush-box">
        <div class="pop-rush-badge">🏆 FAMILY LEADERBOARD</div>
        <div class="pop-rush-title">${currentName ? 'EDIT NICKNAME' : 'PLAYER NICKNAME'}</div>
        <div class="pop-rush-desc">
          ${currentName ? 'Update your display name for the family rankings:' : 'Enter your name to join the family leaderboard and save high scores:'}
        </div>
        <input type="text" class="pop-rush-input" id="pop-rush-nick-field" maxlength="15" placeholder="Your nickname..." autocomplete="off" />
        <div class="pop-rush-error" id="pop-rush-nick-err"></div>
        <div class="pop-rush-actions">
          <button type="button" class="pop-rush-btn-save" id="pop-rush-nick-submit">SAVE NICKNAME</button>
          ${!currentName ? '<button type="button" class="pop-rush-btn-guest" id="pop-rush-nick-skip">PLAY AS GUEST</button>' : '<button type="button" class="pop-rush-btn-guest" id="pop-rush-nick-skip">CANCEL</button>'}
        </div>
      </div>
    `;

    const gameContainer = document.getElementById('game-container') || document.body;
    gameContainer.appendChild(overlay);

    const inputField = overlay.querySelector('#pop-rush-nick-field') as HTMLInputElement;
    const errorEl = overlay.querySelector('#pop-rush-nick-err') as HTMLElement;
    const submitBtn = overlay.querySelector('#pop-rush-nick-submit') as HTMLButtonElement;
    const skipBtn = overlay.querySelector('#pop-rush-nick-skip') as HTMLButtonElement;

    if (inputField && currentName) {
      inputField.value = currentName;
    }

    setTimeout(() => {
      inputField?.focus();
      inputField?.select();
    }, 60);

    const closeAndComplete = (name: string) => {
      SoundService.getInstance().playClick();
      overlay.remove();
      onComplete(name);
    };

    const handleSave = () => {
      const val = (inputField?.value || '').trim();
      if (val.length < 2) {
        errorEl.textContent = 'Nickname must be at least 2 characters long.';
        return;
      }
      if (val.length > 15) {
        errorEl.textContent = 'Nickname cannot exceed 15 characters.';
        return;
      }
      const sanitized = StorageService.sanitizeNickname(val);
      StorageService.getInstance().saveNickname(sanitized);
      LeaderboardService.getInstance().updateNickname(sanitized);
      closeAndComplete(sanitized);
    };

    submitBtn?.addEventListener('click', handleSave);
    skipBtn?.addEventListener('click', () => {
      if (currentName) {
        closeAndComplete(currentName);
      } else {
        const defaultName = 'Player';
        StorageService.getInstance().saveNickname(defaultName);
        LeaderboardService.getInstance().updateNickname(defaultName);
        closeAndComplete(defaultName);
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        if (currentName) {
          closeAndComplete(currentName);
        } else {
          closeAndComplete('Player');
        }
      }
    };
    inputField?.addEventListener('keydown', handleKeyDown);
  }

  /**
   * Displays the shared Family Leaderboard modal with separate tabs for
   * Time Attack and Endless Rush, rank indicators, 1st place crown,
   * live player rank footer, and navigation.
   */
  public static showLeaderboard(
    scene: Phaser.Scene,
    options?: LeaderboardModalOptions
  ): Phaser.GameObjects.Container {
    const { width, height } = scene.cameras.main;
    const container = scene.add.container(0, 0).setDepth(200);
    const sound = SoundService.getInstance();
    const leaderboardService = LeaderboardService.getInstance();

    let currentMode: GameModeKey = options?.initialMode || 'time_attack';

    // 1. Semi-transparent backdrop
    const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x0f172a, 0.92);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    container.add(overlay);

    // 2. Main Leaderboard Card
    const cardWidth = Math.min(width * 0.94, 620);
    const cardHeight = Math.min(height * 0.92, 940);
    const cardX = width / 2;
    const cardY = height / 2;

    const formatSurvivalTime = (seconds?: number | null): string => {
      if (typeof seconds !== 'number' || seconds <= 0) return '--:--';
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const card = scene.add.graphics();
    card.fillStyle(0x1e1b4b, 0.98);
    card.lineStyle(3, 0xf59e0b, 1);
    card.fillRoundedRect(cardX - cardWidth / 2, cardY - cardHeight / 2, cardWidth, cardHeight, 24);
    card.strokeRoundedRect(cardX - cardWidth / 2, cardY - cardHeight / 2, cardWidth, cardHeight, 24);
    container.add(card);

    // 3. Header Container
    const headerY = cardY - cardHeight / 2 + 38;
    const title = scene.add.text(cardX, headerY, '🏆 FAMILY LEADERBOARD 🏆', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#f59e0b',
      stroke: '#0f172a',
      strokeThickness: 5,
    }).setOrigin(0.5);
    container.add(title);

    // Refresh button (🔄) top right
    const refreshBtnX = cardX + cardWidth / 2 - 76;
    const refreshBtnY = headerY;
    const refreshBtn = scene.add.container(refreshBtnX, refreshBtnY);
    const refreshBg = scene.add.circle(0, 0, 18, 0x334155, 0.9);
    refreshBg.setStrokeStyle(1.5, 0x94a3b8);
    const refreshText = scene.add.text(0, -1, '🔄', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '16px',
    }).setOrigin(0.5);
    refreshBtn.add([refreshBg, refreshText]);
    refreshBtn.setSize(36, 36);
    refreshBtn.setInteractive(new Phaser.Geom.Circle(18, 18, 18), Phaser.Geom.Circle.Contains);
    if (refreshBtn.input) refreshBtn.input.cursor = 'pointer';

    refreshBtn.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.button !== 0 && p.button !== undefined) return;
      sound.playClick();
      scene.tweens.add({
        targets: refreshText,
        angle: 360,
        duration: 400,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          refreshText.setAngle(0);
        },
      });
      refreshList();
    });
    container.add(refreshBtn);

    // Close button (X) top right
    const closeBtnX = cardX + cardWidth / 2 - 32;
    const closeBtnY = headerY;
    const closeBtn = scene.add.container(closeBtnX, closeBtnY);
    const closeBg = scene.add.circle(0, 0, 18, 0x334155, 0.9);
    closeBg.setStrokeStyle(1.5, 0x94a3b8);
    const closeText = scene.add.text(0, -1, '✕', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    closeBtn.add([closeBg, closeText]);
    closeBtn.setSize(36, 36);
    closeBtn.setInteractive(new Phaser.Geom.Circle(18, 18, 18), Phaser.Geom.Circle.Contains);
    if (closeBtn.input) closeBtn.input.cursor = 'pointer';

    let isClosed = false;
    const doClose = () => {
      if (isClosed) return;
      isClosed = true;
      sound.playClick();
      container.destroy();
      if (options?.onClose) options.onClose();
    };

    closeBtn.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.button !== 0 && p.button !== undefined) return;
      doClose();
    });
    container.add(closeBtn);

    // Nickname Pill Bar under title
    const nicknamePillY = headerY + 40;
    const nicknamePill = scene.add.container(cardX, nicknamePillY);
    const nickPillBg = scene.add.graphics();
    const currentNick = leaderboardService.getNickname();
    const nickPillText = scene.add.text(0, 0, `👤 Player: ${currentNick} ✏️`, {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#c7d2fe',
    }).setOrigin(0.5);

    const nickPillWidth = Math.max(nickPillText.width + 30, 180);
    nickPillBg.fillStyle(0x312e81, 0.9);
    nickPillBg.lineStyle(1.5, 0x818cf8, 0.8);
    nickPillBg.fillRoundedRect(-nickPillWidth / 2, -15, nickPillWidth, 30, 15);
    nickPillBg.strokeRoundedRect(-nickPillWidth / 2, -15, nickPillWidth, 30, 15);
    nicknamePill.add([nickPillBg, nickPillText]);
    nicknamePill.setSize(nickPillWidth, 30);
    nicknamePill.setInteractive(new Phaser.Geom.Rectangle(0, 0, nickPillWidth, 30), Phaser.Geom.Rectangle.Contains);
    if (nicknamePill.input) nicknamePill.input.cursor = 'pointer';

    nicknamePill.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.button !== 0 && p.button !== undefined) return;
      sound.playClick();
      GameModals.showNicknamePrompt(scene, (newName) => {
        nickPillText.setText(`👤 Player: ${newName} ✏️`);
        refreshList();
      });
    });
    container.add(nicknamePill);

    // 4. Mode Selection Tabs (4 independent modes)
    const tabsY = nicknamePillY + 44;
    const tabGap = 6;
    const tabWidth = Math.floor((cardWidth - 50 - tabGap * 3) / 4);
    const tabHeight = 38;

    const tabConfigs: { mode: GameModeKey; label: string; activeColor: number }[] = [
      { mode: 'time_attack', label: '⏱️ TIME', activeColor: 0xf43f5e },
      { mode: 'endless', label: '❤️ ENDLESS', activeColor: 0x0284c7 },
      { mode: 'color_chaos', label: '🌈 CHAOS', activeColor: 0xa855f7 },
      { mode: 'one_life', label: '💀 ONE LIFE', activeColor: 0xef4444 },
    ];

    const tabContainers: {
      mode: GameModeKey;
      container: Phaser.GameObjects.Container;
      bg: Phaser.GameObjects.Graphics;
      text: Phaser.GameObjects.Text;
      activeColor: number;
    }[] = [];

    const startTabX = cardX - (cardWidth - 50) / 2 + tabWidth / 2;

    tabConfigs.forEach((cfg, idx) => {
      const tabX = startTabX + idx * (tabWidth + tabGap);
      const tabC = scene.add.container(tabX, tabsY);
      const tBg = scene.add.graphics();
      const tTxt = scene.add.text(0, 0, cfg.label, {
        fontFamily: "'Fredoka', sans-serif",
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0.5);

      tabC.add([tBg, tTxt]);
      tabC.setSize(tabWidth, tabHeight);
      tabC.setInteractive(new Phaser.Geom.Rectangle(0, 0, tabWidth, tabHeight), Phaser.Geom.Rectangle.Contains);
      if (tabC.input) tabC.input.cursor = 'pointer';

      tabC.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (p.button !== 0 && p.button !== undefined) return;
        if (currentMode === cfg.mode) return;
        currentMode = cfg.mode;
        sound.playClick();
        updateTabStyles();
        renderTableHeaders();
        refreshList();
      });

      container.add(tabC);
      tabContainers.push({
        mode: cfg.mode,
        container: tabC,
        bg: tBg,
        text: tTxt,
        activeColor: cfg.activeColor,
      });
    });

    const updateTabStyles = () => {
      tabContainers.forEach((t) => {
        t.bg.clear();
        if (currentMode === t.mode) {
          t.bg.fillStyle(t.activeColor, 1);
          t.bg.fillRoundedRect(-tabWidth / 2, -tabHeight / 2, tabWidth, tabHeight, 12);
          t.text.setColor('#ffffff');
        } else {
          t.bg.fillStyle(0x0f172a, 0.7);
          t.bg.lineStyle(1.5, 0x475569, 1);
          t.bg.fillRoundedRect(-tabWidth / 2, -tabHeight / 2, tabWidth, tabHeight, 12);
          t.bg.strokeRoundedRect(-tabWidth / 2, -tabHeight / 2, tabWidth, tabHeight, 12);
          t.text.setColor('#94a3b8');
        }
      });
    };
    updateTabStyles();

    // 5. Table Header Bar (Dynamic for Survival vs Sprint modes)
    const tableHeaderY = tabsY + 36;
    const tableHeaderContainer = scene.add.container(0, 0);
    container.add(tableHeaderContainer);

    const isSurvival = () => currentMode === 'endless' || currentMode === 'one_life';
    const colRankX = cardX - cardWidth / 2 + 32;
    const getColPlayerX = () => cardX - cardWidth / 2 + (isSurvival() ? 116 : 126);
    const colSurvivalX = cardX + cardWidth / 2 - 145;
    const colScoreX = cardX + cardWidth / 2 - 32;

    const renderTableHeaders = () => {
      tableHeaderContainer.removeAll(true);

      const rankHeader = scene.add.text(colRankX, tableHeaderY, 'RANK', {
        fontFamily: "'Fredoka', sans-serif",
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#94a3b8',
        letterSpacing: 1,
      }).setOrigin(0, 0.5);

      const playerHeader = scene.add.text(getColPlayerX(), tableHeaderY, 'PLAYER', {
        fontFamily: "'Fredoka', sans-serif",
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#94a3b8',
        letterSpacing: 1,
      }).setOrigin(0, 0.5);

      tableHeaderContainer.add([rankHeader, playerHeader]);

      if (isSurvival()) {
        const survivalHeader = scene.add.text(colSurvivalX, tableHeaderY, 'SURVIVAL', {
          fontFamily: "'Fredoka', sans-serif",
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#94a3b8',
          letterSpacing: 1,
        }).setOrigin(0.5, 0.5);
        tableHeaderContainer.add(survivalHeader);
      }

      const scoreHeader = scene.add.text(colScoreX, tableHeaderY, 'BEST SCORE', {
        fontFamily: "'Fredoka', sans-serif",
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#94a3b8',
        letterSpacing: 1,
      }).setOrigin(1, 0.5);
      tableHeaderContainer.add(scoreHeader);

      const tableDiv = scene.add.graphics();
      tableDiv.lineStyle(1, 0x334155, 1);
      tableDiv.strokeLineShape(
        new Phaser.Geom.Line(cardX - cardWidth / 2 + 25, tableHeaderY + 16, cardX + cardWidth / 2 - 25, tableHeaderY + 16)
      );
      tableHeaderContainer.add(tableDiv);
    };
    renderTableHeaders();

    // 6. Dynamic List Rows Container
    const rowsContainer = scene.add.container(0, 0);
    container.add(rowsContainer);

    // 7. Pinned Player Rank Footer
    const footerY = cardY + cardHeight / 2 - 110;
    const footerBox = scene.add.container(cardX, footerY);
    const footerBg = scene.add.graphics();
    const footerText = scene.add.text(0, 0, '', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    footerBox.add([footerBg, footerText]);
    container.add(footerBox);

    const updateFooter = (rank: number | null, entry: LeaderboardEntry | null) => {
      footerBg.clear();
      const storage = StorageService.getInstance();
      const localScore = storage.getHighScoreForMode(currentMode);
      const localSurvival = storage.getBestTimeForMode(currentMode);
      const name = leaderboardService.getNickname();
      const boxW = cardWidth - 50;
      const boxH = 46;

      const survivalPart = isSurvival() && (entry?.survivalTime || localSurvival)
        ? `  •  ⏱️ ${formatSurvivalTime(entry?.survivalTime || localSurvival)}`
        : '';

      if (rank === 1) {
        footerBg.fillStyle(0x78350f, 0.95);
        footerBg.lineStyle(2, 0xf59e0b, 1);
        footerBg.fillRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, 12);
        footerBg.strokeRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, 12);
        footerText.setText(`👑 YOUR RANK: #1 (LEADER!)  •  ${name}  •  ${(entry?.score || localScore).toLocaleString()} pts${survivalPart}`);
        footerText.setColor('#fef08a');
      } else if (rank && rank > 1) {
        footerBg.fillStyle(0x312e81, 0.95);
        footerBg.lineStyle(2, 0x818cf8, 1);
        footerBg.fillRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, 12);
        footerBg.strokeRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, 12);
        footerText.setText(`YOUR RANK: #${rank}  •  ${name}  •  ${(entry?.score || localScore).toLocaleString()} pts${survivalPart}`);
        footerText.setColor('#ffffff');
      } else if (localScore > 0) {
        footerBg.fillStyle(0x1e293b, 0.95);
        footerBg.lineStyle(1.5, 0x64748b, 1);
        footerBg.fillRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, 12);
        footerBg.strokeRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, 12);
        footerText.setText(`YOUR BEST: ${localScore.toLocaleString()} pts${survivalPart}  •  Play another round to rank!`);
        footerText.setColor('#cbd5e1');
      } else {
        footerBg.fillStyle(0x1e293b, 0.95);
        footerBg.lineStyle(1.5, 0x475569, 1);
        footerBg.fillRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, 12);
        footerBg.strokeRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, 12);
        const modeNames: Record<GameModeKey, string> = {
          time_attack: 'Time Attack',
          endless: 'Endless Rush',
          color_chaos: 'Color Chaos',
          one_life: 'One Life',
        };
        footerText.setText(`YOUR BEST: 0 pts  •  Play ${modeNames[currentMode]} to join!`);
        footerText.setColor('#94a3b8');
      }
    };

    // 8. Bottom Action Navigation Buttons
    const actionY = cardY + cardHeight / 2 - 48;

    if (options?.fromGameOver) {
      // 1. PLAY AGAIN button
      const playAgainBtn = scene.add.container(cardX - 110, actionY);
      const paBg = scene.add.graphics();
      paBg.fillStyle(0x10b981, 1);
      paBg.fillRoundedRect(-95, -22, 190, 44, 14);
      const paText = scene.add.text(0, 0, 'PLAY AGAIN ▶', {
        fontFamily: "'Fredoka', sans-serif",
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0.5);
      playAgainBtn.add([paBg, paText]);
      playAgainBtn.setSize(190, 44);
      playAgainBtn.setInteractive(new Phaser.Geom.Rectangle(0, 0, 190, 44), Phaser.Geom.Rectangle.Contains);
      if (playAgainBtn.input) playAgainBtn.input.cursor = 'pointer';

      playAgainBtn.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (p.button !== 0 && p.button !== undefined) return;
        sound.playClick();
        container.destroy();
        if (options.onPlayAgain) {
          options.onPlayAgain(currentMode);
        } else {
          scene.scene.start('GameScene', { mode: currentMode });
        }
      });

      // 2. MAIN MENU button
      const menuBtn = scene.add.container(cardX + 110, actionY);
      const mBg = scene.add.graphics();
      mBg.fillStyle(0x6366f1, 1);
      mBg.fillRoundedRect(-95, -22, 190, 44, 14);
      const mText = scene.add.text(0, 0, 'MAIN MENU 🏠', {
        fontFamily: "'Fredoka', sans-serif",
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0.5);
      menuBtn.add([mBg, mText]);
      menuBtn.setSize(190, 44);
      menuBtn.setInteractive(new Phaser.Geom.Rectangle(0, 0, 190, 44), Phaser.Geom.Rectangle.Contains);
      if (menuBtn.input) menuBtn.input.cursor = 'pointer';

      menuBtn.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (p.button !== 0 && p.button !== undefined) return;
        sound.playClick();
        container.destroy();
        if (options.onBackToMenu) {
          options.onBackToMenu();
        } else {
          scene.scene.start('MenuScene');
        }
      });

      container.add([playAgainBtn, menuBtn]);
    } else {
      // From MenuScene: PLAY NOW + CLOSE
      const playNowBtn = scene.add.container(cardX - 100, actionY);
      const pnBg = scene.add.graphics();
      pnBg.fillStyle(0x10b981, 1);
      pnBg.fillRoundedRect(-85, -22, 170, 44, 14);
      const pnText = scene.add.text(0, 0, 'PLAY NOW ▶', {
        fontFamily: "'Fredoka', sans-serif",
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0.5);
      playNowBtn.add([pnBg, pnText]);
      playNowBtn.setSize(170, 44);
      playNowBtn.setInteractive(new Phaser.Geom.Rectangle(0, 0, 170, 44), Phaser.Geom.Rectangle.Contains);
      if (playNowBtn.input) playNowBtn.input.cursor = 'pointer';

      playNowBtn.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (p.button !== 0 && p.button !== undefined) return;
        sound.playClick();
        container.destroy();
        scene.scene.start('GameScene', { mode: currentMode });
      });

      const closeActionBtn = scene.add.container(cardX + 100, actionY);
      const caBg = scene.add.graphics();
      caBg.fillStyle(0x475569, 1);
      caBg.fillRoundedRect(-85, -22, 170, 44, 14);
      const caText = scene.add.text(0, 0, 'CLOSE', {
        fontFamily: "'Fredoka', sans-serif",
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0.5);
      closeActionBtn.add([caBg, caText]);
      closeActionBtn.setSize(170, 44);
      closeActionBtn.setInteractive(new Phaser.Geom.Rectangle(0, 0, 170, 44), Phaser.Geom.Rectangle.Contains);
      if (closeActionBtn.input) closeActionBtn.input.cursor = 'pointer';

      closeActionBtn.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (p.button !== 0 && p.button !== undefined) return;
        doClose();
      });

      container.add([playNowBtn, closeActionBtn]);
    }

    // Refresh function that populates the leaderboard list
    const refreshList = async () => {
      rowsContainer.removeAll(true);

      // Loading state
      const loadingY = tableHeaderY + 120;
      const loadingText = scene.add.text(cardX, loadingY, 'Loading rankings... 🔄', {
        fontFamily: "'Fredoka', sans-serif",
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#fbbf24',
      }).setOrigin(0.5);
      rowsContainer.add(loadingText);

      const result = await leaderboardService.fetchLeaderboard(currentMode);
      rowsContainer.removeAll(true);

      updateFooter(result.currentUserRank, result.currentUserEntry);

      // Connection error state
      if (!result.success && result.entries.length === 0) {
        const errY = tableHeaderY + 110;
        const errIcon = scene.add.text(cardX, errY - 24, '📡', { fontSize: '32px' }).setOrigin(0.5);
        const errText = scene.add.text(cardX, errY + 16, 'Could not connect to Leaderboard.\nPlease check your network connection.', {
          fontFamily: "'Fredoka', sans-serif",
          fontSize: '16px',
          fontStyle: 'bold',
          color: '#fb7185',
          align: 'center',
          lineSpacing: 4,
        }).setOrigin(0.5);

        const retryBtn = scene.add.container(cardX, errY + 68);
        const rBg = scene.add.graphics();
        rBg.fillStyle(0x6366f1, 1);
        rBg.fillRoundedRect(-65, -18, 130, 36, 12);
        const rTxt = scene.add.text(0, 0, 'RETRY 🔄', {
          fontFamily: "'Fredoka', sans-serif",
          fontSize: '15px',
          fontStyle: 'bold',
          color: '#ffffff',
        }).setOrigin(0.5);
        retryBtn.add([rBg, rTxt]);
        retryBtn.setSize(130, 36);
        retryBtn.setInteractive(new Phaser.Geom.Rectangle(0, 0, 130, 36), Phaser.Geom.Rectangle.Contains);
        if (retryBtn.input) retryBtn.input.cursor = 'pointer';

        retryBtn.on('pointerdown', (p: Phaser.Input.Pointer) => {
          if (p.button !== 0 && p.button !== undefined) return;
          sound.playClick();
          refreshList();
        });

        rowsContainer.add([errIcon, errText, retryBtn]);
        return;
      }

      // Offline warning indicator banner if applicable
      if (result.isOfflineFallback) {
        const warnY = tableHeaderY + 34;
        const warnBg = scene.add.graphics();
        warnBg.fillStyle(0x7c2d12, 0.85);
        warnBg.lineStyle(1, 0xf97316, 1);
        warnBg.fillRoundedRect(cardX - (cardWidth - 50) / 2, warnY - 14, cardWidth - 50, 28, 8);
        warnBg.strokeRoundedRect(cardX - (cardWidth - 50) / 2, warnY - 14, cardWidth - 50, 28, 8);

        const warnText = scene.add.text(cardX, warnY, '📡 Offline Mode: Displaying saved local high score.', {
          fontFamily: "'Fredoka', sans-serif",
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#fdba74',
        }).setOrigin(0.5);
        rowsContainer.add([warnBg, warnText]);
      }

      if (result.entries.length === 0) {
        const emptyY = tableHeaderY + 140;
        const emptyText = scene.add.text(cardX, emptyY, 'No scores recorded yet!\nBe the first family champion! 🎈', {
          fontFamily: "'Fredoka', sans-serif",
          fontSize: '20px',
          fontStyle: 'bold',
          color: '#94a3b8',
          align: 'center',
          lineSpacing: 8,
        }).setOrigin(0.5);
        rowsContainer.add(emptyText);
        return;
      }

      // Display top 10 players
      const startRowY = result.isOfflineFallback ? tableHeaderY + 64 : tableHeaderY + 34;
      const rowHeight = 38;
      const maxRows = Math.min(result.entries.length, 10);
      const playerColX = getColPlayerX();

      for (let i = 0; i < maxRows; i++) {
        const entry = result.entries[i];
        const rowY = startRowY + i * rowHeight;
        const isFirst = entry.rank === 1;
        const isCurrent = entry.isCurrentUser;

        // Row background pill
        const rowBg = scene.add.graphics();
        const rowW = cardWidth - 50;

        if (isFirst) {
          rowBg.fillStyle(0x78350f, 0.7);
          rowBg.lineStyle(1.5, 0xf59e0b, 1);
          rowBg.fillRoundedRect(cardX - rowW / 2, rowY - 16, rowW, 32, 10);
          rowBg.strokeRoundedRect(cardX - rowW / 2, rowY - 16, rowW, 32, 10);
        } else if (isCurrent) {
          rowBg.fillStyle(0x1e3a8a, 0.7);
          rowBg.lineStyle(1.5, 0x38bdf8, 1);
          rowBg.fillRoundedRect(cardX - rowW / 2, rowY - 16, rowW, 32, 10);
          rowBg.strokeRoundedRect(cardX - rowW / 2, rowY - 16, rowW, 32, 10);
        } else if (i % 2 === 1) {
          rowBg.fillStyle(0x312e81, 0.35);
          rowBg.fillRoundedRect(cardX - rowW / 2, rowY - 16, rowW, 32, 10);
        }
        rowsContainer.add(rowBg);

        // Rank label (🥇🥈🥉 for top 3)
        let rankStr = `#${entry.rank}`;
        let rankColor = '#cbd5e1';
        if (entry.rank === 1) {
          rankStr = '🥇 #1';
          rankColor = '#fef08a';
        } else if (entry.rank === 2) {
          rankStr = '🥈 #2';
          rankColor = '#e2e8f0';
        } else if (entry.rank === 3) {
          rankStr = '🥉 #3';
          rankColor = '#fdba74';
        }

        const rankText = scene.add.text(colRankX, rowY, rankStr, {
          fontFamily: "'Fredoka', sans-serif",
          fontSize: '16px',
          fontStyle: 'bold',
          color: rankColor,
        }).setOrigin(0, 0.5);

        // Player name
        const maxNickLen = currentMode === 'endless' ? 9 : 13;
        const nickDisplay = entry.nickname.length > maxNickLen ? `${entry.nickname.substring(0, maxNickLen - 1)}…` : entry.nickname;
        const playerText = scene.add.text(playerColX, rowY, nickDisplay, {
          fontFamily: "'Fredoka', sans-serif",
          fontSize: '16px',
          fontStyle: 'bold',
          color: isFirst ? '#fef08a' : (isCurrent ? '#38bdf8' : '#ffffff'),
        }).setOrigin(0, 0.5);

        rowsContainer.add([rankText, playerText]);

        let nextBadgeX = playerColX + playerText.width + 8;

        // 👑 Family Champion badge for Rank 1
        if (isFirst) {
          const champBadge = scene.add.text(nextBadgeX, rowY, '👑 Family Champion', {
            fontFamily: "'Fredoka', sans-serif",
            fontSize: '10px',
            fontStyle: 'bold',
            color: '#78350f',
            backgroundColor: '#fef08a',
            padding: { left: 5, right: 5, top: 2, bottom: 2 },
          }).setOrigin(0, 0.5);
          rowsContainer.add(champBadge);
          nextBadgeX += champBadge.width + 6;
        }

        // YOU badge for current user
        if (isCurrent) {
          const youBadge = scene.add.text(nextBadgeX, rowY, 'YOU', {
            fontFamily: "'Fredoka', sans-serif",
            fontSize: '10px',
            fontStyle: 'bold',
            color: '#4ade80',
            backgroundColor: '#14532d',
            padding: { left: 4, right: 4, top: 2, bottom: 2 },
          }).setOrigin(0, 0.5);
          rowsContainer.add(youBadge);
        }

        // Survival time column (Endless Rush & One Life)
        if (isSurvival()) {
          const survText = scene.add.text(colSurvivalX, rowY, formatSurvivalTime(entry.survivalTime), {
            fontFamily: "'Fredoka', sans-serif",
            fontSize: '15px',
            fontStyle: 'bold',
            color: isFirst ? '#fef08a' : '#cbd5e1',
          }).setOrigin(0.5, 0.5);
          rowsContainer.add(survText);
        }

        // Score column
        const scoreStr = entry.score.toLocaleString();
        const scoreText = scene.add.text(colScoreX, rowY, scoreStr, {
          fontFamily: "'Fredoka', sans-serif",
          fontSize: '17px',
          fontStyle: 'bold',
          color: isFirst ? '#fef08a' : '#38bdf8',
        }).setOrigin(1, 0.5);

        rowsContainer.add(scoreText);
      }
    };

    // Initial load
    refreshList();

    // Modal Entrance Animation
    container.setScale(0.9);
    container.setAlpha(0);
    scene.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });

    const escKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    const escListener = () => {
      doClose();
      escKey?.removeListener('down', escListener);
    };
    escKey?.once('down', escListener);

    return container;
  }

  /**
   * Displays the 4 background themes selector modal with thumbnails,
   * active indicator, and immediate preview.
   */
  public static showThemeSelector(
    scene: Phaser.Scene,
    onSelect?: (themeId: BackgroundThemeId) => void,
    onClose?: () => void
  ): Phaser.GameObjects.Container {
    const { width, height } = scene.cameras.main;
    const container = scene.add.container(0, 0).setDepth(200);
    const sound = SoundService.getInstance();
    const storage = StorageService.getInstance();
    let currentThemeId = storage.getBackgroundTheme();

    // Dim background overlay
    const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x0f172a, 0.90);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    container.add(overlay);

    const cardWidth = Math.min(width * 0.92, 580);
    const cardHeight = Math.min(height * 0.82, 680);
    const cardX = width / 2;
    const cardY = height / 2;

    const card = scene.add.graphics();
    card.fillStyle(0x1e1b4b, 0.98);
    card.lineStyle(3, 0xa855f7, 1);
    card.fillRoundedRect(cardX - cardWidth / 2, cardY - cardHeight / 2, cardWidth, cardHeight, 24);
    card.strokeRoundedRect(cardX - cardWidth / 2, cardY - cardHeight / 2, cardWidth, cardHeight, 24);
    container.add(card);

    // Header Title
    const headerY = cardY - cardHeight / 2 + 40;
    const title = scene.add.text(cardX, headerY, '🎨 BACKGROUND THEMES', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#c084fc',
      stroke: '#0f172a',
      strokeThickness: 4,
    }).setOrigin(0.5);

    const sub = scene.add.text(cardX, headerY + 34, 'Choose your visual arcade atmosphere:', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '15px',
      color: '#cbd5e1',
    }).setOrigin(0.5);

    container.add([title, sub]);

    // Close button (X) top right
    const closeBtnX = cardX + cardWidth / 2 - 32;
    const closeBtnY = headerY;
    const closeBtn = scene.add.container(closeBtnX, closeBtnY);
    const closeBg = scene.add.circle(0, 0, 18, 0x334155, 0.9);
    closeBg.setStrokeStyle(1.5, 0x94a3b8);
    const closeText = scene.add.text(0, -1, '✕', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    closeBtn.add([closeBg, closeText]);
    closeBtn.setSize(36, 36);
    closeBtn.setInteractive(new Phaser.Geom.Circle(18, 18, 18), Phaser.Geom.Circle.Contains);
    if (closeBtn.input) closeBtn.input.cursor = 'pointer';

    let isClosed = false;
    const doClose = () => {
      if (isClosed) return;
      isClosed = true;
      sound.playClick();
      container.destroy();
      if (onClose) onClose();
    };

    closeBtn.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.button !== 0 && p.button !== undefined) return;
      doClose();
    });
    container.add(closeBtn);

    // 2x2 Grid of Themes
    const themeList: BackgroundThemeId[] = ['dreamy_sky', 'neon_night', 'candy_world', 'space_rush'];
    const colSpacing = 240;
    const rowSpacing = 200;
    const gridStartY = cardY - 60;
    const themeCards: { id: BackgroundThemeId; updateStatus: () => void }[] = [];

    themeList.forEach((themeId, idx) => {
      const config = BACKGROUND_THEMES[themeId];
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const tX = cardX + (col === 0 ? -colSpacing / 2 : colSpacing / 2);
      const tY = gridStartY + row * rowSpacing;

      const tCard = scene.add.container(tX, tY);
      const tCardW = 224;
      const tCardH = 175;

      const tBg = scene.add.graphics();
      tCard.add(tBg);

      // Thumbnail Image
      if (scene.textures.exists(config.textureKey)) {
        const thumb = scene.add.image(0, -25, config.textureKey);
        thumb.setDisplaySize(tCardW - 16, 95);
        tCard.add(thumb);
      }

      // Title & Emoji
      const tTitle = scene.add.text(0, 36, `${config.emoji} ${config.name}`, {
        fontFamily: "'Fredoka', sans-serif",
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0.5);
      tCard.add(tTitle);

      // Active / Select Badge
      const statusBg = scene.add.graphics();
      const statusText = scene.add.text(0, 64, '', {
        fontFamily: "'Fredoka', sans-serif",
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0.5);
      tCard.add([statusBg, statusText]);

      const updateCardStatus = () => {
        const isActive = currentThemeId === themeId;
        tBg.clear();
        tBg.fillStyle(0x0f172a, 0.9);
        tBg.lineStyle(isActive ? 3 : 1.5, isActive ? 0x10b981 : 0x475569, 1);
        tBg.fillRoundedRect(-tCardW / 2, -tCardH / 2, tCardW, tCardH, 16);
        tBg.strokeRoundedRect(-tCardW / 2, -tCardH / 2, tCardW, tCardH, 16);

        statusBg.clear();
        if (isActive) {
          statusBg.fillStyle(0x10b981, 1);
          statusBg.fillRoundedRect(-50, 52, 100, 24, 12);
          statusText.setText('✓ ACTIVE');
          statusText.setColor('#ffffff');
        } else {
          statusBg.fillStyle(0x334155, 0.8);
          statusBg.fillRoundedRect(-45, 52, 90, 24, 12);
          statusText.setText('SELECT');
          statusText.setColor('#94a3b8');
        }
      };

      updateCardStatus();
      themeCards.push({ id: themeId, updateStatus: updateCardStatus });

      tCard.setSize(tCardW, tCardH);
      tCard.setInteractive(new Phaser.Geom.Rectangle(0, 0, tCardW, tCardH), Phaser.Geom.Rectangle.Contains);
      if (tCard.input) tCard.input.cursor = 'pointer';

      tCard.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (p.button !== 0 && p.button !== undefined) return;
        sound.playClick();
        currentThemeId = themeId;
        storage.saveBackgroundTheme(themeId);
        themeCards.forEach((c) => c.updateStatus());
        if (onSelect) onSelect(themeId);
      });

      tCard.on('pointerover', () => {
        scene.tweens.add({ targets: tCard, scaleX: 1.04, scaleY: 1.04, duration: 120 });
      });
      tCard.on('pointerout', () => {
        scene.tweens.add({ targets: tCard, scaleX: 1.0, scaleY: 1.0, duration: 120 });
      });

      container.add(tCard);
    });

    // Bottom Close Button
    const doneBtnY = cardY + cardHeight / 2 - 45;
    const doneBtn = scene.add.container(cardX, doneBtnY);
    const doneBg = scene.add.graphics();
    doneBg.fillStyle(0xa855f7, 1);
    doneBg.fillRoundedRect(-90, -22, 180, 44, 14);
    const doneText = scene.add.text(0, 0, 'DONE', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    doneBtn.add([doneBg, doneText]);
    doneBtn.setSize(180, 44);
    doneBtn.setInteractive(new Phaser.Geom.Rectangle(0, 0, 180, 44), Phaser.Geom.Rectangle.Contains);
    if (doneBtn.input) doneBtn.input.cursor = 'pointer';

    doneBtn.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.button !== 0 && p.button !== undefined) return;
      doClose();
    });
    container.add(doneBtn);

    // Entrance animation
    container.setScale(0.9);
    container.setAlpha(0);
    scene.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });

    const escKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    const escListener = () => {
      doClose();
      escKey?.removeListener('down', escListener);
    };
    escKey?.once('down', escListener);

    return container;
  }
}
