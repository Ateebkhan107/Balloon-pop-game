import { BALLOON_COLORS, BalloonTheme } from './AssetGenerator';

export class ColorRushManager {
  private activeColorKey: string;
  private previousColorKey: string;
  private switchTimer: number = 0;
  private switchInterval: number = 7.0; // Seconds between color switches
  private lastSwitchTimestamp: number = 0;
  private readonly GRACE_PERIOD_MS: number = 600; // 600ms grace window for fair taps on color switch

  private availableColors: string[] = ['red', 'blue', 'green', 'yellow', 'purple'];
  private onColorChanged?: (newColor: BalloonTheme, prevColor: BalloonTheme) => void;
  private onWarningStarted?: () => void;
  private warningFired: boolean = false;

  constructor(initialInterval: number = 7.0) {
    this.switchInterval = initialInterval;
    this.activeColorKey = this.availableColors[Math.floor(Math.random() * this.availableColors.length)];
    this.previousColorKey = this.activeColorKey;
  }

  public setCallbacks(
    onColorChanged: (newColor: BalloonTheme, prevColor: BalloonTheme) => void,
    onWarningStarted?: () => void
  ): void {
    this.onColorChanged = onColorChanged;
    this.onWarningStarted = onWarningStarted;
  }

  public setInterval(interval: number): void {
    this.switchInterval = Math.max(3.5, interval);
  }

  public getActiveTheme(): BalloonTheme {
    return BALLOON_COLORS[this.activeColorKey] || BALLOON_COLORS.red;
  }

  public getActiveColorKey(): string {
    return this.activeColorKey;
  }

  public update(dt: number, currentTimeMs: number): boolean {
    this.switchTimer += dt;

    // Fire warning 1 second before color changes
    if (this.switchTimer >= this.switchInterval - 1.0 && !this.warningFired) {
      this.warningFired = true;
      if (this.onWarningStarted) this.onWarningStarted();
    }

    if (this.switchTimer >= this.switchInterval) {
      this.switchTimer = 0;
      this.warningFired = false;
      this.triggerColorSwitch(currentTimeMs);
      return true;
    }
    return false;
  }

  public triggerColorSwitch(currentTimeMs: number): void {
    this.previousColorKey = this.activeColorKey;
    this.lastSwitchTimestamp = currentTimeMs;

    // Pick a different color
    const otherColors = this.availableColors.filter((c) => c !== this.activeColorKey);
    this.activeColorKey = otherColors[Math.floor(Math.random() * otherColors.length)];

    if (this.onColorChanged) {
      this.onColorChanged(this.getActiveTheme(), BALLOON_COLORS[this.previousColorKey]);
    }
  }

  /**
   * Checks if a tapped balloon color matches the target, including grace period check!
   */
  public isMatchingColor(colorKey: string, currentTimeMs: number): { isMatch: boolean; isGrace: boolean } {
    if (colorKey === this.activeColorKey) {
      return { isMatch: true, isGrace: false };
    }

    // Fairness check: did user tap the previous target color within the grace period?
    const timeSinceSwitch = currentTimeMs - this.lastSwitchTimestamp;
    if (timeSinceSwitch <= this.GRACE_PERIOD_MS && colorKey === this.previousColorKey) {
      return { isMatch: true, isGrace: true };
    }

    return { isMatch: false, isGrace: false };
  }

  public getProgress(): number {
    return Math.min(1, this.switchTimer / this.switchInterval);
  }
}
