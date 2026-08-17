import { argon2id, hash } from "argon2";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { inArray } from "drizzle-orm";
import postgres from "postgres";
import { z } from "zod";

import {
  activityEntries,
  comments,
  incidents,
  users,
  workspaceMemberships,
  workspaces,
} from "@/db/schema";

const DEMO_PASSWORD = "signalroom-demo";
const DEMO_WORKSPACE_SLUG = "signalroom-demo";

const INCIDENT_IDS = {
  checkout: "10000000-0000-4000-8000-000000000001",
  webhooks: "10000000-0000-4000-8000-000000000002",
  statusPage: "10000000-0000-4000-8000-000000000003",
} as const;

const COMMENT_IDS = {
  checkoutUpdate: "20000000-0000-4000-8000-000000000001",
} as const;

const ACTIVITY_IDS = {
  checkoutCreated: "30000000-0000-4000-8000-000000000001",
  checkoutCommented: "30000000-0000-4000-8000-000000000002",
  webhooksCreated: "30000000-0000-4000-8000-000000000003",
  statusPageCreated: "30000000-0000-4000-8000-000000000004",
  statusPageResolved: "30000000-0000-4000-8000-000000000005",
} as const;

const TIMES = {
  workspace: new Date("2026-08-14T08:00:00.000Z"),
  users: new Date("2026-08-14T08:05:00.000Z"),
  checkoutCreated: new Date("2026-08-14T09:00:00.000Z"),
  checkoutCommented: new Date("2026-08-14T09:20:00.000Z"),
  webhooksCreated: new Date("2026-08-15T10:00:00.000Z"),
  statusPageCreated: new Date("2026-08-13T12:00:00.000Z"),
  statusPageResolved: new Date("2026-08-13T12:45:00.000Z"),
} as const;

function databaseTarget(url: URL): string {
  const port = url.port || "5432";
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  return `${url.hostname.toLowerCase()}:${port}/${database}`;
}

function databaseIdentity(url: URL): string {
  return `${url.username}@${databaseTarget(url)}`;
}

