import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/db/schema";
import { getServerEnv } from "@/lib/env";

export type Database = PostgresJsDatabase<typeof schema>;

const globalDatabase = globalThis as typeof globalThis & {
  signalRoomDatabase?: Database;
  signalRoomSql?: ReturnType<typeof postgres>;
};

export function getDatabase(): Database {
  if (!globalDatabase.signalRoomDatabase) {
    const sql = postgres(getServerEnv().DATABASE_URL, { max: 10 });
    globalDatabase.signalRoomSql = sql;
    globalDatabase.signalRoomDatabase = drizzle(sql, { schema });
  }

  return globalDatabase.signalRoomDatabase;
}

export async function closeDatabase(): Promise<void> {
  await globalDatabase.signalRoomSql?.end();
  globalDatabase.signalRoomSql = undefined;
  globalDatabase.signalRoomDatabase = undefined;
}
