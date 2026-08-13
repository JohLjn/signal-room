import { describe, expect, it } from "vitest";

import { authenticatedIdentityFromSession } from "@/features/auth/identity";
import { AppError } from "@/lib/errors";

describe("authenticated identity resolution", () => {
  it("rejects an unauthenticated session", () => {
    expect(() => authenticatedIdentityFromSession(null)).toThrowError(
      expect.objectContaining<Partial<AppError>>({ code: "UNAUTHENTICATED" }),
    );
  });

  it("rejects a session without a valid persisted user identifier", () => {
    expect(() =>
      authenticatedIdentityFromSession({
        user: { id: "client-supplied-value" },
        expires: new Date(Date.now() + 60_000).toISOString(),
      }),
    ).toThrowError(expect.objectContaining<Partial<AppError>>({ code: "UNAUTHENTICATED" }));
  });

  it("returns only the stable identity from a valid session", () => {
    expect(
      authenticatedIdentityFromSession({
        user: { id: "11111111-1111-4111-8111-111111111111" },
        expires: new Date(Date.now() + 60_000).toISOString(),
      }),
    ).toEqual({ userId: "11111111-1111-4111-8111-111111111111" });
  });
});
