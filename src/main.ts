import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#0f172a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720,
    height: 1080,
  },
  scene: [BootScene, MenuScene, GameScene, GameOverScene],
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  input: {
    activePointers: 3, // Multi-touch support for rapid mobile popping
  },
  render: {
    pixelArt: false,
    antialias: true,
  },
};

// Initialize game on window load
window.addEventListener('DOMContentLoaded', () => {
  const game = new Phaser.Game(config);
  (window as any).__POP_RUSH_GAME__ = game;
});
