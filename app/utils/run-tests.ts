import { runSanitizeBikeCodeTests } from "./sanitizeBikeCode.test.js";
import { runMotorHistoryTests } from "./motorHistory.test.js";
import { runFinanceServiceTests } from "../services/finance.service.test.js";
import { runDistanceTests } from "./distance.test.js";

console.log("🚀 Running unit tests...\n");

async function main() {
  try {
    runSanitizeBikeCodeTests();
    runMotorHistoryTests();
    runDistanceTests();
    await runFinanceServiceTests();
    console.log("\n🎉 All tests passed successfully!");
  } catch (err) {
    console.error("\n❌ Test suite failed!");
    console.error(err);
    process.exit(1);
  }
}

main();

