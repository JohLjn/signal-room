import { hash, argon2id } from "argon2";
import { afterAll, describe, expect, it } from "vitest";

import { users, workspaceMemberships, workspaces } from "@/db/schema";
import { verifyCredentials } from "@/features/auth/credentials";
import { resolveWorkspaceMembership } from "@/features/workspaces/membership";
import { AppError } from "@/lib/errors";
import { createTestDatabase } from "@/test/database/client";

const { database, sql } = createTestDatabase();

afterAll(async () => {
  await sql.end();
});

describe("persisted authentication and workspace membership", () => {
  it("verifies an Argon2id password and rejects an invalid password", async () => {
    const passwordHash = await hash("correct horse battery staple", {
      type: argon2id,
    });
    const [user] = await database
      .insert(users)
      .values({
        email: "auth-agent@example.com",
        name: "Auth Agent",
        passwordHash,
      })
      .returning({ id: users.id });

    await expect(
      verifyCredentials(
        { email: " AUTH-AGENT@example.com ", password: "correct horse battery staple" },
        database,
      ),
    ).resolves.toEqual({
      id: user.id,
      email: "auth-agent@example.com",
      name: "Auth Agent",
    });

    await expect(
      verifyCredentials(
        { email: "auth-agent@example.com", password: "incorrect" },
        database,
      ),
    ).resolves.toBeNull();
  });

  it("resolves the current role and denies a different workspace", async () => {
    const [user] = await database
      .insert(users)
      .values({
        email: "workspace-agent@example.com",
        name: "Workspace Agent",
        passwordHash: await hash("password", { type: argon2id }),
      })
      .returning({ id: users.id });
    const [memberWorkspace, otherWorkspace] = await database
      .insert(workspaces)
      .values([
        { slug: "member-workspace", name: "Member Workspace" },
        { slug: "other-workspace", name: "Other Workspace" },
      ])
      .returning({ id: workspaces.id, slug: workspaces.slug });

    await database.insert(workspaceMemberships).values({
      userId: user.id,
      workspaceId: memberWorkspace.id,
      role: "admin",
    });

    await expect(
      resolveWorkspaceMembership(user.id, memberWorkspace.slug, database),
    ).resolves.toEqual({
      workspaceId: memberWorkspace.id,
      workspaceSlug: "member-workspace",
      role: "admin",
    });

    await expect(
      resolveWorkspaceMembership(user.id, otherWorkspace.slug, database),
    ).rejects.toEqual(expect.objectContaining<Partial<AppError>>({ code: "NOT_FOUND" }));
  });
});
