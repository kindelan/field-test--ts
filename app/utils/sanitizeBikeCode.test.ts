import assert from "assert";
import { normalizeBikeCode } from "./sanitizeBikeCode.js";

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

export function runSanitizeBikeCodeTests() {
  describe("normalizeBikeCode", () => {
    it("should normalize PROB formats", () => {
      assert.strictEqual(normalizeBikeCode("PROB 38"), "Prob_38");
      assert.strictEqual(normalizeBikeCode("prob 34"), "Prob_34");
      assert.strictEqual(normalizeBikeCode("PROB_05"), "Prob_05");
      assert.strictEqual(normalizeBikeCode("PROB-12"), "Prob_12");
      assert.strictEqual(normalizeBikeCode("prob80"), "Prob_80");
    });

    it("should normalize plain numeric values by padding them", () => {
      assert.strictEqual(normalizeBikeCode("34"), "Prob_34");
      assert.strictEqual(normalizeBikeCode("034"), "Prob_34");
      assert.strictEqual(normalizeBikeCode("5"), "Prob_05");
    });

    it("should normalize X20 and X30 formats", () => {
      assert.strictEqual(normalizeBikeCode("X 20 5"), "X20_05");
      assert.strictEqual(normalizeBikeCode("X30 12"), "X30_12");
      assert.strictEqual(normalizeBikeCode("X20"), "X20");
      assert.strictEqual(normalizeBikeCode("X30"), "X30");
    });

    it("should normalize family prefixes (XS, PF, PB)", () => {
      assert.strictEqual(normalizeBikeCode("XS 9"), "XS_09");
      assert.strictEqual(normalizeBikeCode("PF 12"), "PF_12");
      assert.strictEqual(normalizeBikeCode("PB 3"), "PB_03");
    });

    it("should remove parentheses and irrelevant text", () => {
      assert.strictEqual(normalizeBikeCode("PROB 34 (COLOR NEGRO)"), "Prob_34");
      assert.strictEqual(normalizeBikeCode("PROB 38 BICI PLATA"), "Prob_38");
    });

    it("should fallback to cleaned underscores for unknown formats", () => {
      assert.strictEqual(normalizeBikeCode("My Custom Bike 123"), "MY_CUSTOM_BIKE_123");
    });

    it("should handle null and empty values gracefully", () => {
      assert.strictEqual(normalizeBikeCode(null), null);
      assert.strictEqual(normalizeBikeCode(""), null);
    });
  });
}
