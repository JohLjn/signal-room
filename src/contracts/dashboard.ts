import { z } from "zod";

import {
  INCIDENT_SEVERITIES,
  type IncidentSeverity,
  type IncidentStatus,
} from "@/contracts/domain";
import { IncidentSummarySchema } from "@/contracts/incidents";
import type { AuthContext } from "@/lib/auth-context";

const OpenBySeveritySchema = z.object(
  Object.fromEntries(
    INCIDENT_SEVERITIES.map((severity) => [severity, z.number().int().nonnegative()]),
  ) as Record<(typeof INCIDENT_SEVERITIES)[number], z.ZodNumber>,
);

export const DashboardResultSchema = z.object({
  incidents: z.array(IncidentSummarySchema),
  metrics: z.object({
    openIncidents: z.number().int().nonnegative(),
    investigatingIncidents: z.number().int().nonnegative(),
    openBySeverity: OpenBySeveritySchema,
  }),
});

export type DashboardResult = z.infer<typeof DashboardResultSchema>;

/**
 * Frozen persistence-facing projection for the dashboard. Agent 3 implements
 * this workspace-scoped query against the shared incident schema; it must not
 * introduce a second incident persistence model.
 */
export interface DashboardIncidentRecord {
  id: string;
  title: string;
  status: Exclude<IncidentStatus, "resolved" | "closed">;
  severity: IncidentSeverity;
  ownerId: string;
  ownerName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardRepositoryContract {
  listOpenIncidents(workspaceId: string): Promise<DashboardIncidentRecord[]>;
}

export interface DashboardServiceContract {
  getDashboard(authContext: AuthContext): Promise<DashboardResult>;
}
