import Phaser from 'phaser';

export type BalloonType = 'normal' | 'golden' | 'hazard';

export interface BalloonConfig {
  type: BalloonType;
  colorKey?: string;
  speed: number;
  swayAmplitude: number;
  swayFrequency: number;
  startX: number;
  startY: number;
  scoreValue: number;
}

export class Balloon extends Phaser.GameObjects.Sprite {
  public balloonType: BalloonType;
  public scoreValue: number;
  public isPopped: boolean = false;

  private speed: number;
  private swayAmplitude: number;
  private swayFrequency: number;
  private startX: number;
  private timeOffset: number;
  private floatTime: number = 0;

  constructor(scene: Phaser.Scene, config: BalloonConfig) {
    let texture = 'balloon_red';
    if (config.type === 'golden') {
      texture = 'balloon_golden';
    } else if (config.type === 'hazard') {
      texture = 'balloon_hazard';
    } else if (config.colorKey) {
      texture = `balloon_${config.colorKey}`;
    }

    super(scene, config.startX, config.startY, texture);

    this.balloonType = config.type;
    this.scoreValue = config.scoreValue;
    this.speed = config.speed;
    this.swayAmplitude = config.swayAmplitude;
    this.swayFrequency = config.swayFrequency;
    this.startX = config.startX;
    this.timeOffset = Math.random() * Math.PI * 2;

    scene.add.existing(this);

    // Hit area centered on the balloon body (width 120, height 170)
    // Local display origin is at (60, 85); body center is at (60, 60)
    this.setInteractive(
      new Phaser.Geom.Circle(60, 60, 56),
      Phaser.Geom.Circle.Contains
    );
    if (this.input) {
      this.input.cursor = 'pointer';
    }

    // Spawn pop-in animation
    this.setScale(0);
    scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 320,
      ease: 'Back.easeOut',
    });
  }

  public update(_time: number, delta: number): boolean {
    // If popped or escaping, tell GameScene this balloon is no longer active
    if (this.isPopped) return false;

    const dt = delta / 1000;
    this.floatTime += dt;

    // Upward float
    this.y -= this.speed * dt;

    // Horizontal swaying
    const sway = Math.sin(this.floatTime * this.swayFrequency + this.timeOffset) * this.swayAmplitude;
    this.x = this.startX + sway;

    // Gentle tilt
    this.rotation = Math.sin(this.floatTime * this.swayFrequency * 0.8) * 0.08;

    // Play boundary ceiling: despawn cleanly before overlapping HUD (y = 135)
    if (this.y < 135) {
      this.escape();
      return false;
    }

    return true;
  }

  public pop(onComplete?: () => void): void {
    if (this.isPopped) return;
    this.isPopped = true;
    this.disableInteractive();

    if (!this.scene) {
      if (onComplete) onComplete();
      this.destroy();
      return;
    }

    // Stop any ongoing tweens (e.g., spawn bounce) so pop animation plays cleanly
    this.scene.tweens.killTweensOf(this);

    // Quick burst expand followed by shrink to 0 and destruction
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.25,
      scaleY: 1.25,
      alpha: 0.7,
      duration: 50,
      onComplete: () => {
        if (!this.scene) {
          if (onComplete) onComplete();
          this.destroy();
          return;
        }
        this.scene.tweens.add({
          targets: this,
          scaleX: 0,
          scaleY: 0,
          alpha: 0,
          duration: 80,
          onComplete: () => {
            if (onComplete) onComplete();
            this.destroy();
          },
        });
      },
    });
  }

  public escape(): void {
    if (this.isPopped) return;
    this.isPopped = true;
    this.disableInteractive();

    if (!this.scene) {
      this.destroy();
      return;
    }

    this.scene.tweens.killTweensOf(this);

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0.6,
      scaleY: 0.6,
      duration: 160,
      onComplete: () => {
        this.destroy();
      },
    });
  }
}
