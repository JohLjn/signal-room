import { migratePlaywrightDatabase, resetPlaywrightDatabase } from "./helpers/database";

export default async function globalSetup(): Promise<void> {
  await migratePlaywrightDatabase();
  await resetPlaywrightDatabase();
}
