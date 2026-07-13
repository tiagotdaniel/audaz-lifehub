import { Router } from "express";
import { db, tasksTable, timeSessionsTable, productivityProfilesTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/weekly", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const [counts] = await db
    .select({
      total: sql<number>`COUNT(*)`,
      done: sql<number>`SUM(CASE WHEN ${tasksTable.status} = 'done' THEN 1 ELSE 0 END)`,
      pending: sql<number>`SUM(CASE WHEN ${tasksTable.status} = 'pending' THEN 1 ELSE 0 END)`,
      executing: sql<number>`SUM(CASE WHEN ${tasksTable.status} = 'executing' THEN 1 ELSE 0 END)`,
    })
    .from(tasksTable)
    .where(eq(tasksTable.userId, userId));

  const [timeResult] = await db
    .select({
      totalSeconds: sql<number>`COALESCE(SUM(${timeSessionsTable.durationSeconds}), 0)`,
    })
    .from(timeSessionsTable)
    .where(
      and(
        eq(timeSessionsTable.userId, userId),
        gte(timeSessionsTable.startedAt, startOfWeek),
        lte(timeSessionsTable.startedAt, endOfWeek),
      )
    );

  const doneTasks = await db
    .select({ updatedAt: tasksTable.updatedAt })
    .from(tasksTable)
    .where(
      and(
        eq(tasksTable.userId, userId),
        eq(tasksTable.status, "done"),
        gte(tasksTable.updatedAt, startOfWeek),
        lte(tasksTable.updatedAt, endOfWeek),
      )
    );

  const byDayMap: Record<string, number> = {};
  for (const t of doneTasks) {
    const d = new Date(t.updatedAt);
    const key = d.toISOString().split("T")[0];
    byDayMap[key] = (byDayMap[key] ?? 0) + 1;
  }

  const byDay = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const key = d.toISOString().split("T")[0];
    byDay.push({ date: key, count: byDayMap[key] ?? 0 });
  }

  res.json({
    total: counts.total ?? 0,
    done: counts.done ?? 0,
    pending: counts.pending ?? 0,
    executing: counts.executing ?? 0,
    totalHours: Math.round(((timeResult?.totalSeconds ?? 0) / 3600) * 10) / 10,
    byDay,
  });
});

router.get("/annual", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const now = new Date();
  const yearAgo = new Date(now);
  yearAgo.setFullYear(now.getFullYear() - 1);

  const doneTasks = await db
    .select({ updatedAt: tasksTable.updatedAt })
    .from(tasksTable)
    .where(
      and(
        eq(tasksTable.userId, userId),
        eq(tasksTable.status, "done"),
        gte(tasksTable.updatedAt, yearAgo),
      )
    );

  const countMap: Record<string, number> = {};
  for (const t of doneTasks) {
    const key = new Date(t.updatedAt).toISOString().split("T")[0];
    countMap[key] = (countMap[key] ?? 0) + 1;
  }

  const heatmap = [];
  for (let i = 0; i < 365; i++) {
    const d = new Date(yearAgo);
    d.setDate(yearAgo.getDate() + i);
    const key = d.toISOString().split("T")[0];
    heatmap.push({ date: key, count: countMap[key] ?? 0 });
  }

  res.json({ heatmap });
});

router.get("/productivity", requireAuth, async (req, res) => {
  const userId = req.userId!;

  const rows = await db
    .select({
      taskId: tasksTable.id,
      title: tasksTable.title,
      estimatedMinutes: tasksTable.estimatedMinutes,
      status: tasksTable.status,
      totalSeconds: sql<number>`COALESCE(SUM(${timeSessionsTable.durationSeconds}), 0)`,
    })
    .from(tasksTable)
    .leftJoin(timeSessionsTable, eq(timeSessionsTable.taskId, tasksTable.id))
    .where(eq(tasksTable.userId, userId))
    .groupBy(tasksTable.id, tasksTable.title, tasksTable.estimatedMinutes, tasksTable.status);

  const byTask = rows
    .filter((r) => r.totalSeconds > 0)
    .sort((a, b) => b.totalSeconds - a.totalSeconds)
    .slice(0, 8)
    .map((r) => ({ title: r.title, minutes: Math.round(r.totalSeconds / 60) }));

  let savedMinutes = 0;
  let lostMinutes = 0;
  for (const r of rows) {
    if (r.status !== "done" || !r.estimatedMinutes || r.totalSeconds === 0) continue;
    const actualMinutes = r.totalSeconds / 60;
    const diff = r.estimatedMinutes - actualMinutes;
    if (diff > 0) savedMinutes += diff;
    else lostMinutes += -diff;
  }

  const [profile] = await db.select().from(productivityProfilesTable).where(eq(productivityProfilesTable.userId, userId));
  let estimatedTotalSavedMinutes: number | null = null;
  let daysSinceProfile: number | null = null;
  if (profile) {
    daysSinceProfile = Math.max(1, Math.floor((Date.now() - new Date(profile.completedAt).getTime()) / 86400000));
    estimatedTotalSavedMinutes = Math.round(profile.estimatedTimeLostMinutes * daysSinceProfile);
  }

  res.json({
    byTask,
    savedMinutes: Math.round(savedMinutes),
    lostMinutes: Math.round(lostMinutes),
    estimatedTotalSavedMinutes,
    daysSinceProfile,
  });
});

export default router;
