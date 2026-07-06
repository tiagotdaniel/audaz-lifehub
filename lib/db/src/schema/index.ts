import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  avatarUrl: text("avatar_url"),
  whatsappNumber: text("whatsapp_number"),
  timezone: text("timezone").notNull().default("America/Bahia"),
  notifPrefs: jsonb("notif_prefs")
    .notNull()
    .default({ push: true, whatsapp: false }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
export const insertUserSchema = createInsertSchema(usersTable);
export type InsertUser = z.infer<typeof insertUserSchema>;

export const sectorsTable = pgTable("sectors", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  color: text("color").notNull().default("#6B7280"),
  isDefault: boolean("is_default").notNull().default(false),
});

export type Sector = typeof sectorsTable.$inferSelect;
export const insertSectorSchema = createInsertSchema(sectorsTable);
export type InsertSector = z.infer<typeof insertSectorSchema>;

export const projectsTable = pgTable("projects", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").notNull().default("#C9A84C"),
  deadline: timestamp("deadline", { withTimezone: true }),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Project = typeof projectsTable.$inferSelect;
export const insertProjectSchema = createInsertSchema(projectsTable);
export type InsertProject = z.infer<typeof insertProjectSchema>;

export const goalsTable = pgTable("goals", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type").notNull().default("numeric"),
  targetValue: real("target_value").notNull().default(100),
  currentValue: real("current_value").notNull().default(0),
  deadline: timestamp("deadline", { withTimezone: true }),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Goal = typeof goalsTable.$inferSelect;
export const insertGoalSchema = createInsertSchema(goalsTable);
export type InsertGoal = z.infer<typeof insertGoalSchema>;

export const tasksTable = pgTable("tasks", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  sectorId: text("sector_id").references(() => sectorsTable.id),
  projectId: text("project_id").references(() => projectsTable.id),
  goalId: text("goal_id").references(() => goalsTable.id),
  title: text("title").notNull(),
  description: text("description"),
  priority: integer("priority").notNull().default(4),
  status: text("status").notNull().default("pending"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  reminderAt: timestamp("reminder_at", { withTimezone: true }),
  reminderSent: boolean("reminder_sent").notNull().default(false),
  reminderChannels: text("reminder_channels").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Task = typeof tasksTable.$inferSelect;
export const insertTaskSchema = createInsertSchema(tasksTable);
export type InsertTask = z.infer<typeof insertTaskSchema>;

export const timeSessionsTable = pgTable("time_sessions", {
  id: text("id").primaryKey(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasksTable.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  durationSeconds: integer("duration_seconds"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type TimeSession = typeof timeSessionsTable.$inferSelect;
export const insertTimeSessionSchema = createInsertSchema(timeSessionsTable);
export type InsertTimeSession = z.infer<typeof insertTimeSessionSchema>;

export const milestonesTable = pgTable("milestones", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => projectsTable.id),
  title: text("title").notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Milestone = typeof milestonesTable.$inferSelect;
export const insertMilestoneSchema = createInsertSchema(milestonesTable);
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
