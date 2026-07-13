import { Router } from "express";
import { db, taskAttachmentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { randomUUID } from "crypto";

const router = Router();

router.get("/tasks/:taskId", requireAuth, async (req, res) => {
  const { taskId } = req.params;
  const attachments = await db
    .select()
    .from(taskAttachmentsTable)
    .where(eq(taskAttachmentsTable.taskId, taskId));
  res.json(attachments);
});

router.post("/tasks/:taskId", requireAuth, async (req, res) => {
  const { taskId } = req.params;
  const userId = req.userId!;
  const { name, url } = req.body;
  if (!name?.trim() || !url?.trim()) { res.status(400).json({ error: "name and url required" }); return; }
  const id = randomUUID();
  const [attachment] = await db.insert(taskAttachmentsTable).values({ id, taskId, userId, name, url }).returning();
  res.status(201).json(attachment);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId!;
  await db.delete(taskAttachmentsTable).where(and(eq(taskAttachmentsTable.id, id), eq(taskAttachmentsTable.userId, userId)));
  res.json({ success: true });
});

export default router;
