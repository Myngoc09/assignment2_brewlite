import { describe, expect, it } from '@jest/globals';
import { linePrice, orderDiscount } from './order-pricing';

describe('checkout arithmetic', () => {
  it('prices size and toppings for each quantity', () => {
    expect(linePrice(49_000, [7_000], 2)).toEqual({
      unitPrice: 56_000,
      lineTotal: 112_000,
    });
  });

  it('floors percent discount to integer VND', () => {
    expect(orderDiscount(49_001, 10)).toBe(4_900);
  });
});
