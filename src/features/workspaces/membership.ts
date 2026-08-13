import "server-only";

import { and, asc, eq } from "drizzle-orm";

import {
  ResolvedWorkspaceMembershipSchema,
  WorkspaceSlugSchema,
  type ResolvedWorkspaceMembership,
} from "@/contracts/auth";
import { workspaceMemberships, workspaces } from "@/db/schema";
import { getDatabase, type Database } from "@/db/client";
import { AppError } from "@/lib/errors";

export async function resolveWorkspaceMembership(
  userId: string,
  workspaceSlug: string,
  database: Database = getDatabase(),
): Promise<ResolvedWorkspaceMembership> {
  const parsedSlug = WorkspaceSlugSchema.safeParse(workspaceSlug);

  if (!parsedSlug.success) {
    throw new AppError("NOT_FOUND", "Workspace not found.");
  }

  const [membership] = await database
    .select({
      workspaceId: workspaces.id,
      workspaceSlug: workspaces.slug,
      role: workspaceMemberships.role,
    })
    .from(workspaces)
    .innerJoin(
      workspaceMemberships,
      and(
        eq(workspaceMemberships.workspaceId, workspaces.id),
        eq(workspaceMemberships.userId, userId),
      ),
    )
    .where(eq(workspaces.slug, parsedSlug.data))
    .limit(1);

  if (!membership) {
    throw new AppError("NOT_FOUND", "Workspace not found.");
  }

  return ResolvedWorkspaceMembershipSchema.parse(membership);
}

export async function resolveFirstWorkspaceMembership(
  userId: string,
  database: Database = getDatabase(),
): Promise<ResolvedWorkspaceMembership> {
  const [membership] = await database
    .select({
      workspaceId: workspaces.id,
      workspaceSlug: workspaces.slug,
      role: workspaceMemberships.role,
    })
    .from(workspaceMemberships)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMemberships.workspaceId))
    .where(eq(workspaceMemberships.userId, userId))
    .orderBy(asc(workspaceMemberships.createdAt), asc(workspaces.slug))
    .limit(1);

  if (!membership) {
    throw new AppError("NOT_FOUND", "Workspace not found.");
  }

  return ResolvedWorkspaceMembershipSchema.parse(membership);
}
