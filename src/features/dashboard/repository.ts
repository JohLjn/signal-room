import "server-only";

import { and, asc, desc, eq, or } from "drizzle-orm";

import type { DashboardRepositoryContract } from "@/contracts/dashboard";
import { getDatabase, type Database } from "@/db/client";
import { incidents, users } from "@/db/schema";

export function createDashboardRepository(
  database: Database = getDatabase(),
): DashboardRepositoryContract {
  return {
    async listOpenIncidents(workspaceId) {
      const rows = await database
        .select({
          id: incidents.id,
          title: incidents.title,
          status: incidents.status,
          severity: incidents.severity,
          ownerId: incidents.ownerId,
          ownerName: users.name,
          createdAt: incidents.createdAt,
          updatedAt: incidents.updatedAt,
        })
        .from(incidents)
        .innerJoin(users, eq(incidents.ownerId, users.id))
        .where(
          and(
            eq(incidents.workspaceId, workspaceId),
            or(
              eq(incidents.status, "open"),
              eq(incidents.status, "investigating"),
            ),
          ),
        )
        .orderBy(desc(incidents.updatedAt), asc(incidents.id));

      return rows.map((row) => {
        if (row.status !== "open" && row.status !== "investigating") {
          throw new Error("Dashboard query returned an inactive incident.");
        }

        return { ...row, status: row.status };
      });
    },
  };
}
