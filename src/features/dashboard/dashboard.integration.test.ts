import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createAuthContext } from "@/lib/auth-context";
import { createTestDatabase } from "@/test/database/client";

import { createDashboardRepository } from "./repository";
import { createDashboardService } from "./service";

const workspaceA = "00000000-0000-4000-8000-000000000001";
const workspaceB = "00000000-0000-4000-8000-000000000002";
const ownerA = "00000000-0000-4000-8000-000000000011";
const ownerB = "00000000-0000-4000-8000-000000000012";
const { database, sql } = createTestDatabase();
const service = createDashboardService(createDashboardRepository(database));

beforeAll(async () => {
  await sql`
    INSERT INTO users (id, email, password_hash, name)
    VALUES
      (${ownerA}, 'owner-a@example.com', 'unused', 'Owner A'),
      (${ownerB}, 'owner-b@example.com', 'unused', 'Owner B')
  `;
  await sql`
    INSERT INTO workspaces (id, slug, name)
    VALUES
      (${workspaceA}, 'workspace-a', 'Workspace A'),
      (${workspaceB}, 'workspace-b', 'Workspace B')
  `;
  await sql`
    INSERT INTO workspace_memberships (workspace_id, user_id, role)
    VALUES
      (${workspaceA}, ${ownerA}, 'member'),
      (${workspaceB}, ${ownerB}, 'member')
  `;
  await sql`
    INSERT INTO incidents (
      id, workspace_id, creator_id, owner_id, title, description,
      status, severity, created_at, updated_at
    )
    VALUES
      ('00000000-0000-4000-8000-000000000101', ${workspaceA}, ${ownerA}, ${ownerA}, 'Older open', '', 'open', 'sev1', '2026-08-13T08:00:00Z', '2026-08-13T09:00:00Z'),
      ('00000000-0000-4000-8000-000000000102', ${workspaceA}, ${ownerA}, ${ownerA}, 'Newest investigating', '', 'investigating', 'sev2', '2026-08-13T08:00:00Z', '2026-08-13T12:00:00Z'),
      ('00000000-0000-4000-8000-000000000103', ${workspaceA}, ${ownerA}, ${ownerA}, 'Second open', '', 'open', 'sev3', '2026-08-13T08:00:00Z', '2026-08-13T10:00:00Z'),
      ('00000000-0000-4000-8000-000000000104', ${workspaceA}, ${ownerA}, ${ownerA}, 'Resolved', '', 'resolved', 'sev4', '2026-08-13T08:00:00Z', '2026-08-13T13:00:00Z'),
      ('00000000-0000-4000-8000-000000000105', ${workspaceA}, ${ownerA}, ${ownerA}, 'Closed', '', 'closed', 'sev4', '2026-08-13T08:00:00Z', '2026-08-13T14:00:00Z'),
      ('00000000-0000-4000-8000-000000000106', ${workspaceB}, ${ownerB}, ${ownerB}, 'Other workspace', '', 'open', 'sev4', '2026-08-13T08:00:00Z', '2026-08-13T15:00:00Z')
  `;
});

afterAll(async () => {
  await sql.end();
});

describe("dashboard PostgreSQL query", () => {
  it("returns only active incidents from the trusted workspace", async () => {
    const result = await service.getDashboard(authForWorkspaceA());

    expect(result.incidents.map(({ title }) => title)).toEqual([
      "Newest investigating",
      "Second open",
      "Older open",
    ]);
    expect(result.incidents.every(({ owner }) => owner.name === "Owner A")).toBe(
      true,
    );
  });

  it("calculates exact open, investigating, and open-by-severity counts", async () => {
    const result = await service.getDashboard(authForWorkspaceA());

    expect(result.metrics).toEqual({
      openIncidents: 2,
      investigatingIncidents: 1,
      openBySeverity: { sev1: 1, sev2: 0, sev3: 1, sev4: 0 },
    });
  });

  it("preserves the persisted last-updated instant", async () => {
    const result = await service.getDashboard(authForWorkspaceA());

    expect(result.incidents[0]?.updatedAt).toBe("2026-08-13T12:00:00.000Z");
  });
});

function authForWorkspaceA() {
  return createAuthContext(
    { userId: ownerA },
    {
      workspaceId: workspaceA,
      workspaceSlug: "workspace-a",
      role: "member",
    },
  );
}
