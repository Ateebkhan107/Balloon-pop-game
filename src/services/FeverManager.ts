export class FeverManager {
  public static readonly REQUIRED_POPS: number = 10;
  public static readonly FEVER_DURATION: number = 5.0; // 5.0 seconds

  private consecutivePops: number = 0; // 0 to 10
  private isFeverActive: boolean = false;
  private feverTimer: number = 0;

  private onFeverStart?: () => void;
  private onFeverEnd?: () => void;

  public setCallbacks(onFeverStart: () => void, onFeverEnd: () => void): void {
    this.onFeverStart = onFeverStart;
    this.onFeverEnd = onFeverEnd;
  }

  /**
   * Records a correct-color pop.
   * Builds the Fever meter towards 10 consecutive pops.
   * When 10 is reached, activates 5-second Fever Mode.
   */
  public recordCorrectPop(): boolean {
    if (this.isFeverActive) return false;

    this.consecutivePops = Math.min(FeverManager.REQUIRED_POPS, this.consecutivePops + 1);

    if (this.consecutivePops >= FeverManager.REQUIRED_POPS) {
      this.activateFever();
      return true;
    }
    return false;
  }

  /**
   * Wrong-color pop or bomb hit breaks Fever streak and resets meter to 0.
   */
  public recordWrongPop(): void {
    if (!this.isFeverActive) {
      this.consecutivePops = 0;
    }
  }

  public recordBombHit(): void {
    if (!this.isFeverActive) {
      this.consecutivePops = 0;
    }
  }

  /**
   * Backward-compatible helper for legacy test suites
   */
  public addCharge(amount: number): boolean {
    if (this.isFeverActive) return false;
    // Map amount to pops or directly charge to 100
    if (amount >= 100) {
      this.activateFever();
      return true;
    }
    const popsToAdd = Math.max(1, Math.round(amount / 10));
    for (let i = 0; i < popsToAdd; i++) {
      if (this.recordCorrectPop()) return true;
    }
    return false;
  }

  public deductCharge(_amount?: number): void {
    this.recordWrongPop();
  }

  public getConsecutivePops(): number {
    return this.consecutivePops;
  }

  /**
   * Returns meter percentage (0 to 100).
   * While Fever is active, returns percentage of remaining duration.
   */
  public getCharge(): number {
    if (this.isFeverActive) {
      return (this.feverTimer / FeverManager.FEVER_DURATION) * 100;
    }
    return (this.consecutivePops / FeverManager.REQUIRED_POPS) * 100;
  }

  public getProgress(): number {
    if (this.isFeverActive) {
      return Math.max(0, this.feverTimer / FeverManager.FEVER_DURATION);
    }
    return Math.min(1, this.consecutivePops / FeverManager.REQUIRED_POPS);
  }

  public isActive(): boolean {
    return this.isFeverActive;
  }

  public getRemainingTime(): number {
    return Math.max(0, this.feverTimer);
  }

  public activateFever(): void {
    this.isFeverActive = true;
    this.feverTimer = FeverManager.FEVER_DURATION;
    this.consecutivePops = 0; // Fresh reset for next cycle
    if (this.onFeverStart) {
      this.onFeverStart();
    }
  }

  public update(dt: number): void {
    if (!this.isFeverActive) return;

    this.feverTimer -= dt;

    if (this.feverTimer <= 0) {
      this.isFeverActive = false;
      this.feverTimer = 0;
      this.consecutivePops = 0; // Balanced reset rule: start from 0 after Fever expires
      if (this.onFeverEnd) {
        this.onFeverEnd();
      }
    }
  }

  public reset(): void {
    this.consecutivePops = 0;
    this.isFeverActive = false;
    this.feverTimer = 0;
  }
}
