import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../../src/db/schema";

export type TestDatabase = PostgresJsDatabase<typeof schema>;

function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;

  if (!url) {
    throw new Error("TEST_DATABASE_URL is required for Playwright tests.");
  }

  if (process.env.DATABASE_URL && process.env.DATABASE_URL === url) {
    throw new Error("TEST_DATABASE_URL must not match DATABASE_URL.");
  }

  return url;
}

export function createPlaywrightDatabase(): {
  database: TestDatabase;
  sql: ReturnType<typeof postgres>;
} {
  const sql = postgres(testDatabaseUrl(), { max: 1 });
  return { database: drizzle(sql, { schema }), sql };
}

export async function migratePlaywrightDatabase(): Promise<void> {
  const { database, sql } = createPlaywrightDatabase();

  try {
    await migrate(database, { migrationsFolder: "src/db/migrations" });
  } finally {
    await sql.end();
  }
}

export async function resetPlaywrightDatabase(): Promise<void> {
  const { sql } = createPlaywrightDatabase();

  try {
    await sql`DROP TRIGGER IF EXISTS reject_activity ON activity_entries`;
    await sql`DROP FUNCTION IF EXISTS reject_test_activity()`;
    await sql.unsafe(
      "TRUNCATE TABLE activity_entries, comments, incidents, workspace_memberships, workspaces, users RESTART IDENTITY CASCADE",
    );
  } finally {
    await sql.end();
  }
}
