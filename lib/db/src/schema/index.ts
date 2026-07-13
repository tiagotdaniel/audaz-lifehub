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
  notifPrefs: jsonb("notif_prefs").notNull().default({ push: true, whatsapp: false }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
export const insertUserSchema = createInsertSchema(usersTable);
export type InsertUser = z.infer<typeof insertUserSchema>;

export const sectorsTable = pgTable("sectors", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  color: text("color").notNull().default("#6B7280"),
  isDefault: boolean("is_default").notNull().default(false),
});

export type Sector = typeof sectorsTable.$inferSelect;
export const insertSectorSchema = createInsertSchema(sectorsTable);
export type InsertSector = z.infer<typeof insertSectorSchema>;

export const projectsTable = pgTable("projects", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").notNull().default("#C9A84C"),
  deadline: timestamp("deadline", { withTimezone: true }),
  status: text("status").notNull().default("active"),
  objective: text("objective"),
  kpis: jsonb("kpis").notNull().default([]),
  attachments: jsonb("attachments").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Project = typeof projectsTable.$inferSelect;
export const insertProjectSchema = createInsertSchema(projectsTable);
export type InsertProject = z.infer<typeof insertProjectSchema>;

export const goalsTable = pgTable("goals", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type").notNull().default("numeric"),
  targetValue: real("target_value").notNull().default(100),
  currentValue: real("current_value").notNull().default(0),
  deadline: timestamp("deadline", { withTimezone: true }),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Goal = typeof goalsTable.$inferSelect;
export const insertGoalSchema = createInsertSchema(goalsTable);
export type InsertGoal = z.infer<typeof insertGoalSchema>;

export const tasksTable = pgTable("tasks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  sectorId: text("sector_id").references(() => sectorsTable.id),
  projectId: text("project_id").references(() => projectsTable.id),
  goalId: text("goal_id").references(() => goalsTable.id),
  title: text("title").notNull(),
  description: text("description"),
  priority: integer("priority").notNull().default(4),
  status: text("status").notNull().default("pending"),
  estimatedMinutes: integer("estimated_minutes"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  reminderAt: timestamp("reminder_at", { withTimezone: true }),
  reminderSent: boolean("reminder_sent").notNull().default(false),
  reminderChannels: text("reminder_channels").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Task = typeof tasksTable.$inferSelect;
export const insertTaskSchema = createInsertSchema(tasksTable);
export type InsertTask = z.infer<typeof insertTaskSchema>;

export const timeSessionsTable = pgTable("time_sessions", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => tasksTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  durationSeconds: integer("duration_seconds"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TimeSession = typeof timeSessionsTable.$inferSelect;
export const insertTimeSessionSchema = createInsertSchema(timeSessionsTable);
export type InsertTimeSession = z.infer<typeof insertTimeSessionSchema>;

export const milestonesTable = pgTable("milestones", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => projectsTable.id),
  title: text("title").notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Milestone = typeof milestonesTable.$inferSelect;
export const insertMilestoneSchema = createInsertSchema(milestonesTable);
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;

// ── New tables ──────────────────────────────────────────────────────────────

export const listsTable = pgTable("lists", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").notNull().default("#C9A84C"),
  resetSchedule: text("reset_schedule").notNull().default("none"),
  lastResetAt: timestamp("last_reset_at", { withTimezone: true }).defaultNow(),
  deadline: timestamp("deadline", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type List = typeof listsTable.$inferSelect;

export const listItemsTable = pgTable("list_items", {
  id: text("id").primaryKey(),
  listId: text("list_id").notNull().references(() => listsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  price: real("price"),
  checked: boolean("checked").notNull().default(false),
  checkedAt: timestamp("checked_at", { withTimezone: true }),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ListItem = typeof listItemsTable.$inferSelect;

export const financialEntriesTable = pgTable("financial_entries", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("expense"),
  amount: real("amount").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull().default("outros"),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type FinancialEntry = typeof financialEntriesTable.$inferSelect;

export const financialAccountsTable = pgTable("financial_accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull().default("caixa"),
  balance: real("balance").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type FinancialAccount = typeof financialAccountsTable.$inferSelect;

export const financialGoalsTable = pgTable("financial_goals", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  targetAmount: real("target_amount").notNull(),
  currentAmount: real("current_amount").notNull().default(0),
  deadline: timestamp("deadline", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type FinancialGoal = typeof financialGoalsTable.$inferSelect;

export const dreamBoardItemsTable = pgTable("dream_board_items", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  quote: text("quote"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DreamBoardItem = typeof dreamBoardItemsTable.$inferSelect;

export const documentsTable = pgTable("documents", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  parentId: text("parent_id"),
  title: text("title").notNull().default("Sem título"),
  content: text("content").notNull().default(""),
  icon: text("icon"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Document = typeof documentsTable.$inferSelect;

export const taskCommentsTable = pgTable("task_comments", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => tasksTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  parentId: text("parent_id"),
  content: text("content").notNull(),
  mentionedUserIds: text("mentioned_user_ids").array().notNull().default([]),
  attachments: jsonb("attachments").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TaskComment = typeof taskCommentsTable.$inferSelect;

export const taskAttachmentsTable = pgTable("task_attachments", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => tasksTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TaskAttachment = typeof taskAttachmentsTable.$inferSelect;

export const workoutDaysTable = pgTable("workout_days", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  exercises: jsonb("exercises").notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WorkoutDay = typeof workoutDaysTable.$inferSelect;

export const userShapeProfilesTable = pgTable("user_shape_profiles", {
  userId: text("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  age: integer("age"),
  heightCm: real("height_cm"),
  weightKg: real("weight_kg"),
  goalWeightKg: real("goal_weight_kg"),
  goalDate: text("goal_date"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserShapeProfile = typeof userShapeProfilesTable.$inferSelect;

export const dailyFitnessLogsTable = pgTable("daily_fitness_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  trainedMinutes: integer("trained_minutes").notNull().default(0),
  kcal: real("kcal").notNull().default(0),
  carbsG: real("carbs_g").notNull().default(0),
  proteinG: real("protein_g").notNull().default(0),
  fatG: real("fat_g").notNull().default(0),
  sugarG: real("sugar_g").notNull().default(0),
  waterMl: real("water_ml").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DailyFitnessLog = typeof dailyFitnessLogsTable.$inferSelect;

export const userStreaksTable = pgTable("user_streaks", {
  userId: text("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  streakDays: integer("streak_days").notNull().default(0),
  lastActiveDate: text("last_active_date"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserStreak = typeof userStreaksTable.$inferSelect;

export const productivityProfilesTable = pgTable("productivity_profiles", {
  userId: text("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  dailyWorkHours: real("daily_work_hours").notNull(),
  tasksPerDayEstimate: integer("tasks_per_day_estimate").notNull(),
  estimatedTimeLostMinutes: integer("estimated_time_lost_minutes").notNull(),
  productivityRating: integer("productivity_rating").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProductivityProfile = typeof productivityProfilesTable.$inferSelect;

export const feedbackTable = pgTable("feedback", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  type: text("type").notNull().default("bug"),
  message: text("message").notNull(),
  email: text("email"),
  attachments: jsonb("attachments").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Feedback = typeof feedbackTable.$inferSelect;

export const workspaceMembersTable = pgTable("workspace_members", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull().default("member"),
  status: text("status").notNull().default("pending"),
  invitedUserId: text("invited_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WorkspaceMember = typeof workspaceMembersTable.$inferSelect;
