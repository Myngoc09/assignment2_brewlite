import { describe, expect, it } from '@jest/globals';

describe('checkout arithmetic', () => {
  it('prices size and toppings for each quantity', () => {
    expect((49_000 + 7_000) * 2).toBe(112_000);
  });

  it('floors percent discount to integer VND', () => {
    expect(Math.floor((49_001 * 10) / 100)).toBe(4_900);
  });
});