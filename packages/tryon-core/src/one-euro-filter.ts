/**
 * 1 Euro Filter implementation for noisy signal smoothing with minimal lag.
 * Reference: Casiez, G., Roussel, N. and Vogel, D. (2012).
 * 1 € Filter: A Simple Speed-based Low-pass Filter for Noisy Input in Human-Computer Interaction.
 */

class LowPassFilter {
  private y: number | null = null;
  private s: number | null = null;

  filter(value: number, alpha: number): number {
    if (this.y === null) {
      this.s = value;
      this.y = value;
      return value;
    }
    this.y = alpha * value + (1.0 - alpha) * this.s!;
    this.s = this.y;
    return this.y;
  }

  filterWithAlpha(value: number, alpha: number): number {
    return this.filter(value, alpha);
  }

  hasLastRawValue(): boolean {
    return this.y !== null;
  }

  last(): number | null {
    return this.y;
  }

  reset(): void {
    this.y = null;
    this.s = null;
  }
}

export interface OneEuroFilterConfig {
  minCutoff: number; // Min cutoff frequency (Hz)
  beta: number;      // Speed coefficient
  dCutoff?: number;  // Cutoff frequency for derivative (Hz)
}

export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xFilter: LowPassFilter;
  private dxFilter: LowPassFilter;
  private lastTime: number | null = null;

  constructor(config: OneEuroFilterConfig) {
    this.minCutoff = config.minCutoff;
    this.beta = config.beta;
    this.dCutoff = config.dCutoff ?? 1.0;
    this.xFilter = new LowPassFilter();
    this.dxFilter = new LowPassFilter();
  }

  private alpha(rate: number, cutoff: number): number {
    const tau = 1.0 / (2.0 * Math.PI * cutoff);
    const te = 1.0 / rate;
    return 1.0 / (1.0 + tau / te);
  }

  filter(x: number, timestampSec: number): number {
    if (this.lastTime === null || this.lastTime === timestampSec) {
      this.lastTime = timestampSec;
      return this.xFilter.filter(x, 1.0);
    }

    const dt = timestampSec - this.lastTime;
    this.lastTime = timestampSec;
    const rate = 1.0 / Math.max(dt, 1e-5);

    const prevX = this.xFilter.last() ?? x;
    const dx = (x - prevX) * rate;
    const edx = this.dxFilter.filterWithAlpha(dx, this.alpha(rate, this.dCutoff));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.xFilter.filterWithAlpha(x, this.alpha(rate, cutoff));
  }

  reset(): void {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastTime = null;
  }
}
