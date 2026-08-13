import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type {
  CreateIncidentData,
  IncidentSummary,
  UpdateIncidentInput,
} from "@/contracts/incidents";
import { incidents, users, workspaceMemberships } from "@/db/schema";
import type { DatabaseExecutor } from "@/db/transaction";

const owner = alias(users, "incident_owner");
const creator = alias(users, "incident_creator");

export type IncidentRecord = typeof incidents.$inferSelect;
export type MemberOption = { id: string; name: string };

export class IncidentRepository {
  constructor(private readonly database: DatabaseExecutor) {}

  async find(workspaceId: string, incidentId: string): Promise<IncidentRecord | null> {
    const [incident] = await this.database
      .select()
      .from(incidents)
      .where(and(eq(incidents.workspaceId, workspaceId), eq(incidents.id, incidentId)))
      .limit(1);
    return incident ?? null;
  }

  async findForUpdate(workspaceId: string, incidentId: string): Promise<IncidentRecord | null> {
    const [incident] = await this.database
      .select()
      .from(incidents)
      .where(and(eq(incidents.workspaceId, workspaceId), eq(incidents.id, incidentId)))
      .limit(1)
      .for("update");
    return incident ?? null;
  }

  async list(workspaceId: string): Promise<IncidentSummary[]> {
    const rows = await this.database
      .select({
        id: incidents.id,
        title: incidents.title,
        status: incidents.status,
        severity: incidents.severity,
        ownerId: owner.id,
        ownerName: owner.name,
        createdAt: incidents.createdAt,
        updatedAt: incidents.updatedAt,
      })
      .from(incidents)
      .innerJoin(owner, eq(owner.id, incidents.ownerId))
      .where(eq(incidents.workspaceId, workspaceId))
      .orderBy(asc(incidents.createdAt), asc(incidents.id));

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      severity: row.severity,
      owner: { id: row.ownerId, name: row.ownerName },
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async create(
    workspaceId: string,
    creatorId: string,
    input: CreateIncidentData,
  ): Promise<IncidentRecord> {
    const [incident] = await this.database
      .insert(incidents)
      .values({ workspaceId, creatorId, ...input })
      .returning();
    if (!incident) throw new Error("Failed to create incident.");
    return incident;
  }

  async update(
    workspaceId: string,
    incidentId: string,
    changes: UpdateIncidentInput,
  ): Promise<IncidentRecord> {
    const [incident] = await this.database
      .update(incidents)
      .set({ ...changes, updatedAt: new Date() })
      .where(and(eq(incidents.workspaceId, workspaceId), eq(incidents.id, incidentId)))
      .returning();
    if (!incident) throw new Error("Failed to update incident.");
    return incident;
  }

  async touch(workspaceId: string, incidentId: string): Promise<void> {
    await this.database
      .update(incidents)
      .set({ updatedAt: new Date() })
      .where(and(eq(incidents.workspaceId, workspaceId), eq(incidents.id, incidentId)));
  }

  async isMember(workspaceId: string, userId: string): Promise<boolean> {
    const [membership] = await this.database
      .select({ userId: workspaceMemberships.userId })
      .from(workspaceMemberships)
      .where(
        and(
          eq(workspaceMemberships.workspaceId, workspaceId),
          eq(workspaceMemberships.userId, userId),
        ),
      )
      .limit(1);
    return Boolean(membership);
  }

  async getUser(userId: string): Promise<MemberOption | null> {
    const [user] = await this.database
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return user ?? null;
  }

  async listMembers(workspaceId: string): Promise<MemberOption[]> {
    return this.database
      .select({ id: users.id, name: users.name })
      .from(workspaceMemberships)
      .innerJoin(users, eq(users.id, workspaceMemberships.userId))
      .where(eq(workspaceMemberships.workspaceId, workspaceId))
      .orderBy(asc(users.name), asc(users.id));
  }

  async getPeople(workspaceId: string, incidentId: string) {
    const [row] = await this.database
      .select({
        ownerId: owner.id,
        ownerName: owner.name,
        creatorId: creator.id,
        creatorName: creator.name,
      })
      .from(incidents)
      .innerJoin(owner, eq(owner.id, incidents.ownerId))
      .innerJoin(creator, eq(creator.id, incidents.creatorId))
      .where(and(eq(incidents.workspaceId, workspaceId), eq(incidents.id, incidentId)))
      .limit(1);
    return row ?? null;
  }
}
