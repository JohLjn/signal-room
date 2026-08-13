import "server-only";

import { and, asc, eq } from "drizzle-orm";

import type { CommentView } from "@/contracts/incidents";
import { comments, users } from "@/db/schema";
import type { DatabaseExecutor } from "@/db/transaction";

export class CommentRepository {
  constructor(private readonly database: DatabaseExecutor) {}

  async create(input: {
    workspaceId: string;
    incidentId: string;
    authorId: string;
    body: string;
  }): Promise<CommentView> {
    const [comment] = await this.database
      .insert(comments)
      .values(input)
      .returning();
    const [author] = await this.database
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, input.authorId))
      .limit(1);

    if (!comment || !author) throw new Error("Failed to create comment.");
    return {
      id: comment.id,
      body: comment.body,
      author,
      createdAt: comment.createdAt.toISOString(),
    };
  }

  async listForIncident(
    workspaceId: string,
    incidentId: string,
  ): Promise<CommentView[]> {
    const rows = await this.database
      .select({
        id: comments.id,
        body: comments.body,
        authorId: users.id,
        authorName: users.name,
        createdAt: comments.createdAt,
      })
      .from(comments)
      .innerJoin(users, eq(users.id, comments.authorId))
      .where(
        and(
          eq(comments.workspaceId, workspaceId),
          eq(comments.incidentId, incidentId),
        ),
      )
      .orderBy(asc(comments.createdAt), asc(comments.id));

    return rows.map((row) => ({
      id: row.id,
      body: row.body,
      author: { id: row.authorId, name: row.authorName },
      createdAt: row.createdAt.toISOString(),
    }));
  }
}
