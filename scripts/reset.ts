import "./load-env";
import { execFileSync } from "node:child_process";
import postgres from "postgres";
import { getEnv } from "../lib/config/env";

async function main() {
  const env = getEnv();
  const isLocal =
    env.DATABASE_URL.includes("localhost") ||
    env.DATABASE_URL.includes("127.0.0.1");

  if (!isLocal && process.env.ALLOW_DB_RESET !== "1") {
    throw new Error(
      "Refusing to reset a non-local database. Set ALLOW_DB_RESET=1 to override.",
    );
  }

  const client = postgres(env.DATABASE_URL, { max: 1 });
  console.log("Dropping and recreating the public schema ...");
  await client.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
  // Drizzle stores its migration journal in a separate schema. Dropping only
  // public leaves the journal behind, so the next migrate would skip every
  // migration and seeding would fail against an empty database.
  await client.unsafe("DROP SCHEMA IF EXISTS drizzle CASCADE");
  await client.unsafe("CREATE SCHEMA public");
  await client.end();

  execFileSync("pnpm", ["db:migrate"], { stdio: "inherit" });
  execFileSync("pnpm", ["db:seed"], { stdio: "inherit" });
  console.log("Database reset, migrated, and seeded.");
}

main().catch((error) => {
  console.error("Reset failed:", error);
  process.exit(1);
});
