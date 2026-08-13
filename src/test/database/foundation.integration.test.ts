import { afterAll, describe, expect, it } from "vitest";

import { createTestDatabase } from "@/test/database/client";

const { sql } = createTestDatabase();

afterAll(async () => {
  await sql.end();
});

describe("database foundation", () => {
  it("migrates every MVP persistence table", async () => {
    const rows = await sql<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'users',
          'workspaces',
          'workspace_memberships',
          'incidents',
          'comments',
          'activity_entries'
        )
      ORDER BY table_name
    `;

    expect(rows.map((row) => row.table_name)).toEqual([
      "activity_entries",
      "comments",
      "incidents",
      "users",
      "workspace_memberships",
      "workspaces",
    ]);
  });
});
