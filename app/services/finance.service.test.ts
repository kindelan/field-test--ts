import assert from "assert";
import { calculateProportionalInvoiceAllocation } from "../utils/financeCalculations.js";

function testProportionalAllocation() {
  const bikesKmData = [
    { id: "b1", bikecode: "Prob_01", km: 800 },
    { id: "b2", bikecode: "Prob_02", km: 200 }
  ];

  const amount = 1000;
  const result = calculateProportionalInvoiceAllocation(amount, bikesKmData);

  assert.strictEqual(result.totalInvoiceKm, 1000, "Total invoice km should be 1000");

  const b1 = result.bikesCalculated.find(b => b.bikecode === "Prob_01");
  const b2 = result.bikesCalculated.find(b => b.bikecode === "Prob_02");

  assert.ok(b1 && b2, "Both bikes should be present in calculations");

  // €1000 / 1000 km = €1.00/km
  // Prob_01: 800 km * €1.00/km = €800
  // Prob_02: 200 km * €1.00/km = €200
  assert.strictEqual(b1.allocatedAmount, 800, "Prob_01 should be allocated 800 EUR (80% of 1000 EUR)");
  assert.strictEqual(b2.allocatedAmount, 200, "Prob_02 should be allocated 200 EUR (20% of 1000 EUR)");
  assert.strictEqual(b1.costPerKm, 1.0, "Cost per km should be 1.0 EUR/km");
  assert.strictEqual(b2.costPerKm, 1.0, "Cost per km should be 1.0 EUR/km");

  console.log("  ✅ should allocate invoice amount proportionally based on kilometers");
}

function testZeroKmFallback() {
  const bikesKmData = [
    { id: "b1", bikecode: "Prob_01", km: 0 },
    { id: "b2", bikecode: "Prob_02", km: 0 }
  ];

  const amount = 500;
  const result = calculateProportionalInvoiceAllocation(amount, bikesKmData);

  assert.strictEqual(result.totalInvoiceKm, 0, "Total invoice km should be 0");

  const b1 = result.bikesCalculated.find(b => b.bikecode === "Prob_01");
  const b2 = result.bikesCalculated.find(b => b.bikecode === "Prob_02");

  assert.ok(b1 && b2, "Both bikes should be present");
  assert.strictEqual(b1.allocatedAmount, 250, "Prob_01 should fallback to equal 250 EUR split");
  assert.strictEqual(b2.allocatedAmount, 250, "Prob_02 should fallback to equal 250 EUR split");
  assert.strictEqual(b1.costPerKm, null, "Cost per km should be null when km is 0");

  console.log("  ✅ should fallback to equal split when total km is 0");
}

export function runFinanceServiceTests() {
  console.log("📦 Finance Calculations");
  testProportionalAllocation();
  testZeroKmFallback();
}
