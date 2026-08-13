import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { z } from "zod";

async function main(): Promise<void> {
  const databaseUrl = z.string().url().parse(process.env.DATABASE_URL);
  const sql = postgres(databaseUrl, { max: 1 });

  try {
    await migrate(drizzle(sql), { migrationsFolder: "src/db/migrations" });
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
