import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  pgEnum,
  pgTable,
  primaryKey,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { MEMBERSHIP_ROLES } from "@/contracts/domain";
import { users } from "@/db/schema/users";

export const membershipRoleEnum = pgEnum("membership_role", MEMBERSHIP_ROLES);

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 100 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("workspaces_slug_unique").on(table.slug),
    check("workspaces_slug_normalized", sql`${table.slug} = lower(${table.slug})`),
    check("workspaces_slug_not_empty", sql`length(${table.slug}) > 0`),
    check("workspaces_name_not_empty", sql`length(btrim(${table.name})) > 0`),
  ],
);

export const workspaceMemberships = pgTable(
  "workspace_memberships",
  {
    workspaceId: uuid("workspace_id").notNull(),
    userId: uuid("user_id").notNull(),
    role: membershipRoleEnum("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({
      name: "workspace_memberships_pkey",
      columns: [table.workspaceId, table.userId],
    }),
    foreignKey({
      name: "workspace_memberships_workspace_id_fkey",
      columns: [table.workspaceId],
      foreignColumns: [workspaces.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "workspace_memberships_user_id_fkey",
      columns: [table.userId],
      foreignColumns: [users.id],
    }).onDelete("restrict"),
  ],
);
