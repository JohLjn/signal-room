import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";

import * as schema from "@/db/schema";

const TestDatabaseUrlSchema = z.string().url();

export type TestDatabase = PostgresJsDatabase<typeof schema>;

export function getTestDatabaseUrl(): string {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error(
      "TEST_DATABASE_URL is required and must identify a dedicated PostgreSQL test database.",
    );
  }

  const testDatabaseUrl = TestDatabaseUrlSchema.parse(process.env.TEST_DATABASE_URL);

  if (process.env.DATABASE_URL && testDatabaseUrl === process.env.DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL must not match DATABASE_URL.");
  }

  return testDatabaseUrl;
}

export function createTestDatabase(): {
  database: TestDatabase;
  sql: ReturnType<typeof postgres>;
} {
  const sql = postgres(getTestDatabaseUrl(), { max: 1 });
  return { database: drizzle(sql, { schema }), sql };
}
