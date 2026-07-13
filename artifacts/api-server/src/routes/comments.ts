import { Router } from "express";
import { db, taskCommentsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { randomUUID } from "crypto";

const router = Router();

router.get("/tasks/:taskId", requireAuth, async (req, res) => {
  const { taskId } = req.params as Record<string, string>;
  const userId = req.userId!;
  const comments = await db
    .select({ comment: taskCommentsTable, user: usersTable })
    .from(taskCommentsTable)
    .leftJoin(usersTable, eq(taskCommentsTable.userId, usersTable.id))
    .where(eq(taskCommentsTable.taskId, taskId));
  res.json(comments.map(({ comment, user }) => ({ ...comment, author: user ? { name: user.name, avatarUrl: user.avatarUrl } : null })));
});

router.post("/tasks/:taskId", requireAuth, async (req, res) => {
  const { taskId } = req.params as Record<string, string>;
  const userId = req.userId!;
  const { content, parentId, mentionedUserIds, attachments } = req.body;
  if (!content?.trim()) { res.status(400).json({ error: "Content required" }); return; }
  const id = randomUUID();
  const [comment] = await db.insert(taskCommentsTable).values({
    id, taskId, userId, content,
    parentId: parentId ?? null,
    mentionedUserIds: mentionedUserIds ?? [],
    attachments: attachments ?? [],
  }).returning();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  res.status(201).json({ ...comment, author: user ? { name: user.name, avatarUrl: user.avatarUrl } : null });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params as Record<string, string>;
  const userId = req.userId!;
  await db.delete(taskCommentsTable).where(and(eq(taskCommentsTable.id, id), eq(taskCommentsTable.userId, userId)));
  res.json({ success: true });
});

export default router;
