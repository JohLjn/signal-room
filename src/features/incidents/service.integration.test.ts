import { and, eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  activityEntries,
  comments,
  incidents,
  users,
  workspaceMemberships,
  workspaces,
} from "@/db/schema";
import { IncidentService } from "@/features/incidents/service";
import { createAuthContext, type AuthContext } from "@/lib/auth-context";
import { AppError } from "@/lib/errors";
import { createTestDatabase } from "@/test/database/client";

const { database, sql } = createTestDatabase();
const service = new IncidentService(database);

async function seed() {
  const [owner, member, admin, outsider] = await database
    .insert(users)
    .values([
      { email: "owner@example.com", name: "Owner", passwordHash: "x" },
      { email: "member@example.com", name: "Member", passwordHash: "x" },
      { email: "admin@example.com", name: "Admin", passwordHash: "x" },
      { email: "outsider@example.com", name: "Outsider", passwordHash: "x" },
    ])
    .returning();
  const [alpha, beta] = await database
    .insert(workspaces)
    .values([
      { slug: "alpha", name: "Alpha" },
      { slug: "beta", name: "Beta" },
    ])
    .returning();
  await database.insert(workspaceMemberships).values([
    { workspaceId: alpha.id, userId: owner.id, role: "member" },
    { workspaceId: alpha.id, userId: member.id, role: "member" },
    { workspaceId: alpha.id, userId: admin.id, role: "admin" },
    { workspaceId: beta.id, userId: outsider.id, role: "admin" },
  ]);
  const context = (userId: string, workspaceId: string, workspaceSlug: string, role: "member" | "admin") =>
    createAuthContext(
      { userId },
      { workspaceId, workspaceSlug, role },
    );
  return {
    owner,
    member,
    admin,
    outsider,
    alpha,
    beta,
    ownerContext: context(owner.id, alpha.id, alpha.slug, "member"),
    memberContext: context(member.id, alpha.id, alpha.slug, "member"),
    adminContext: context(admin.id, alpha.id, alpha.slug, "admin"),
    outsiderContext: context(outsider.id, beta.id, beta.slug, "admin"),
  };
}

async function createIncident(context: AuthContext, ownerId: string) {
  return service.createIncident(context, {
    title: "Database latency",
    description: "Queries are slow",
    status: "open",
    severity: "sev2",
    ownerId,
  });
}

