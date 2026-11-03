import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/lib/config/env";
import * as schema from "@/lib/db/schema";

declare global {
  var __sahajSql: ReturnType<typeof postgres> | undefined;
}

const env = getEnv();

const sql =
  globalThis.__sahajSql ??
  postgres(env.DATABASE_URL, {
    max: env.NODE_ENV === "production" ? 5 : 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

if (env.NODE_ENV !== "production") {
  globalThis.__sahajSql = sql;
}

export const db = drizzle(sql, { schema });
export { sql };
