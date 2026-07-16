import { runSanitizeBikeCodeTests } from "./sanitizeBikeCode.test.js";
import { runMotorHistoryTests } from "./motorHistory.test.js";

console.log("🚀 Running unit tests...\n");

try {
  runSanitizeBikeCodeTests();
  runMotorHistoryTests();
  console.log("\n🎉 All tests passed successfully!");
} catch (err) {
  console.error("\n❌ Test suite failed!");
  console.error(err);
  process.exit(1);
}
