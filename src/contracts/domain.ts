import { z } from "zod";

export const INCIDENT_STATUSES = [
  "open",
  "investigating",
  "resolved",
  "closed",
] as const;
export const INCIDENT_SEVERITIES = ["sev1", "sev2", "sev3", "sev4"] as const;
export const MEMBERSHIP_ROLES = ["member", "admin"] as const;
export const ACTIVITY_TYPES = [
  "incident_created",
  "status_changed",
  "severity_changed",
  "owner_changed",
  "comment_added",
] as const;

export const IncidentStatusSchema = z.enum(INCIDENT_STATUSES);
export const IncidentSeveritySchema = z.enum(INCIDENT_SEVERITIES);
export const MembershipRoleSchema = z.enum(MEMBERSHIP_ROLES);
export const ActivityTypeSchema = z.enum(ACTIVITY_TYPES);
export const UuidSchema = z.string().uuid();

export type IncidentStatus = z.infer<typeof IncidentStatusSchema>;
export type IncidentSeverity = z.infer<typeof IncidentSeveritySchema>;
export type MembershipRole = z.infer<typeof MembershipRoleSchema>;
export type ActivityType = z.infer<typeof ActivityTypeSchema>;
export type Uuid = z.infer<typeof UuidSchema>;
