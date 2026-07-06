import { Router } from "express";
import { db, tasksTable, sectorsTable, projectsTable, goalsTable, timeSessionsTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { randomUUID } from "crypto";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { status, sectorId, priority, projectId, goalId, dateFrom, dateTo } = req.query as Record<string, string>;

  const conditions = [eq(tasksTable.userId, userId)];
  if (status) conditions.push(eq(tasksTable.status, status));
  if (sectorId) conditions.push(eq(tasksTable.sectorId, sectorId));
  if (priority) conditions.push(eq(tasksTable.priority, parseInt(priority)));
  if (projectId) conditions.push(eq(tasksTable.projectId, projectId));
  if (goalId) conditions.push(eq(tasksTable.goalId, goalId));
  if (dateFrom) conditions.push(gte(tasksTable.dueDate, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(tasksTable.dueDate, new Date(dateTo)));

  const tasks = await db
    .select({
      task: tasksTable,
      sector: sectorsTable,
      project: projectsTable,
    })
    .from(tasksTable)
    .leftJoin(sectorsTable, eq(tasksTable.sectorId, sectorsTable.id))
    .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .where(and(...conditions));

  const taskIds = tasks.map((t) => t.task.id);
  let sessionTotals: Record<string, number> = {};
  if (taskIds.length > 0) {
    const totals = await db
      .select({
        taskId: timeSessionsTable.taskId,
        total: sql<number>`COALESCE(SUM(${timeSessionsTable.durationSeconds}), 0)`,
      })
      .from(timeSessionsTable)
      .where(and(eq(timeSessionsTable.userId, userId)))
      .groupBy(timeSessionsTable.taskId);
    for (const t of totals) {
      sessionTotals[t.taskId] = t.total;
    }
  }

  res.json(
    tasks.map(({ task, sector, project }) => ({
      ...task,
      sector: sector ?? null,
      project: project ?? null,
      totalTimeSeconds: sessionTotals[task.id] ?? 0,
    }))
  );
});

router.post("/", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { title, description, priority, dueDate, reminderAt, reminderChannels, sectorId, projectId, goalId } = req.body;

  const id = randomUUID();
  await db.insert(tasksTable).values({
    id,
    userId,
    title,
    description: description ?? null,
    priority: priority ?? 4,
    dueDate: dueDate ? new Date(dueDate) : null,
    reminderAt: reminderAt ? new Date(reminderAt) : null,
    reminderChannels: reminderChannels ?? [],
    sectorId: sectorId ?? null,
    projectId: projectId ?? null,
    goalId: goalId ?? null,
  });

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  res.status(201).json({ ...task, sector: null, project: null, totalTimeSeconds: 0 });
});

router.get("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId!;

  const [row] = await db
    .select({ task: tasksTable, sector: sectorsTable, project: projectsTable, goal: goalsTable })
    .from(tasksTable)
    .leftJoin(sectorsTable, eq(tasksTable.sectorId, sectorsTable.id))
    .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .leftJoin(goalsTable, eq(tasksTable.goalId, goalsTable.id))
    .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId)));

  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  const sessions = await db
    .select()
    .from(timeSessionsTable)
    .where(eq(timeSessionsTable.taskId, id));

  const totalTimeSeconds = sessions.reduce((acc, s) => acc + (s.durationSeconds ?? 0), 0);

  res.json({
    ...row.task,
    sector: row.sector ?? null,
    project: row.project ?? null,
    goal: row.goal ?? null,
    timeSessions: sessions,
    totalTimeSeconds,
  });
});

router.patch("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId!;
  const updates: Partial<typeof tasksTable.$inferInsert> = { updatedAt: new Date() };

  const fields = ["title", "description", "priority", "status", "sectorId", "projectId", "goalId", "reminderChannels"] as const;
  for (const f of fields) {
    if (req.body[f] !== undefined) (updates as any)[f] = req.body[f];
  }
  if (req.body.dueDate !== undefined) updates.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
  if (req.body.reminderAt !== undefined) updates.reminderAt = req.body.reminderAt ? new Date(req.body.reminderAt) : null;

  await db.update(tasksTable).set(updates).where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId)));
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!task) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...task, sector: null, project: null, totalTimeSeconds: 0 });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId!;
  await db.update(tasksTable).set({ status: "cancelled", updatedAt: new Date() }).where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId)));
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  res.json({ ...task, sector: null, project: null, totalTimeSeconds: 0 });
});

