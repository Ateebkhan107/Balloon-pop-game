export class FeverManager {
  private charge: number = 0; // 0 to 100
  private isFeverActive: boolean = false;
  private feverTimer: number = 0;
  private readonly FEVER_DURATION: number = 5.0; // 5.0 seconds of Fever Mode

  private onFeverStart?: () => void;
  private onFeverEnd?: () => void;

  public setCallbacks(onFeverStart: () => void, onFeverEnd: () => void): void {
    this.onFeverStart = onFeverStart;
    this.onFeverEnd = onFeverEnd;
  }

  public getCharge(): number {
    return this.charge;
  }

  public isActive(): boolean {
    return this.isFeverActive;
  }

  public getRemainingTime(): number {
    return Math.max(0, this.feverTimer);
  }

  public addCharge(amount: number): boolean {
    if (this.isFeverActive) return false;

    this.charge = Math.min(100, Math.max(0, this.charge + amount));

    if (this.charge >= 100) {
      this.activateFever();
      return true;
    }
    return false;
  }

  public deductCharge(amount: number): void {
    if (this.isFeverActive) return;
    this.charge = Math.max(0, this.charge - amount);
  }

  public activateFever(): void {
    this.charge = 100;
    this.isFeverActive = true;
    this.feverTimer = this.FEVER_DURATION;
    if (this.onFeverStart) {
      this.onFeverStart();
    }
  }

  public update(dt: number): void {
    if (!this.isFeverActive) return;

    this.feverTimer -= dt;
    this.charge = (this.feverTimer / this.FEVER_DURATION) * 100;

    if (this.feverTimer <= 0) {
      this.isFeverActive = false;
      this.charge = 0;
      this.feverTimer = 0;
      if (this.onFeverEnd) {
        this.onFeverEnd();
      }
    }
  }

  public reset(): void {
    this.charge = 0;
    this.isFeverActive = false;
    this.feverTimer = 0;
  }
}
