import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { INCIDENT_SEVERITIES, INCIDENT_STATUSES } from "@/contracts/domain";
import { workspaceMemberships, workspaces } from "@/db/schema/workspaces";

export const incidentStatusEnum = pgEnum("incident_status", INCIDENT_STATUSES);
export const incidentSeverityEnum = pgEnum("incident_severity", INCIDENT_SEVERITIES);

export const incidents = pgTable(
  "incidents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull(),
    creatorId: uuid("creator_id").notNull(),
    ownerId: uuid("owner_id").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").default("").notNull(),
    status: incidentStatusEnum("status").notNull(),
    severity: incidentSeverityEnum("severity").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("incidents_workspace_id_id_unique").on(table.workspaceId, table.id),
    foreignKey({
      name: "incidents_workspace_id_fkey",
      columns: [table.workspaceId],
      foreignColumns: [workspaces.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "incidents_creator_membership_fkey",
      columns: [table.workspaceId, table.creatorId],
      foreignColumns: [workspaceMemberships.workspaceId, workspaceMemberships.userId],
    }).onDelete("restrict"),
    foreignKey({
      name: "incidents_owner_membership_fkey",
      columns: [table.workspaceId, table.ownerId],
      foreignColumns: [workspaceMemberships.workspaceId, workspaceMemberships.userId],
    }).onDelete("restrict"),
    check("incidents_title_not_empty", sql`length(btrim(${table.title})) > 0`),
    index("incidents_workspace_status_idx").on(table.workspaceId, table.status),
    index("incidents_workspace_updated_at_idx").on(table.workspaceId, table.updatedAt),
  ],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull(),
    incidentId: uuid("incident_id").notNull(),
    authorId: uuid("author_id").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("comments_workspace_incident_id_unique").on(
      table.workspaceId,
      table.incidentId,
      table.id,
    ),
    foreignKey({
      name: "comments_incident_fkey",
      columns: [table.workspaceId, table.incidentId],
      foreignColumns: [incidents.workspaceId, incidents.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "comments_author_membership_fkey",
      columns: [table.workspaceId, table.authorId],
      foreignColumns: [workspaceMemberships.workspaceId, workspaceMemberships.userId],
    }).onDelete("restrict"),
    check("comments_body_not_empty", sql`length(btrim(${table.body})) > 0`),
    index("comments_incident_created_at_id_idx").on(
      table.incidentId,
      table.createdAt,
      table.id,
    ),
  ],
);
