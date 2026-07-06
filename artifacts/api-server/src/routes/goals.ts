import { Router } from "express";
import { db, goalsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { randomUUID } from "crypto";

const router = Router();

function enrichGoal(goal: typeof goalsTable.$inferSelect) {
  const progressPercent =
    goal.targetValue > 0
      ? Math.min(100, (goal.currentValue / goal.targetValue) * 100)
      : 0;

  const isAtRisk =
    goal.status === "active" &&
    goal.deadline !== null &&
    (() => {
      const daysLeft = (new Date(goal.deadline!).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysLeft <= 7 && progressPercent < 30;
    })();

  return { ...goal, progressPercent, isAtRisk };
}

router.get("/", requireAuth, async (req, res) => {
  const goals = await db
    .select()
    .from(goalsTable)
    .where(eq(goalsTable.userId, req.userId!));
  res.json(goals.map(enrichGoal));
});

router.post("/", requireAuth, async (req, res) => {
  const { title, type, targetValue, currentValue, deadline } = req.body;
  const id = randomUUID();
  await db.insert(goalsTable).values({
    id,
    userId: req.userId!,
    title,
    type: type ?? "numeric",
    targetValue: targetValue ?? 100,
    currentValue: currentValue ?? 0,
    deadline: deadline ? new Date(deadline) : null,
  });
  const [goal] = await db.select().from(goalsTable).where(eq(goalsTable.id, id));
  res.status(201).json(enrichGoal(goal));
});

router.patch("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const updates: Partial<typeof goalsTable.$inferInsert> = {};
  const fields = ["title", "type", "targetValue", "currentValue", "status"] as const;
  for (const f of fields) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }
  if (req.body.deadline !== undefined) updates.deadline = req.body.deadline ? new Date(req.body.deadline) : null;

  await db.update(goalsTable).set(updates).where(and(eq(goalsTable.id, id), eq(goalsTable.userId, req.userId!)));
  const [goal] = await db.select().from(goalsTable).where(eq(goalsTable.id, id));
  if (!goal) { res.status(404).json({ error: "Not found" }); return; }
  res.json(enrichGoal(goal));
});

router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const [goal] = await db.select().from(goalsTable).where(and(eq(goalsTable.id, id), eq(goalsTable.userId, req.userId!)));
  if (!goal) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(goalsTable).where(eq(goalsTable.id, id));
  res.json(enrichGoal(goal));
});

export default router;
