import assert from "assert";
import { isRideInMotorPeriods, isErrorInMotorPeriods, MotorPeriod } from "./motorHistory.js";

function describe(name: string, fn: () => void) {
  console.log(`📦 ${name}`);
  fn();
}

function it(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
  } catch (err) {
    console.error(`  ❌ ${name}`);
    throw err;
  }
}

export function runMotorHistoryTests() {
  const periods: MotorPeriod[] = [
    {
      bikecode: "Prob_25",
      bikeId: "bike-25-uuid",
      start: new Date("2025-10-01T00:00:00Z"),
      end: new Date("2026-05-01T23:59:59Z")
    },
    {
      bikecode: "Prob_34",
      bikeId: "bike-34-uuid",
      start: new Date("2026-05-26T00:00:00Z"),
      end: null // Active
    }
  ];

  describe("isRideInMotorPeriods", () => {
    it("should match a ride inside a historical period", () => {
      const rideDate = new Date("2025-10-15T12:00:00Z");
      assert.strictEqual(isRideInMotorPeriods("Prob_25", rideDate, periods), true);
      assert.strictEqual(isRideInMotorPeriods("prob 25", rideDate, periods), true);
    });

    it("should match a ride inside an active (null end) period", () => {
      const rideDate = new Date("2026-06-01T12:00:00Z");
      assert.strictEqual(isRideInMotorPeriods("Prob_34", rideDate, periods), true);
    });

    it("should not match if bike code is different", () => {
      const rideDate = new Date("2025-10-15T12:00:00Z");
      assert.strictEqual(isRideInMotorPeriods("Prob_38", rideDate, periods), false);
    });

    it("should not match if date is outside the specific period", () => {
      const rideDate = new Date("2026-05-10T12:00:00Z");
      assert.strictEqual(isRideInMotorPeriods("Prob_25", rideDate, periods), false);
      assert.strictEqual(isRideInMotorPeriods("Prob_34", rideDate, periods), false);
    });
  });

  describe("isErrorInMotorPeriods", () => {
    it("should match an error by bikeId during the active period", () => {
      const errorDate = new Date("2025-12-01T00:00:00Z");
      assert.strictEqual(isErrorInMotorPeriods("bike-25-uuid", errorDate, periods), true);
    });

    it("should not match if bikeId is null or empty", () => {
      const errorDate = new Date("2025-12-01T00:00:00Z");
      assert.strictEqual(isErrorInMotorPeriods(null, errorDate, periods), false);
      assert.strictEqual(isErrorInMotorPeriods("", errorDate, periods), false);
    });

    it("should not match if bikeId matches but date is outside period", () => {
      const errorDate = new Date("2026-06-15T00:00:00Z");
      assert.strictEqual(isErrorInMotorPeriods("bike-25-uuid", errorDate, periods), false);
    });
  });
}
