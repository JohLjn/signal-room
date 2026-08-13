import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveAuthenticatedIdentity, resolveWorkspaceMembership } = vi.hoisted(
  () => ({
    resolveAuthenticatedIdentity: vi.fn(),
    resolveWorkspaceMembership: vi.fn(),
  }),
);

vi.mock("@/features/auth/session", () => ({ resolveAuthenticatedIdentity }));
vi.mock("@/features/workspaces/membership", () => ({ resolveWorkspaceMembership }));

import { resolveAuthContext } from "@/features/workspaces/resolve-auth-context";
import { AppError } from "@/lib/errors";

describe("resolveAuthContext", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects unauthenticated access before membership resolution", async () => {
    resolveAuthenticatedIdentity.mockRejectedValue(
      new AppError("UNAUTHENTICATED", "Authentication is required."),
    );

    await expect(resolveAuthContext("operations")).rejects.toEqual(
      expect.objectContaining<Partial<AppError>>({ code: "UNAUTHENTICATED" }),
    );
    expect(resolveWorkspaceMembership).not.toHaveBeenCalled();
  });

  it("constructs trusted context only from session identity and membership", async () => {
    resolveAuthenticatedIdentity.mockResolvedValue({
      userId: "11111111-1111-4111-8111-111111111111",
    });
    resolveWorkspaceMembership.mockResolvedValue({
      workspaceId: "22222222-2222-4222-8222-222222222222",
      workspaceSlug: "operations",
      role: "member",
    });

    const context = await resolveAuthContext("operations");

    expect(resolveWorkspaceMembership).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      "operations",
    );
    expect(context).toEqual({
      userId: "11111111-1111-4111-8111-111111111111",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      workspaceSlug: "operations",
      membershipRole: "member",
    });
    expect(Object.isFrozen(context)).toBe(true);
  });
});
