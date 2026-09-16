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
  comments: many(comments),
}));

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    issueId: uuid("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    /** Whatever name the commenter typed; there are no accounts to point at. */
    author: text("author").notNull(),
    /** Empty when the comment is nothing but attached images. */
    body: text("body").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("comments_issue_id_created_at_idx").on(table.issueId, table.createdAt)],
);

/**
 * Kept apart from `images` rather than given a nullable owner column, so an
 * issue's screenshots and a comment's attachments can never be confused for
 * one another by a query that forgets to filter.
 */
export const commentImages = pgTable(
  "comment_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    pathname: text("pathname").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("comment_images_comment_id_position_idx").on(
      table.commentId,
      table.position,
    ),
  ],
);

export const imagesRelations = relations(images, ({ one }) => ({
  issue: one(issues, { fields: [images.issueId], references: [issues.id] }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  issue: one(issues, { fields: [comments.issueId], references: [issues.id] }),
  images: many(commentImages),
}));

export const commentImagesRelations = relations(commentImages, ({ one }) => ({
  comment: one(comments, {
    fields: [commentImages.commentId],
    references: [comments.id],
  }),
}));

export type Page = typeof pages.$inferSelect;
export type Issue = typeof issues.$inferSelect;
export type Image = typeof images.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type CommentImage = typeof commentImages.$inferSelect;
export type CommentWithImages = Comment & { images: CommentImage[] };
/** What a page renders: the issue plus everything hanging off it. */
export type IssueWithDetails = Issue & {
  images: Image[];
  comments: CommentWithImages[];
};
