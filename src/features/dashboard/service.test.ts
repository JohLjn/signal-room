import { describe, expect, it, vi } from "vitest";

import type { DashboardRepositoryContract } from "@/contracts/dashboard";
import { createAuthContext } from "@/lib/auth-context";

import { createDashboardService } from "./service";

const authContext = createAuthContext(
  { userId: "00000000-0000-4000-8000-000000000001" },
  {
    workspaceId: "00000000-0000-4000-8000-000000000002",
    workspaceSlug: "operations",
    role: "member",
  },
);

describe("dashboard service", () => {
  it("maps records and calculates the approved status and severity metrics", async () => {
    const repository: DashboardRepositoryContract = {
      listOpenIncidents: vi.fn().mockResolvedValue([
        record("00000000-0000-4000-8000-000000000010", "open", "sev1"),
        record("00000000-0000-4000-8000-000000000011", "open", "sev1"),
        record("00000000-0000-4000-8000-000000000012", "open", "sev3"),
        record(
          "00000000-0000-4000-8000-000000000013",
          "investigating",
          "sev2",
        ),
      ]),
    };

    const result = await createDashboardService(repository).getDashboard(authContext);

    expect(repository.listOpenIncidents).toHaveBeenCalledWith(authContext.workspaceId);
    expect(result.metrics).toEqual({
      openIncidents: 3,
      investigatingIncidents: 1,
      openBySeverity: { sev1: 2, sev2: 0, sev3: 1, sev4: 0 },
    });
    expect(result.incidents[0]).toMatchObject({
      owner: {
        id: "00000000-0000-4000-8000-000000000099",
        name: "Alex Owner",
      },
      updatedAt: "2026-08-13T10:30:00.000Z",
    });
  });
});

function record(
  id: string,
  status: "open" | "investigating",
  severity: "sev1" | "sev2" | "sev3" | "sev4",
) {
  return {
    id,
    title: `Incident ${id}`,
    status,
    severity,
    ownerId: "00000000-0000-4000-8000-000000000099",
    ownerName: "Alex Owner",
    createdAt: new Date("2026-08-13T09:00:00.000Z"),
    updatedAt: new Date("2026-08-13T10:30:00.000Z"),
  };
}
