import { describe, expect, it } from "vitest";

import { DashboardResultSchema } from "@/contracts/dashboard";
import {
  CreateIncidentInputSchema,
  UpdateIncidentInputSchema,
} from "@/contracts/incidents";
import { createAuthContext } from "@/lib/auth-context";

const ownerId = "00000000-0000-4000-8000-000000000001";

describe("shared incident contracts", () => {
  it("normalizes an omitted description to an empty string", () => {
    expect(
      CreateIncidentInputSchema.parse({
        title: "Database latency",
        status: "open",
        severity: "sev2",
        ownerId,
      }).description,
    ).toBe("");
  });

  it("rejects empty updates", () => {
    expect(UpdateIncidentInputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects statuses outside the frozen domain", () => {
    expect(
      CreateIncidentInputSchema.safeParse({
        title: "Database latency",
        status: "pending",
        severity: "sev2",
        ownerId,
      }).success,
    ).toBe(false);
  });
});

describe("shared dashboard contract", () => {
  it("requires a count for every severity", () => {
    expect(
      DashboardResultSchema.safeParse({
        incidents: [],
        metrics: {
          openIncidents: 0,
          investigatingIncidents: 0,
          openBySeverity: { sev1: 0, sev2: 0, sev3: 0 },
        },
      }).success,
    ).toBe(false);
  });
});

describe("trusted authorization context", () => {
  it("can only be created from the resolved server-side inputs", () => {
    const authContext = createAuthContext(
      { userId: ownerId },
      {
        workspaceId: "00000000-0000-4000-8000-000000000002",
        workspaceSlug: "operations",
        role: "admin",
      },
    );

    expect(authContext).toEqual({
      userId: ownerId,
      workspaceId: "00000000-0000-4000-8000-000000000002",
      workspaceSlug: "operations",
      membershipRole: "admin",
    });
    expect(Object.isFrozen(authContext)).toBe(true);
  });
});