function seedDatabaseUrl(): URL {
  if (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "production") {
    throw new Error(`Development seed is disabled when NODE_ENV=${process.env.NODE_ENV}.`);
  }

  const value = z.string().url().parse(process.env.DATABASE_URL);
  const target = new URL(value);
  if (target.protocol !== "postgres:" && target.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use the postgres or postgresql protocol.");
  }

  const databaseName = decodeURIComponent(target.pathname.replace(/^\//, ""));
  if (databaseName === "signal_room_test") {
    throw new Error("Development seed must not target the disposable signal_room_test database.");
  }

  if (process.env.TEST_DATABASE_URL) {
    const testTarget = new URL(z.string().url().parse(process.env.TEST_DATABASE_URL));
    if (databaseIdentity(target) === databaseIdentity(testTarget)) {
      throw new Error("DATABASE_URL must not resolve to TEST_DATABASE_URL.");
    }
  }

  return target;
}

function assertReservedRowsBelongToDemo(
  rows: ReadonlyArray<{ id: string; workspaceId: string }>,
  workspaceId: string,
  kind: string,
): void {
  const conflict = rows.find((row) => row.workspaceId !== workspaceId);
  if (conflict) {
    throw new Error(`Reserved demo ${kind} ID ${conflict.id} belongs to another workspace.`);
  }
}

async function main(): Promise<void> {
  const target = seedDatabaseUrl();
  console.log(`Seeding development database ${databaseTarget(target)}...`);

  const sql = postgres(target.toString(), { max: 1 });
  const database = drizzle(sql);

  try {
    await migrate(database, { migrationsFolder: "src/db/migrations" });
    const passwordHash = await hash(DEMO_PASSWORD, { type: argon2id });

    await database.transaction(async (transaction) => {
      const [admin] = await transaction
        .insert(users)
        .values({
          email: "admin@signalroom.test",
          name: "Ada Admin",
          passwordHash,
          createdAt: TIMES.users,
          updatedAt: TIMES.users,
        })
        .onConflictDoUpdate({
          target: users.email,
          set: { name: "Ada Admin", passwordHash, updatedAt: TIMES.users },
        })
        .returning({ id: users.id });
      const [member] = await transaction
        .insert(users)
        .values({
          email: "member@signalroom.test",
          name: "Mina Member",
          passwordHash,
          createdAt: TIMES.users,
          updatedAt: TIMES.users,
        })
        .onConflictDoUpdate({
          target: users.email,
          set: { name: "Mina Member", passwordHash, updatedAt: TIMES.users },
        })
        .returning({ id: users.id });
      const [workspace] = await transaction
        .insert(workspaces)
        .values({
          slug: DEMO_WORKSPACE_SLUG,
          name: "SignalRoom Demo",
          createdAt: TIMES.workspace,
          updatedAt: TIMES.workspace,
        })
        .onConflictDoUpdate({
          target: workspaces.slug,
          set: { name: "SignalRoom Demo", updatedAt: TIMES.workspace },
        })
        .returning({ id: workspaces.id });

      if (!admin || !member || !workspace) {
        throw new Error("Failed to reconcile demo users and workspace.");
      }

      const membershipRows: (typeof workspaceMemberships.$inferInsert)[] = [
        {
          workspaceId: workspace.id,
          userId: admin.id,
          role: "admin",
          createdAt: TIMES.workspace,
        },
        {
          workspaceId: workspace.id,
          userId: member.id,
          role: "member",
          createdAt: TIMES.workspace,
        },
      ];
      for (const row of membershipRows) {
        await transaction.insert(workspaceMemberships).values(row).onConflictDoUpdate({
          target: [workspaceMemberships.workspaceId, workspaceMemberships.userId],
          set: { role: row.role },
        });
      }

      const existingIncidents = await transaction
        .select({ id: incidents.id, workspaceId: incidents.workspaceId })
        .from(incidents)
        .where(inArray(incidents.id, Object.values(INCIDENT_IDS)));
      assertReservedRowsBelongToDemo(existingIncidents, workspace.id, "incident");

      const incidentRows: (typeof incidents.$inferInsert)[] = [
        {
          id: INCIDENT_IDS.checkout,
          workspaceId: workspace.id,
          creatorId: admin.id,
          ownerId: member.id,
          title: "Checkout API elevated error rate",
          description: "Customers are seeing intermittent failures while completing checkout.",
          status: "investigating",
          severity: "sev1",
          createdAt: TIMES.checkoutCreated,
          updatedAt: TIMES.checkoutCommented,
        },
        {
          id: INCIDENT_IDS.webhooks,
          workspaceId: workspace.id,
          creatorId: admin.id,
          ownerId: admin.id,
          title: "Delayed webhook deliveries",
          description: "Outbound webhook delivery latency is above the normal range.",
          status: "open",
          severity: "sev2",
          createdAt: TIMES.webhooksCreated,
          updatedAt: TIMES.webhooksCreated,
        },
        {
          id: INCIDENT_IDS.statusPage,
          workspaceId: workspace.id,
          creatorId: member.id,
          ownerId: member.id,
          title: "Status page formatting issue",
          description: "Resolved a formatting regression affecting mobile status-page visitors.",
          status: "resolved",
          severity: "sev4",
          createdAt: TIMES.statusPageCreated,
          updatedAt: TIMES.statusPageResolved,
        },
      ];
      for (const row of incidentRows) {
        await transaction.insert(incidents).values(row).onConflictDoUpdate({
          target: incidents.id,
          set: row,
        });
      }

      const existingComments = await transaction
        .select({ id: comments.id, workspaceId: comments.workspaceId })
        .from(comments)
        .where(inArray(comments.id, Object.values(COMMENT_IDS)));
      assertReservedRowsBelongToDemo(existingComments, workspace.id, "comment");

      await transaction
        .insert(comments)
        .values({
          id: COMMENT_IDS.checkoutUpdate,
          workspaceId: workspace.id,
          incidentId: INCIDENT_IDS.checkout,
          authorId: member.id,
          body: "Rollback is complete; monitoring checkout success rates before resolving.",
          createdAt: TIMES.checkoutCommented,
        })
        .onConflictDoUpdate({
          target: comments.id,
          set: {
            workspaceId: workspace.id,
            incidentId: INCIDENT_IDS.checkout,
            authorId: member.id,
            body: "Rollback is complete; monitoring checkout success rates before resolving.",
            createdAt: TIMES.checkoutCommented,
          },
        });

      const existingActivity = await transaction
        .select({ id: activityEntries.id, workspaceId: activityEntries.workspaceId })
        .from(activityEntries)
        .where(inArray(activityEntries.id, Object.values(ACTIVITY_IDS)));
      assertReservedRowsBelongToDemo(existingActivity, workspace.id, "activity");

      const activityRows: (typeof activityEntries.$inferInsert)[] = [
        {
          id: ACTIVITY_IDS.checkoutCreated,
          workspaceId: workspace.id,
          incidentId: INCIDENT_IDS.checkout,
          actorId: admin.id,
          type: "incident_created",
          commentId: null,
          details: {},
          createdAt: TIMES.checkoutCreated,
        },
        {
          id: ACTIVITY_IDS.checkoutCommented,
          workspaceId: workspace.id,
          incidentId: INCIDENT_IDS.checkout,
          actorId: member.id,
          type: "comment_added",
          commentId: COMMENT_IDS.checkoutUpdate,
          details: {},
          createdAt: TIMES.checkoutCommented,
        },
        {
          id: ACTIVITY_IDS.webhooksCreated,
          workspaceId: workspace.id,
          incidentId: INCIDENT_IDS.webhooks,
          actorId: admin.id,
          type: "incident_created",
          commentId: null,
          details: {},
          createdAt: TIMES.webhooksCreated,
        },
        {
          id: ACTIVITY_IDS.statusPageCreated,
          workspaceId: workspace.id,
          incidentId: INCIDENT_IDS.statusPage,
          actorId: member.id,
          type: "incident_created",
          commentId: null,
          details: {},
          createdAt: TIMES.statusPageCreated,
        },
        {
          id: ACTIVITY_IDS.statusPageResolved,
          workspaceId: workspace.id,
          incidentId: INCIDENT_IDS.statusPage,
          actorId: member.id,
          type: "status_changed",
          commentId: null,
          details: { from: "investigating", to: "resolved" },
          createdAt: TIMES.statusPageResolved,
        },
      ];
      for (const row of activityRows) {
        await transaction.insert(activityEntries).values(row).onConflictDoUpdate({
          target: activityEntries.id,
          set: row,
        });
      }
    });

    console.log("Development seed complete.");
    console.log(`Workspace: /w/${DEMO_WORKSPACE_SLUG}`);
    console.log(`Admin: admin@signalroom.test / ${DEMO_PASSWORD}`);
    console.log(`Member: member@signalroom.test / ${DEMO_PASSWORD}`);
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
