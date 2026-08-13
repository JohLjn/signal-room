import { createTestDatabase } from "@/test/database/client";

export async function resetTestDatabase(): Promise<void> {
  const { sql } = createTestDatabase();

  try {
    await sql.unsafe(
      "TRUNCATE TABLE activity_entries, comments, incidents, workspace_memberships, workspaces, users RESTART IDENTITY CASCADE",
    );
  } finally {
    await sql.end();
  }
}
