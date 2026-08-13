import { migrateTestDatabase } from "@/test/database/migrate";
import { resetTestDatabase } from "@/test/database/reset";

export default async function setup(): Promise<() => Promise<void>> {
  await migrateTestDatabase();
  await resetTestDatabase();

  return resetTestDatabase;
}
