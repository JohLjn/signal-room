import "server-only";

import {
  DashboardResultSchema,
  type DashboardRepositoryContract,
  type DashboardResult,
  type DashboardServiceContract,
} from "@/contracts/dashboard";
import { INCIDENT_SEVERITIES } from "@/contracts/domain";
import type { AuthContext } from "@/lib/auth-context";

import { createDashboardRepository } from "./repository";

export function createDashboardService(
  repository: DashboardRepositoryContract,
): DashboardServiceContract {
  return {
    async getDashboard(authContext) {
      const records = await repository.listOpenIncidents(authContext.workspaceId);
      const openIncidents = records.filter(({ status }) => status === "open");

      return DashboardResultSchema.parse({
        incidents: records.map((incident) => ({
          id: incident.id,
          title: incident.title,
          status: incident.status,
          severity: incident.severity,
          owner: {
            id: incident.ownerId,
            name: incident.ownerName,
          },
          createdAt: incident.createdAt.toISOString(),
          updatedAt: incident.updatedAt.toISOString(),
        })),
        metrics: {
          openIncidents: openIncidents.length,
          investigatingIncidents: records.length - openIncidents.length,
          openBySeverity: Object.fromEntries(
            INCIDENT_SEVERITIES.map((severity) => [
              severity,
              openIncidents.filter((incident) => incident.severity === severity).length,
            ]),
          ),
        },
      });
    },
  };
}

export function getDashboard(authContext: AuthContext): Promise<DashboardResult> {
  return createDashboardService(createDashboardRepository()).getDashboard(authContext);
}
