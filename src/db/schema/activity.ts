import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { ACTIVITY_TYPES, type ActivityType } from "@/contracts/domain";
import type { ActivityDetails } from "@/contracts/incidents";
import { comments, incidents } from "@/db/schema/incidents";
import { workspaceMemberships } from "@/db/schema/workspaces";

export const activityTypeEnum = pgEnum("activity_type", ACTIVITY_TYPES);

export const activityEntries = pgTable(
  "activity_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull(),
    incidentId: uuid("incident_id").notNull(),
    actorId: uuid("actor_id").notNull(),
    type: activityTypeEnum("type").$type<ActivityType>().notNull(),
    commentId: uuid("comment_id"),
    details: jsonb("details").$type<ActivityDetails>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      name: "activity_entries_incident_fkey",
      columns: [table.workspaceId, table.incidentId],
      foreignColumns: [incidents.workspaceId, incidents.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "activity_entries_actor_membership_fkey",
      columns: [table.workspaceId, table.actorId],
      foreignColumns: [workspaceMemberships.workspaceId, workspaceMemberships.userId],
    }).onDelete("restrict"),
    foreignKey({
      name: "activity_entries_comment_fkey",
      columns: [table.workspaceId, table.incidentId, table.commentId],
      foreignColumns: [comments.workspaceId, comments.incidentId, comments.id],
    }).onDelete("restrict"),
    check(
      "activity_entries_comment_link_check",
      sql`(${table.type} = 'comment_added' AND ${table.commentId} IS NOT NULL) OR (${table.type} <> 'comment_added' AND ${table.commentId} IS NULL)`,
    ),
    index("activity_entries_incident_created_at_id_idx").on(
      table.incidentId,
      table.createdAt,
      table.id,
    ),
  ],
);
