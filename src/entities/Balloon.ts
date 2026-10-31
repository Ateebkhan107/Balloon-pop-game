import Phaser from 'phaser';

export type BalloonType = 'normal' | 'golden' | 'hazard' | 'rainbow' | 'freeze';
export type TrickType = 'none' | 'zigzag' | 'speedster' | 'dodger';

export interface BalloonConfig {
  type: BalloonType;
  colorKey?: string;
  speed: number;
  swayAmplitude: number;
  swayFrequency: number;
  startX: number;
  startY: number;
  scoreValue: number;
  scale?: number;
  isSmall?: boolean;
  trickType?: TrickType;
  onEscape?: (balloon: Balloon) => void;
}

export class Balloon extends Phaser.GameObjects.Sprite {
  public balloonType: BalloonType;
  public colorKey: string;
  public scoreValue: number;
  public isPopped: boolean = false;
  public isFrozen: boolean = false;
  public targetScale: number = 1.0;
  public isSmall: boolean = false;
  public trickType: TrickType = 'none';

  private baseSpeed: number;
  private speed: number;
  private swayAmplitude: number;
  private swayFrequency: number;
  private startX: number;
  private timeOffset: number;
  private floatTime: number = 0;
  private hasDodged: boolean = false;
  private dodgeOffset: number = 0;
  private trickBadge?: Phaser.GameObjects.Text;
  private onEscapeCallback?: (balloon: Balloon) => void;

  constructor(scene: Phaser.Scene, config: BalloonConfig) {
    let texture = 'balloon_red';
    if (config.type === 'golden') {
      texture = 'balloon_golden';
    } else if (config.type === 'hazard') {
      texture = 'balloon_hazard';
    } else if (config.type === 'rainbow') {
      texture = 'balloon_rainbow';
    } else if (config.type === 'freeze') {
      texture = 'balloon_freeze';
    } else if (config.colorKey) {
      texture = `balloon_${config.colorKey}`;
    }

    super(scene, config.startX, config.startY, texture);

    this.balloonType = config.type;
    this.colorKey = config.colorKey || '';
    this.scoreValue = config.scoreValue;
    this.targetScale = config.scale !== undefined ? config.scale : 1.0;
    this.isSmall = config.isSmall || this.targetScale < 0.95;
    this.trickType = config.trickType || 'none';
    this.baseSpeed = config.speed;
    this.speed = config.speed;
    this.swayAmplitude = config.swayAmplitude;
    this.swayFrequency = config.swayFrequency;
    this.startX = config.startX;
    this.timeOffset = Math.random() * Math.PI * 2;
    this.onEscapeCallback = config.onEscape;

    scene.add.existing(this);

    // Hit area centered on the balloon body (width 120, height 170).
    // Ensure mobile accessibility: scale local hit circle so effective world radius is >= 48px
    const localHitRadius = Math.max(56, 48 / this.targetScale);
    this.setInteractive(
      new Phaser.Geom.Circle(60, 60, localHitRadius),
      Phaser.Geom.Circle.Contains
    );
    if (this.input) {
      this.input.cursor = 'pointer';
    }

    // Subtle visual indicator for trick balloons
    if (this.trickType !== 'none') {
      const badgeIcons: Record<TrickType, string> = {
        zigzag: '⚡',
        speedster: '💨',
        dodger: '🌀',
        none: '',
      };
      this.trickBadge = scene.add.text(
        this.x,
        this.y - 25 * this.targetScale,
        badgeIcons[this.trickType],
        {
          fontFamily: "'Fredoka', sans-serif",
          fontSize: '18px',
        }
      ).setOrigin(0.5).setDepth(this.depth + 1);
      this.trickBadge.setScale(0);
      this.trickBadge.setAlpha(0.85);

      scene.tweens.add({
        targets: this.trickBadge,
        scaleX: this.targetScale,
        scaleY: this.targetScale,
        duration: 320,
        ease: 'Back.easeOut',
      });
    }

    // Spawn pop-in animation scaled to target scale
    this.setScale(0);
    scene.tweens.add({
      targets: this,
      scaleX: this.targetScale,
      scaleY: this.targetScale,
      duration: 320,
      ease: 'Back.easeOut',
    });
  }

  public setFrozen(frozen: boolean): void {
    this.isFrozen = frozen;
    this.speed = frozen ? this.baseSpeed * 0.4 : this.baseSpeed;
    if (frozen) {
      this.setTint(0x7dd3fc);
    } else {
      this.clearTint();
    }
  }

