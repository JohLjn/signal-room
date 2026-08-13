import { migrate } from "drizzle-orm/postgres-js/migrator";

import { createTestDatabase } from "@/test/database/client";

export async function migrateTestDatabase(): Promise<void> {
  const { database, sql } = createTestDatabase();

  try {
    await migrate(database, { migrationsFolder: "src/db/migrations" });
  } finally {
    await sql.end();
  }
}