async function waitForLockWait(
  applicationName: string,
  deadline = Date.now() + 5_000,
): Promise<void> {
  const [{ waiting }] = await sql<{ waiting: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM pg_stat_activity
      WHERE application_name = ${applicationName}
        AND wait_event_type = 'Lock'
    ) AS waiting
  `;
  if (waiting) return;
  if (Date.now() >= deadline) {
    throw new Error(`Timed out waiting for PostgreSQL lock wait: ${applicationName}`);
  }
  return waitForLockWait(applicationName, deadline);
}

beforeEach(async () => {
  await sql`DROP TRIGGER IF EXISTS reject_activity ON activity_entries`;
  await sql`DROP FUNCTION IF EXISTS reject_test_activity()`;
  await sql`TRUNCATE TABLE activity_entries, comments, incidents, workspace_memberships, workspaces, users RESTART IDENTITY CASCADE`;
});

afterAll(async () => {
  await sql.end();
});

describe("incident lifecycle", () => {
  it("creates and retrieves an incident with its creation activity", async () => {
    const data = await seed();
    const created = await createIncident(data.memberContext, data.owner.id);
    const loaded = await service.getIncident(data.ownerContext, created.id);

    expect(loaded).toMatchObject({
      title: "Database latency",
      creator: { id: data.member.id, name: "Member" },
      owner: { id: data.owner.id, name: "Owner" },
    });
    expect(loaded.activity.map((entry) => entry.type)).toEqual(["incident_created"]);
  });

  it("records one immutable activity for every changed field", async () => {
    const data = await seed();
    const created = await createIncident(data.ownerContext, data.owner.id);
    const updated = await service.updateIncident(data.ownerContext, created.id, {
      status: "investigating",
      severity: "sev1",
      ownerId: data.member.id,
    });

    expect(updated).toMatchObject({ status: "investigating", severity: "sev1", owner: { id: data.member.id } });
    expect(updated.activity.map((entry) => entry.type)).toEqual(expect.arrayContaining([
      "incident_created", "status_changed", "severity_changed", "owner_changed",
    ]));
    expect(updated.activity.find((entry) => entry.type === "owner_changed")?.details).toEqual({
      from: { id: data.owner.id, name: "Owner" },
      to: { id: data.member.id, name: "Member" },
    });
    expect("updateActivity" in service).toBe(false);
    expect("deleteActivity" in service).toBe(false);
  });

  it("allows an administrator but denies a non-owner member", async () => {
    const data = await seed();
    const created = await createIncident(data.ownerContext, data.owner.id);

    await expect(
      service.updateIncident(data.memberContext, created.id, { status: "resolved" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      service.updateIncident(data.adminContext, created.id, { status: "resolved" }),
    ).resolves.toMatchObject({ status: "resolved" });
  });

  it("rechecks ownership after waiting for a concurrent owner change", async () => {
    const data = await seed();
    const created = await createIncident(data.ownerContext, data.owner.id);
    const blocker = createTestDatabase();
    const contender = createTestDatabase();
    const applicationName = `stale-owner-${created.id}`;
    let releaseBlocker = () => {};
    const blockerGate = new Promise<void>((resolve) => {
      releaseBlocker = resolve;
    });
    let markBlockerReady = () => {};
    const blockerReady = new Promise<void>((resolve) => {
      markBlockerReady = resolve;
    });

    try {
      await contender.sql`SELECT set_config('application_name', ${applicationName}, false)`;
      const blockerMutation = blocker.database.transaction(async (transaction) => {
        await transaction
          .update(incidents)
          .set({ ownerId: data.member.id })
          .where(and(eq(incidents.workspaceId, data.alpha.id), eq(incidents.id, created.id)));
        markBlockerReady();
        await blockerGate;
      });
      await blockerReady;

      const mutation = new IncidentService(contender.database).updateIncident(
        data.ownerContext,
        created.id,
        { status: "resolved" },
      );
      await waitForLockWait(applicationName);
      releaseBlocker();
      await blockerMutation;

      await expect(mutation).rejects.toMatchObject({ code: "FORBIDDEN" });
      const loaded = await service.getIncident(data.adminContext, created.id);
      expect(loaded).toMatchObject({ status: "open", owner: { id: data.member.id } });
      expect(loaded.activity.some((entry) => entry.type === "status_changed")).toBe(false);
    } finally {
      releaseBlocker();
      await Promise.all([blocker.sql.end(), contender.sql.end()]);
    }
  });

  it("records activity from the state committed while a concurrent update waits", async () => {
    const data = await seed();
    const created = await createIncident(data.ownerContext, data.owner.id);
    const blocker = createTestDatabase();
    const contender = createTestDatabase();
    const applicationName = `stale-activity-${created.id}`;
    let releaseBlocker = () => {};
    const blockerGate = new Promise<void>((resolve) => {
      releaseBlocker = resolve;
    });
    let markBlockerReady = () => {};
    const blockerReady = new Promise<void>((resolve) => {
      markBlockerReady = resolve;
    });

    try {
      await contender.sql`SELECT set_config('application_name', ${applicationName}, false)`;
      const blockerMutation = blocker.database.transaction(async (transaction) => {
        await transaction
          .update(incidents)
          .set({ status: "investigating" })
          .where(and(eq(incidents.workspaceId, data.alpha.id), eq(incidents.id, created.id)));
        markBlockerReady();
        await blockerGate;
      });
      await blockerReady;

      const mutation = new IncidentService(contender.database).updateIncident(
        data.ownerContext,
        created.id,
        { status: "resolved" },
      );
      await waitForLockWait(applicationName);
      releaseBlocker();
      await blockerMutation;
      await mutation;

      const loaded = await service.getIncident(data.ownerContext, created.id);
      expect(loaded.status).toBe("resolved");
      expect(loaded.activity.find((entry) => entry.type === "status_changed")?.details).toEqual({
        from: "investigating",
        to: "resolved",
      });
    } finally {
      releaseBlocker();
      await Promise.all([blocker.sql.end(), contender.sql.end()]);
    }
  });

  it("rejects an owner outside the workspace", async () => {
    const data = await seed();
    await expect(createIncident(data.ownerContext, data.outsider.id)).rejects.toMatchObject({
      code: "VALIDATION",
    });
  });

  it("hides incidents across workspace-scoped retrieval, updates, and comments", async () => {
    const data = await seed();
    const created = await createIncident(data.ownerContext, data.owner.id);

    for (const operation of [
      () => service.getIncident(data.outsiderContext, created.id),
      () => service.updateIncident(data.outsiderContext, created.id, { status: "closed" }),
      () => service.addComment(data.outsiderContext, created.id, { body: "No access" }),
    ]) {
      await expect(operation()).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
    expect(await service.listIncidents(data.outsiderContext)).toEqual([]);
  });

  it("adds chronological comments and deterministically ordered timeline entries", async () => {
    const data = await seed();
    const created = await createIncident(data.ownerContext, data.owner.id);
    const first = await service.addComment(data.memberContext, created.id, { body: "First" });
    const second = await service.addComment(data.ownerContext, created.id, { body: "Second" });
    const sameTime = new Date("2026-01-01T00:00:00.000Z");
    await database.update(comments).set({ createdAt: sameTime });
    await database.update(activityEntries).set({ createdAt: sameTime });

    const loaded = await service.getIncident(data.ownerContext, created.id);
    expect(loaded.comments.map((comment) => comment.id)).toEqual([first.id, second.id].sort());
    expect(loaded.activity.map((entry) => entry.id)).toEqual(
      loaded.activity.map((entry) => entry.id).sort(),
    );
    expect(loaded.activity.filter((entry) => entry.type === "comment_added").map((entry) => entry.commentId).sort()).toEqual(
      [first.id, second.id].sort(),
    );
  });

  it("rejects empty comments", async () => {
    const data = await seed();
    const created = await createIncident(data.ownerContext, data.owner.id);
    await expect(service.addComment(data.memberContext, created.id, { body: "   " })).rejects.toBeInstanceOf(AppError);
  });
});

describe("transaction rollback", () => {
  async function rejectActivityWrites() {
    await sql`CREATE FUNCTION reject_test_activity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'activity rejected'; END $$`;
    await sql`CREATE TRIGGER reject_activity BEFORE INSERT ON activity_entries FOR EACH ROW EXECUTE FUNCTION reject_test_activity()`;
  }

  it("rolls back incident creation when its activity fails", async () => {
    const data = await seed();
    await rejectActivityWrites();
    await expect(createIncident(data.ownerContext, data.owner.id)).rejects.toThrow();
    expect(await service.listIncidents(data.ownerContext)).toEqual([]);
  });

  it("rolls back comments and incident touching when comment activity fails", async () => {
    const data = await seed();
    const created = await createIncident(data.ownerContext, data.owner.id);
    await rejectActivityWrites();
    await expect(service.addComment(data.memberContext, created.id, { body: "Rollback" })).rejects.toThrow();
    const loaded = await service.getIncident(data.ownerContext, created.id);
    expect(loaded.comments).toEqual([]);
    expect(loaded.updatedAt).toBe(created.updatedAt);
  });

  it("rolls back lifecycle changes when their activity fails", async () => {
    const data = await seed();
    const created = await createIncident(data.ownerContext, data.owner.id);
    await rejectActivityWrites();
    await expect(
      service.updateIncident(data.ownerContext, created.id, { status: "resolved" }),
    ).rejects.toThrow();
    const loaded = await service.getIncident(data.ownerContext, created.id);
    expect(loaded.status).toBe("open");
    expect(loaded.activity).toHaveLength(1);
  });
});
