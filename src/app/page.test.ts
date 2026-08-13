import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  notFound,
  redirect,
  resolveAuthenticatedIdentity,
  resolveFirstWorkspaceMembership,
} = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  resolveAuthenticatedIdentity: vi.fn(),
  resolveFirstWorkspaceMembership: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound, redirect }));
vi.mock("@/features/auth/session", () => ({ resolveAuthenticatedIdentity }));
vi.mock("@/features/workspaces/membership", () => ({
  resolveFirstWorkspaceMembership,
}));

import Home from "@/app/page";
import { AppError } from "@/lib/errors";

describe("root entry route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("redirects unauthenticated requests to sign in", async () => {
    resolveAuthenticatedIdentity.mockRejectedValue(
      new AppError("UNAUTHENTICATED", "Authentication is required."),
    );

    await expect(Home()).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledWith("/sign-in");
    expect(resolveFirstWorkspaceMembership).not.toHaveBeenCalled();
  });

  it("redirects an authenticated user to their first membership", async () => {
    resolveAuthenticatedIdentity.mockResolvedValue({
      userId: "2f95ea3f-e5ac-4e90-a38f-87582973e23e",
    });
    resolveFirstWorkspaceMembership.mockResolvedValue({
      workspaceId: "40e594ab-01ce-4be2-b6c6-322200097621",
      workspaceSlug: "operations",
      role: "member",
    });

    await expect(Home()).rejects.toThrow("NEXT_REDIRECT");

    expect(resolveFirstWorkspaceMembership).toHaveBeenCalledWith(
      "2f95ea3f-e5ac-4e90-a38f-87582973e23e",
    );
    expect(redirect).toHaveBeenCalledWith("/w/operations");
  });

  it("returns not found when an authenticated user has no memberships", async () => {
    resolveAuthenticatedIdentity.mockResolvedValue({
      userId: "2f95ea3f-e5ac-4e90-a38f-87582973e23e",
    });
    resolveFirstWorkspaceMembership.mockRejectedValue(
      new AppError("NOT_FOUND", "Workspace not found."),
    );

    await expect(Home()).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalledOnce();
  });
});
