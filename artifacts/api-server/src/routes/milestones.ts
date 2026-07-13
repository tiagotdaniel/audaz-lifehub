import { Router } from "express";
import { db, milestonesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { randomUUID } from "crypto";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const milestones = await db
    .select()
    .from(milestonesTable)
    .where(eq(milestonesTable.userId, req.userId!));
  res.json(milestones);
});

router.post("/", requireAuth, async (req, res) => {
  const { title, dueDate, projectId } = req.body;
  const id = randomUUID();
  await db.insert(milestonesTable).values({
    id,
    userId: req.userId!,
    title,
    dueDate: dueDate ? new Date(dueDate) : null,
    projectId: projectId ?? null,
  });
  const [milestone] = await db.select().from(milestonesTable).where(eq(milestonesTable.id, id));
  res.status(201).json(milestone);
});

router.patch("/:id", requireAuth, async (req, res) => {
  const { id } = req.params as Record<string, string>;
  const updates: Partial<typeof milestonesTable.$inferInsert> = {};
  if (req.body.title !== undefined) updates.title = req.body.title;
  if (req.body.done !== undefined) updates.done = req.body.done;
  if (req.body.projectId !== undefined) updates.projectId = req.body.projectId ?? null;
  if (req.body.dueDate !== undefined) updates.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;

  await db.update(milestonesTable).set(updates).where(and(eq(milestonesTable.id, id), eq(milestonesTable.userId, req.userId!)));
  const [milestone] = await db.select().from(milestonesTable).where(eq(milestonesTable.id, id));
  if (!milestone) { res.status(404).json({ error: "Not found" }); return; }
  res.json(milestone);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params as Record<string, string>;
  const [milestone] = await db.select().from(milestonesTable).where(and(eq(milestonesTable.id, id), eq(milestonesTable.userId, req.userId!)));
  if (!milestone) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(milestonesTable).where(eq(milestonesTable.id, id));
  res.json(milestone);
});

export default router;
