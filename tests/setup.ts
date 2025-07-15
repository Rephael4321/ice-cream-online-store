// tests/setup.ts
import { config } from "dotenv";
import path from "path";

// Load .env.test before any imports
const envPath = path.resolve(__dirname, "../.env.test");
console.log("🧪 Loading .env.test from:", envPath);
config({ path: envPath });
