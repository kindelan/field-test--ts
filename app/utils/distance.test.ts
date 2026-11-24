import assert from "assert";
import { correctDistance } from "./distance.js";

export function runDistanceTests() {
  console.log("📦 correctDistance");

  const cases: Array<[string, number, number]> = [
    ["should keep normal distances under 100 km unchanged", 34.5, 34.5],
    ["should keep zero unchanged", 0, 0],
    ["should normalize 3-digit values by dividing by 10", 150, 15],
    ["should normalize 4-digit values by dividing by 100", 2345, 23.45],
    ["should normalize 5-digit values by dividing by 1000", 12345, 12.345],
    ["should return 0 for NaN or Infinity", Number.NaN, 0],
  ];

  for (const [name, input, expected] of cases) {
    const actual = correctDistance(input);
    assert.strictEqual(actual, expected, `${name}: expected ${expected}, got ${actual}`);
    console.log(`  ✅ ${name}`);
  }
}
