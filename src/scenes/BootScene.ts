import Phaser from 'phaser';
import { AssetGenerator } from '../services/AssetGenerator';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  public preload(): void {
    // Load background theme artworks
    this.load.image('bg_sky', './assets/game.jpg');
    this.load.image('bg_dreamy_sky', './assets/bg_dreamy_sky.jpg');
    this.load.image('bg_neon_night', './assets/bg_neon_night.jpg');
    this.load.image('bg_candy_world', './assets/bg_candy_world.jpg');
    this.load.image('bg_space_rush', './assets/bg_space_rush.jpg');
    this.load.image('balloon_legacy', './assets/game2.jpg.png');
  }

  public create(): void {
    // Generate all procedural arcade textures
    AssetGenerator.generateAllTextures(this);

    // Hide DOM loading spinner
    const loader = document.getElementById('loading-screen');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => {
        loader.style.display = 'none';
      }, 400);
    }

    // Transition to Menu
    this.scene.start('MenuScene');
  }
}
