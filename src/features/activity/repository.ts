import "server-only";

import { asc, eq, and } from "drizzle-orm";

import type { ActivityDetails, ActivityEntryView } from "@/contracts/incidents";
import { activityEntries, users } from "@/db/schema";
import type { DatabaseExecutor } from "@/db/transaction";

export type NewActivity = {
  workspaceId: string;
  incidentId: string;
  actorId: string;
  type: typeof activityEntries.$inferInsert.type;
  commentId?: string | null;
  details?: ActivityDetails;
};

export class ActivityRepository {
  constructor(private readonly database: DatabaseExecutor) {}

  async append(input: NewActivity): Promise<void> {
    await this.database.insert(activityEntries).values({
      ...input,
      commentId: input.commentId ?? null,
      details: input.details ?? {},
    });
  }

  async listForIncident(
    workspaceId: string,
    incidentId: string,
  ): Promise<ActivityEntryView[]> {
    const rows = await this.database
      .select({
        id: activityEntries.id,
        type: activityEntries.type,
        actorId: users.id,
        actorName: users.name,
        commentId: activityEntries.commentId,
        details: activityEntries.details,
        createdAt: activityEntries.createdAt,
      })
      .from(activityEntries)
      .innerJoin(users, eq(users.id, activityEntries.actorId))
      .where(
        and(
          eq(activityEntries.workspaceId, workspaceId),
          eq(activityEntries.incidentId, incidentId),
        ),
      )
      .orderBy(asc(activityEntries.createdAt), asc(activityEntries.id));

    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      actor: { id: row.actorId, name: row.actorName },
      commentId: row.commentId,
      details: row.details,
      createdAt: row.createdAt.toISOString(),
    }));
  }
}