router.patch("/:id/execute", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId!;

  // Stop any currently executing task
  const executingTasks = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.userId, userId), eq(tasksTable.status, "executing")));

  for (const t of executingTasks) {
    const activeSessions = await db
      .select()
      .from(timeSessionsTable)
      .where(and(eq(timeSessionsTable.taskId, t.id), sql`${timeSessionsTable.endedAt} IS NULL`));

    for (const s of activeSessions) {
      const durationSeconds = Math.round((Date.now() - new Date(s.startedAt).getTime()) / 1000);
      await db.update(timeSessionsTable).set({ endedAt: new Date(), durationSeconds }).where(eq(timeSessionsTable.id, s.id));
    }
    await db.update(tasksTable).set({ status: "pending", updatedAt: new Date() }).where(eq(tasksTable.id, t.id));
  }

  // Start new session
  const sessionId = randomUUID();
  await db.insert(timeSessionsTable).values({ id: sessionId, taskId: id, userId, startedAt: new Date() });
  await db.update(tasksTable).set({ status: "executing", updatedAt: new Date() }).where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId)));

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  const [session] = await db.select().from(timeSessionsTable).where(eq(timeSessionsTable.id, sessionId));
  res.json({ task: { ...task, sector: null, project: null, totalTimeSeconds: 0 }, session });
});

router.patch("/:id/pause", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId!;

  const activeSessions = await db
    .select()
    .from(timeSessionsTable)
    .where(and(eq(timeSessionsTable.taskId, id), sql`${timeSessionsTable.endedAt} IS NULL`));

  for (const s of activeSessions) {
    const durationSeconds = Math.round((Date.now() - new Date(s.startedAt).getTime()) / 1000);
    await db.update(timeSessionsTable).set({ endedAt: new Date(), durationSeconds }).where(eq(timeSessionsTable.id, s.id));
  }

  await db.update(tasksTable).set({ status: "paused", updatedAt: new Date() }).where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId)));
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  res.json({ ...task, sector: null, project: null, totalTimeSeconds: 0 });
});

router.patch("/:id/stop", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId!;

  const activeSessions = await db
    .select()
    .from(timeSessionsTable)
    .where(and(eq(timeSessionsTable.taskId, id), sql`${timeSessionsTable.endedAt} IS NULL`));

  for (const s of activeSessions) {
    const durationSeconds = Math.round((Date.now() - new Date(s.startedAt).getTime()) / 1000);
    await db.update(timeSessionsTable).set({ endedAt: new Date(), durationSeconds }).where(eq(timeSessionsTable.id, s.id));
  }

  await db.update(tasksTable).set({ status: "pending", updatedAt: new Date() }).where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId)));
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  res.json({ ...task, sector: null, project: null, totalTimeSeconds: 0 });
});

router.patch("/:id/done", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId!;

  // End any active sessions
  const activeSessions = await db
    .select()
    .from(timeSessionsTable)
    .where(and(eq(timeSessionsTable.taskId, id), sql`${timeSessionsTable.endedAt} IS NULL`));

  for (const s of activeSessions) {
    const durationSeconds = Math.round((Date.now() - new Date(s.startedAt).getTime()) / 1000);
    await db.update(timeSessionsTable).set({ endedAt: new Date(), durationSeconds }).where(eq(timeSessionsTable.id, s.id));
  }

  await db.update(tasksTable).set({ status: "done", updatedAt: new Date() }).where(and(eq(tasksTable.id, id), eq(tasksTable.userId, userId)));
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  res.json({ ...task, sector: null, project: null, totalTimeSeconds: 0 });
});

export default router;
