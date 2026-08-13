import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { notFound, redirect, resolveAuthContext } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  resolveAuthContext: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound, redirect }));
vi.mock("@/features/auth/actions", () => ({
  signOutCurrentUser: vi.fn(),
}));
vi.mock("@/features/workspaces/resolve-auth-context", () => ({
  resolveAuthContext,
}));

import WorkspaceLayout from "@/app/w/[workspaceSlug]/layout";
import { AppError } from "@/lib/errors";

describe("protected workspace layout", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("redirects unauthenticated requests to sign in", async () => {
    resolveAuthContext.mockRejectedValue(
      new AppError("UNAUTHENTICATED", "Authentication is required."),
    );

    await expect(
      WorkspaceLayout({
        children: createElement("div", null, "Protected"),
        params: Promise.resolve({ workspaceSlug: "operations" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledWith("/sign-in");
  });

  it("does not disclose a workspace to a non-member", async () => {
    resolveAuthContext.mockRejectedValue(
      new AppError("NOT_FOUND", "Workspace not found."),
    );

    await expect(
      WorkspaceLayout({
        children: createElement("div", null, "Protected"),
        params: Promise.resolve({ workspaceSlug: "other-workspace" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalledOnce();
  });
});
