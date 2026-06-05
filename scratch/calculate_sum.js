import { FieldTestService } from "../dist/app/services/fieldTest.service.js";

async function run() {
  const service = new FieldTestService();
  const ftId = "da1ae47d-931e-4ae6-91ae-947b35815e54"; // M40 - sys
  
  console.log("Calculating KM summary for field test da1ae47d-931e-4ae6-91ae-947b35815e54...");
  const res = await service.getAssignedBikesKmSummary(ftId);
  console.log("Result:");
  console.log(JSON.stringify(res, null, 2));
}

run().catch(console.error);
