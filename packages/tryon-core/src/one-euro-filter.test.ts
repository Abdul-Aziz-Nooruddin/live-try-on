import { describe, it, expect } from 'vitest';
import { OneEuroFilter } from './one-euro-filter.js';

describe('OneEuroFilter', () => {
  it('smooths high frequency noise while preserving trends', () => {
    const filter = new OneEuroFilter({ minCutoff: 1.0, beta: 0.007, dCutoff: 1.0 });
    
    // Feed constant signal with high-frequency jitter
    const outputs: number[] = [];
    const timestamps = [0.0, 0.033, 0.066, 0.099, 0.132, 0.165];
    const inputs = [10.0, 10.5, 9.6, 10.4, 9.7, 10.3];

    for (let i = 0; i < inputs.length; i++) {
      outputs.push(filter.filter(inputs[i]!, timestamps[i]!));
    }

    // First output is exact
    expect(outputs[0]).toBe(10.0);
    // Subsequent outputs should have lower variance than input jitter
    const inputVariance = inputs.slice(1).reduce((acc, v) => acc + Math.pow(v - 10.0, 2), 0);
    const outputVariance = outputs.slice(1).reduce((acc, v) => acc + Math.pow(v - 10.0, 2), 0);
    expect(outputVariance).toBeLessThan(inputVariance);
  });
});
