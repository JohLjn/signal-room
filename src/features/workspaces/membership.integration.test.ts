import { hash, argon2id } from "argon2";
import { afterAll, describe, expect, it } from "vitest";

import { users, workspaceMemberships, workspaces } from "@/db/schema";
import { verifyCredentials } from "@/features/auth/credentials";
import {
  resolveFirstWorkspaceMembership,
  resolveWorkspaceMembership,
} from "@/features/workspaces/membership";
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

  it("resolves the first membership by creation time and then workspace slug", async () => {
    const [user] = await database
      .insert(users)
      .values({
        email: "first-workspace-agent@example.com",
        name: "First Workspace Agent",
        passwordHash: await hash("password", { type: argon2id }),
      })
      .returning({ id: users.id });
    const workspaceRows = await database
      .insert(workspaces)
      .values([
        { slug: "zulu-workspace", name: "Zulu Workspace" },
        { slug: "alpha-workspace", name: "Alpha Workspace" },
        { slug: "later-workspace", name: "Later Workspace" },
      ])
      .returning({ id: workspaces.id, slug: workspaces.slug });
    const workspaceBySlug = new Map(
      workspaceRows.map((workspace) => [workspace.slug, workspace]),
    );
    const firstCreatedAt = new Date("2026-01-01T00:00:00.000Z");

    await database.insert(workspaceMemberships).values([
      {
        userId: user.id,
        workspaceId: workspaceBySlug.get("zulu-workspace")!.id,
        role: "member",
        createdAt: firstCreatedAt,
      },
      {
        userId: user.id,
        workspaceId: workspaceBySlug.get("alpha-workspace")!.id,
        role: "admin",
        createdAt: firstCreatedAt,
      },
      {
        userId: user.id,
        workspaceId: workspaceBySlug.get("later-workspace")!.id,
        role: "member",
        createdAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]);

    await expect(
      resolveFirstWorkspaceMembership(user.id, database),
    ).resolves.toEqual({
      workspaceId: workspaceBySlug.get("alpha-workspace")!.id,
      workspaceSlug: "alpha-workspace",
      role: "admin",
    });
  });

  it("does not resolve a workspace for a user without memberships", async () => {
    const [user] = await database
      .insert(users)
      .values({
        email: "no-workspace-agent@example.com",
        name: "No Workspace Agent",
        passwordHash: await hash("password", { type: argon2id }),
      })
      .returning({ id: users.id });

    await expect(
      resolveFirstWorkspaceMembership(user.id, database),
    ).rejects.toEqual(
      expect.objectContaining<Partial<AppError>>({ code: "NOT_FOUND" }),
    );
  });
});