  public update(_time: number, delta: number): boolean {
    if (this.isPopped) return false;

    const dt = delta / 1000;
    this.floatTime += dt;
    const sceneWidth = this.scene?.cameras?.main?.width || 720;
    const minX = 48;
    const maxX = sceneWidth - 48;

    if (this.trickType === 'zigzag') {
      // 1. ZIGZAG: smooth sinusoidal horizontal oscillation
      this.y -= this.speed * dt;
      const zigzagOffset = Math.sin(this.floatTime * 3.4 + this.timeOffset) * Math.min(65, this.swayAmplitude * 2.2);
      this.x = Phaser.Math.Clamp(this.startX + zigzagOffset, minX, maxX);
      this.rotation = Math.sin(this.floatTime * 3.4 + this.timeOffset) * 0.12;
    } else if (this.trickType === 'speedster') {
      // 2. SPEEDSTER: starts at normal speed and accelerates upward (capped for mobile accessibility)
      this.speed = Math.min(this.baseSpeed * 1.55, this.baseSpeed + this.floatTime * 48);
      this.y -= this.speed * dt;
      const sway = Math.sin(this.floatTime * this.swayFrequency + this.timeOffset) * this.swayAmplitude;
      this.x = Phaser.Math.Clamp(this.startX + sway, minX, maxX);
      this.rotation = Math.sin(this.floatTime * this.swayFrequency * 0.8) * 0.08;
    } else if (this.trickType === 'dodger') {
      // 3. DODGER: sidesteps smoothly upon reaching upper playfield
      if (this.y <= 620 && !this.hasDodged) {
        this.hasDodged = true;
        const shiftDir = this.startX > sceneWidth / 2 ? -1 : 1;
        this.dodgeOffset = shiftDir * 80;
      }

      this.y -= this.speed * dt;

      if (this.hasDodged) {
        const targetX = Phaser.Math.Clamp(this.startX + this.dodgeOffset, minX, maxX);
        this.x += (targetX - this.x) * Math.min(1.0, dt * 5.0);
        this.rotation = Math.sin(this.floatTime * this.swayFrequency * 0.8) * 0.10;
      } else {
        const sway = Math.sin(this.floatTime * this.swayFrequency + this.timeOffset) * this.swayAmplitude;
        this.x = Phaser.Math.Clamp(this.startX + sway, minX, maxX);
        this.rotation = Math.sin(this.floatTime * this.swayFrequency * 0.8) * 0.08;
      }
    } else {
      // Normal balloon float
      this.y -= this.speed * dt;
      const sway = Math.sin(this.floatTime * this.swayFrequency + this.timeOffset) * this.swayAmplitude;
      this.x = Phaser.Math.Clamp(this.startX + sway, minX, maxX);
      this.rotation = Math.sin(this.floatTime * this.swayFrequency * 0.8) * 0.08;
    }

    // Keep badge aligned with balloon
    if (this.trickBadge && this.trickBadge.active) {
      this.trickBadge.setPosition(this.x, this.y - 25 * this.targetScale);
      this.trickBadge.setRotation(this.rotation);
      this.trickBadge.setAlpha(this.alpha * 0.85);
      this.trickBadge.setScale(this.scaleX);
    }

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

    if (this.trickBadge) {
      this.trickBadge.destroy();
      this.trickBadge = undefined;
    }

    if (!this.scene) {
      if (onComplete) onComplete();
      this.destroy();
      return;
    }

    this.scene.tweens.killTweensOf(this);

    this.scene.tweens.add({
      targets: this,
      scaleX: this.targetScale * 1.25,
      scaleY: this.targetScale * 1.25,
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

    if (this.trickBadge) {
      this.trickBadge.destroy();
      this.trickBadge = undefined;
    }

    if (this.onEscapeCallback) {
      this.onEscapeCallback(this);
    }

    if (!this.scene) {
      this.destroy();
      return;
    }

    this.scene.tweens.killTweensOf(this);

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: this.targetScale * 0.6,
      scaleY: this.targetScale * 0.6,
      duration: 160,
      onComplete: () => {
        this.destroy();
      },
    });
  }

  public destroy(fromScene?: boolean): void {
    if (this.trickBadge) {
      this.trickBadge.destroy();
      this.trickBadge = undefined;
    }
    super.destroy(fromScene);
  }
}
