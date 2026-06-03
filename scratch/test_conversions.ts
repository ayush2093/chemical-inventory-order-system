import { convertToBase, convertFromBase, getUnitPriceForTargetUnit, calculateTotal } from '../src/lib/units';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

async function runTests() {
  console.log('Running unit conversion tests...');

  // Test 1: Weight Conversions
  // Convert 2.5 kg to grams (base unit)
  const baseWeight = convertToBase('2.5', 'kg');
  assert(baseWeight.equals('2500'), `2.5 kg should equal 2500 g, got ${baseWeight.toString()}`);

  // Convert 2500 g back to kg
  const convertedWeight = convertFromBase('2500', 'kg');
  assert(convertedWeight.equals('2.5'), `2500 g should equal 2.5 kg, got ${convertedWeight.toString()}`);

  // Test 2: Volume Conversions
  // Convert 1.5 L to mL
  const baseVolume = convertToBase('1.5', 'L');
  assert(baseVolume.equals('1500'), `1.5 L should equal 1500 mL, got ${baseVolume.toString()}`);

  // Convert 1500 mL back to L
  const convertedVolume = convertFromBase('1500', 'L');
  assert(convertedVolume.equals('1.5'), `1500 mL should equal 1.5 L, got ${convertedVolume.toString()}`);

  // Test 3: Count Conversions
  const baseCount = convertToBase('10', 'items');
  assert(baseCount.equals('10'), `10 items should equal 10 items, got ${baseCount.toString()}`);

  // Test 4: Pricing calculation
  // Compound base price: 5 INR per Gram.
  // Order: 2.5 kg
  // Expected rate per kg = 5 * 1000 = 5000 INR/kg
  // Expected total = 2.5 * 5000 = 12500 INR
  const ratePerKg = getUnitPriceForTargetUnit('5.0000', 'kg');
  assert(ratePerKg.equals('5000'), `Rate per kg for 5 INR/g should be 5000, got ${ratePerKg.toString()}`);

  const totalCost = calculateTotal('2.5', 'kg', '5.0000');
  assert(totalCost.equals('12500'), `Total cost for 2.5 kg at 5 INR/g should be 12500, got ${totalCost.toString()}`);

  // High Precision Decimal Test
  // E.g. extremely small quantities (0.000015 kg)
  // Base: 0.000015 * 1000 = 0.015 g
  const microWeight = convertToBase('0.000015', 'kg');
  assert(microWeight.equals('0.015'), `0.000015 kg should be 0.015 g, got ${microWeight.toString()}`);

  console.log('All tests passed successfully!');
}

runTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
