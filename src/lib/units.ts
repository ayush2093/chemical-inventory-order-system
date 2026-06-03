import { Prisma } from '@prisma/client';

export type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

export type Dimension = 'WEIGHT' | 'VOLUME' | 'COUNT';

export interface UnitInfo {
  unit: string;
  name: string;
  factor: Decimal; // Multiply by this to get base unit value
}

export const DIMENSIONS: Record<Dimension, { baseUnit: string; units: Record<string, UnitInfo> }> = {
  WEIGHT: {
    baseUnit: 'g',
    units: {
      g: { unit: 'g', name: 'Grams', factor: new Decimal(1) },
      kg: { unit: 'kg', name: 'Kilograms', factor: new Decimal(1000) },
    },
  },
  VOLUME: {
    baseUnit: 'mL',
    units: {
      mL: { unit: 'mL', name: 'Milliliters', factor: new Decimal(1) },
      L: { unit: 'L', name: 'Liters', factor: new Decimal(1000) },
    },
  },
  COUNT: {
    baseUnit: 'items',
    units: {
      items: { unit: 'items', name: 'Items', factor: new Decimal(1) },
    },
  },
};

// Flattened lookup of units
export const UNIT_LOOKUP: Record<string, { dimension: Dimension; info: UnitInfo }> = {};
for (const [dim, config] of Object.entries(DIMENSIONS)) {
  for (const [unitKey, info] of Object.entries(config.units)) {
    UNIT_LOOKUP[unitKey] = {
      dimension: dim as Dimension,
      info,
    };
  }
}

/**
 * Validates if the selected unit matches the product's dimension.
 */
export function isValidUnitForDimension(unit: string, dimension: string): boolean {
  const lookup = UNIT_LOOKUP[unit];
  if (!lookup) return false;
  return lookup.dimension === dimension;
}

/**
 * Converts a quantity from a source unit to the dimension's base unit.
 * Example: convertToBase(2.5, 'kg') -> 2500
 */
export function convertToBase(quantity: number | Decimal | string, unit: string): Decimal {
  const lookup = UNIT_LOOKUP[unit];
  if (!lookup) throw new Error(`Unknown unit: ${unit}`);
  const q = new Decimal(quantity);
  return q.mul(lookup.info.factor);
}

/**
 * Converts a quantity from the base unit of its dimension to a target unit.
 * Example: convertFromBase(2500, 'kg') -> 2.5
 */
export function convertFromBase(quantityInBase: number | Decimal | string, targetUnit: string): Decimal {
  const lookup = UNIT_LOOKUP[targetUnit];
  if (!lookup) throw new Error(`Unknown unit: ${targetUnit}`);
  const q = new Decimal(quantityInBase);
  return q.div(lookup.info.factor);
}

/**
 * Calculates the unit price for a target unit based on the base price (price per 1 base unit).
 * Example: getUnitPriceForTargetUnit(5, 'kg') -> 5 * 1000 = 5000 (if base unit is grams)
 */
export function getUnitPriceForTargetUnit(basePricePerBaseUnit: number | Decimal | string, targetUnit: string): Decimal {
  const lookup = UNIT_LOOKUP[targetUnit];
  if (!lookup) throw new Error(`Unknown unit: ${targetUnit}`);
  const basePrice = new Decimal(basePricePerBaseUnit);
  return basePrice.mul(lookup.info.factor);
}

/**
 * Calculates the total cost for an ordered quantity in target unit.
 * Example: calculateTotal(2.5, 'kg', 5) -> 2.5 * (5 * 1000) = 12500 (if base price is 5 INR/g)
 */
export function calculateTotal(
  orderedQuantity: number | Decimal | string,
  orderedUnit: string,
  basePricePerBaseUnit: number | Decimal | string
): Decimal {
  const unitPrice = getUnitPriceForTargetUnit(basePricePerBaseUnit, orderedUnit);
  return new Decimal(orderedQuantity).mul(unitPrice);
}
