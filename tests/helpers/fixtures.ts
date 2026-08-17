import { argon2id, hash } from "argon2";

import {
  activityEntries,
  incidents,
  users,
  workspaceMemberships,
  workspaces,
} from "../../src/db/schema";
import { createPlaywrightDatabase, resetPlaywrightDatabase } from "./database";

export const TEST_PASSWORD = "correct horse battery staple";

export type SeededFixture = Awaited<ReturnType<typeof resetAndSeed>>;

export async function resetAndSeed() {
  await resetPlaywrightDatabase();
  const { database, sql } = createPlaywrightDatabase();

  try {
    const passwordHash = await hash(TEST_PASSWORD, { type: argon2id });
    const [admin, member, nonOwner, outsider] = await database
      .insert(users)
      .values([
        { email: "admin@signalroom.test", name: "Ada Admin", passwordHash },
        { email: "member@signalroom.test", name: "Mina Member", passwordHash },
        { email: "non-owner@signalroom.test", name: "Nora Nonowner", passwordHash },
        { email: "outsider@signalroom.test", name: "Oscar Outsider", passwordHash },
      ])
      .returning();
    const [primaryWorkspace, foreignWorkspace] = await database
      .insert(workspaces)
      .values([
        { slug: "operations", name: "Operations" },
        { slug: "other-workspace", name: "Other Workspace" },
      ])
      .returning();

    await database.insert(workspaceMemberships).values([
      { workspaceId: primaryWorkspace.id, userId: admin.id, role: "admin" },
      { workspaceId: primaryWorkspace.id, userId: member.id, role: "member" },
      { workspaceId: primaryWorkspace.id, userId: nonOwner.id, role: "member" },
      { workspaceId: foreignWorkspace.id, userId: outsider.id, role: "admin" },
    ]);

    const [localIncident, foreignIncident] = await database
      .insert(incidents)
      .values([
        {
          workspaceId: primaryWorkspace.id,
          creatorId: admin.id,
          ownerId: admin.id,
          title: "Seeded local incident",
          description: "Available to operations members",
          status: "open",
          severity: "sev3",
        },
        {
          workspaceId: foreignWorkspace.id,
          creatorId: outsider.id,
          ownerId: outsider.id,
          title: "Hidden foreign incident",
          description: "Must not be disclosed",
          status: "open",
          severity: "sev1",
        },
      ])
      .returning();

    const creationActivities: (typeof activityEntries.$inferInsert)[] = [
      {
        workspaceId: primaryWorkspace.id,
        incidentId: localIncident.id,
        actorId: admin.id,
        type: "incident_created",
        details: {},
      },
      {
        workspaceId: foreignWorkspace.id,
        incidentId: foreignIncident.id,
        actorId: outsider.id,
        type: "incident_created",
        details: {},
      },
    ];
    await database.insert(activityEntries).values(creationActivities);

    return {
      admin,
      member,
      nonOwner,
      outsider,
      primaryWorkspace,
      foreignWorkspace,
      localIncident,
      foreignIncident,
    };
  } finally {
    await sql.end();
  }
}
