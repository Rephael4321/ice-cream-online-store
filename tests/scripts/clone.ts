import { cloneDevDbToTestDb } from "../utils/clone-dev-db"; // adjust path if needed

cloneDevDbToTestDb()
  .then(() => {
    console.log("✅ Manual clone complete.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error during manual clone:", err);
    process.exit(1);
  });
