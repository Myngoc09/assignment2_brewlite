export function linePrice(sizePrice: number, toppingPrices: number[], quantity: number) {
  const unitPrice = toppingPrices.reduce((total, topping) => total + topping, sizePrice);
  return { unitPrice, lineTotal: unitPrice * quantity };
}

export function orderDiscount(subtotal: number, discountPercent: number) {
  return Math.floor((subtotal * discountPercent) / 100);
}
