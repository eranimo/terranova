export interface ITimerOptions {
  ticksLength: number;
  isRepeated?: boolean;
  onTick?: (ticksElapsed: number) => void;
  onFinished?: () => void;
}

export class Timer {
  options: ITimerOptions;
  ticksLeft: number;
  isActive: boolean;
  constructor(options: ITimerOptions) {
    this.options = options;
    this.isActive = false;
    this.ticksLeft = this.options.ticksLength;
  }
  update() {
    this.ticksLeft--;
    if (this.ticksLeft === 0) {
      if (this.options.onFinished) {
        this.options.onFinished();
      }
      if (this.options.isRepeated) {
        this.ticksLeft = this.options.ticksLength;
      }
      else {
        this.isActive = false;
      }
    }
    else {
      if (this.options.onTick) {
        this.options.onTick(this.options.ticksLength - this.ticksLeft);
      }
      this.isActive = true;
    }
  }
}
