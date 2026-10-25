import Phaser from 'phaser';
import { StorageService } from '../services/StorageService';
import { SoundService } from '../services/SoundService';

export class GameModals {
  public static showHowToPlay(scene: Phaser.Scene, onClose?: () => void): Phaser.GameObjects.Container {
    const { width, height } = scene.cameras.main;
    const container = scene.add.container(0, 0).setDepth(200);

    // Dim background overlay - absorbs clicks
    const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x0f172a, 0.85);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    container.add(overlay);

    // Modal Card
    const cardWidth = Math.min(width * 0.88, 540);
    const cardHeight = Math.min(height * 0.82, 720);
    const card = scene.add.graphics();
    card.fillStyle(0x1e1b4b, 0.98);
    card.lineStyle(4, 0x6366f1, 1);
    card.fillRoundedRect(width / 2 - cardWidth / 2, height / 2 - cardHeight / 2, cardWidth, cardHeight, 24);
    card.strokeRoundedRect(width / 2 - cardWidth / 2, height / 2 - cardHeight / 2, cardWidth, cardHeight, 24);
    container.add(card);

    // Title
    const title = scene.add.text(width / 2, height / 2 - cardHeight / 2 + 50, 'HOW TO PLAY', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#f43f5e',
      stroke: '#0f172a',
      strokeThickness: 4,
    }).setOrigin(0.5);
    container.add(title);

    // Subtitle / Intro
    const intro = scene.add.text(width / 2, height / 2 - cardHeight / 2 + 95, 'Pop as many balloons as you can in 30 seconds!', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '18px',
      color: '#cbd5e1',
      align: 'center',
    }).setOrigin(0.5);
    container.add(intro);

    // Balloon Types Guide
    const entriesY = height / 2 - cardHeight / 2 + 140;

    // Normal Balloon Item
    const normIcon = scene.add.sprite(width / 2 - cardWidth / 2 + 60, entriesY + 35, 'balloon_pink').setScale(0.45);
    const normText = scene.add.text(width / 2 - cardWidth / 2 + 110, entriesY + 20, 'NORMAL BALLOONS\n+100 pts x Combo. Builds speed multiplier.', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '17px',
      color: '#fbcfe8',
      lineSpacing: 4,
    });
    container.add([normIcon, normText]);

    // Golden Balloon Item
    const goldIcon = scene.add.sprite(width / 2 - cardWidth / 2 + 60, entriesY + 125, 'balloon_golden').setScale(0.45);
    const goldText = scene.add.text(width / 2 - cardWidth / 2 + 110, entriesY + 110, 'GOLDEN BALLOON (RARE)\n+300 pts & adds +2 SECONDS to your clock!', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '17px',
      color: '#fef08a',
      lineSpacing: 4,
    });
    container.add([goldIcon, goldText]);

    // Hazard Balloon Item
    const hazIcon = scene.add.sprite(width / 2 - cardWidth / 2 + 60, entriesY + 215, 'balloon_hazard').setScale(0.45);
    const hazText = scene.add.text(width / 2 - cardWidth / 2 + 110, entriesY + 200, 'HAZARD BALLOON (AVOID!)\n-200 pts, -3s clock penalty, & resets combo!', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '17px',
      color: '#fca5a5',
      lineSpacing: 4,
    });
    container.add([hazIcon, hazText]);

    // Combos & Controls
    const tipBox = scene.add.graphics();
    tipBox.fillStyle(0x312e81, 0.7);
    tipBox.fillRoundedRect(width / 2 - cardWidth / 2 + 30, entriesY + 290, cardWidth - 60, 110, 16);
    container.add(tipBox);

    const tipText = scene.add.text(width / 2, entriesY + 345, '🔥 SPEED COMBOS: Pop balloons in quick succession to reach up to 5X MULTIPLIER!\n\n🎮 CONTROLS: Click / Tap to pop. Press P or ESC to pause.', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '15px',
      color: '#e2e8f0',
      align: 'center',
      wordWrap: { width: cardWidth - 80 },
    }).setOrigin(0.5);
    container.add(tipText);

    // Close Button (200x50)
    const btnY = height / 2 + cardHeight / 2 - 55;
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

    // HitArea matches normalized container coordinates
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

    // Animation in
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

    // Close on ESC
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

    // Dim background overlay
    const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x0f172a, 0.85);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    container.add(overlay);

    // Modal Card
    const cardWidth = Math.min(width * 0.88, 520);
    const cardHeight = Math.min(height * 0.75, 580);
    const card = scene.add.graphics();
    card.fillStyle(0x1e1b4b, 0.98);
    card.lineStyle(4, 0xec4899, 1);
    card.fillRoundedRect(width / 2 - cardWidth / 2, height / 2 - cardHeight / 2, cardWidth, cardHeight, 24);
    card.strokeRoundedRect(width / 2 - cardWidth / 2, height / 2 - cardHeight / 2, cardWidth, cardHeight, 24);
    container.add(card);

    // Title
    const title = scene.add.text(width / 2, height / 2 - cardHeight / 2 + 50, 'SETTINGS', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#ec4899',
      stroke: '#0f172a',
      strokeThickness: 4,
    }).setOrigin(0.5);
    container.add(title);

    let rowY = height / 2 - cardHeight / 2 + 120;
    const rowSpacing = 75;

    // --- ROW 1: SOUND EFFECTS TOGGLE (100x40) ---
    const soundLabel = scene.add.text(width / 2 - cardWidth / 2 + 40, rowY, 'Sound Effects:', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '22px',
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

    // Animation in
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

    // Close on ESC
    const escKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    const escListener = () => {
      doClose();
      escKey?.removeListener('down', escListener);
    };
    escKey?.once('down', escListener);

    return container;
  }
}
