import { config } from "dotenv";

config({ path: "./tests/.env.test" });
(process.env as any).NODE_ENV = "test";
