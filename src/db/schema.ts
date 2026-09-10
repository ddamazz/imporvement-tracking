import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { EFFORTS, PRIORITIES, STATUSES } from "@/lib/constants";

export const priorityEnum = pgEnum("priority", PRIORITIES);
export const effortEnum = pgEnum("effort", EFFORTS);
export const statusEnum = pgEnum("status", STATUSES);

export const pages = pgTable("pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  emoji: text("emoji"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const issues = pgTable(
  "issues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    priority: priorityEnum("priority").notNull().default("medium"),
    effort: effortEnum("effort").notNull().default("medium"),
    status: statusEnum("status").notNull().default("open"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("issues_page_id_position_idx").on(table.pageId, table.position)],
);

export const images = pgTable(
  "images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    issueId: uuid("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    /** Blob pathname, kept so the stored file can be deleted later. */
    pathname: text("pathname").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("images_issue_id_position_idx").on(table.issueId, table.position)],
);

export const pagesRelations = relations(pages, ({ many }) => ({
  issues: many(issues),
}));

export const issuesRelations = relations(issues, ({ one, many }) => ({
  page: one(pages, { fields: [issues.pageId], references: [pages.id] }),
  images: many(images),
}));

export const imagesRelations = relations(images, ({ one }) => ({
  issue: one(issues, { fields: [images.issueId], references: [issues.id] }),
}));

export type Page = typeof pages.$inferSelect;
export type Issue = typeof issues.$inferSelect;
export type Image = typeof images.$inferSelect;
export type IssueWithImages = Issue & { images: Image[] };
