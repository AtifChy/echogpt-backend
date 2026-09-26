import { config } from "dotenv";

config({ path: ".env.test", override: true, quiet: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for tests");

const databaseName = new URL(databaseUrl).pathname;
if (databaseName !== "/echogpt_test") {
  throw new Error(
    `Tests require echogpt_test; received ${databaseName || "an empty database name"}`,
  );
}

process.env.NODE_ENV = "test";
