import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("users_email_unique").on(table.email),
    check("users_email_normalized", sql`${table.email} = lower(${table.email})`),
    check("users_email_not_empty", sql`length(${table.email}) > 0`),
    check("users_name_not_empty", sql`length(btrim(${table.name})) > 0`),
  ],
);
