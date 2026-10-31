// Reçetede girilen birimi ürünün stok birimine çevirir.
const FACTORS = {
  kg: { kg: 1, g: 0.001 },
  lt: { lt: 1, ml: 0.001 },
  adet: { adet: 1 },
};

export const INPUT_UNITS = { kg: ['kg', 'g'], lt: ['lt', 'ml'], adet: ['adet'] };

export function toBaseUnit(quantity, inputUnit, productUnit) {
  const unit = inputUnit || productUnit;
  const factor = FACTORS[productUnit]?.[unit];
  if (factor === undefined) {
    throw new HttpError(400, `"${unit}" birimi "${productUnit}" birimli ürüne çevrilemez`);
  }
  return Number(quantity) * factor;
}

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function round(n, digits = 3) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
