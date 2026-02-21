// tests/setup.ts
import { config } from "dotenv";
import path from "path";

// Load .env.test before any imports (override: true so test DB vars replace any inherited dev env)
const envPath = path.resolve(__dirname, "../.env.test");
config({ path: envPath, override: true });
