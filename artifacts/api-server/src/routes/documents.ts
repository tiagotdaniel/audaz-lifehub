import { Router } from "express";
import { db, documentsTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { randomUUID } from "crypto";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const docs = await db.select().from(documentsTable).where(eq(documentsTable.userId, userId));
  res.json(docs);
});

router.post("/", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { title, content, parentId, icon } = req.body;
  const id = randomUUID();
  const [doc] = await db.insert(documentsTable).values({ id, userId, title: title ?? "Sem título", content: content ?? "", parentId: parentId ?? null, icon }).returning();
  res.status(201).json(doc);
});

router.get("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId!;
  const [doc] = await db.select().from(documentsTable).where(and(eq(documentsTable.id, id), eq(documentsTable.userId, userId)));
  if (!doc) { res.status(404).json({ error: "Not found" }); return; }
  res.json(doc);
});

router.patch("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId!;
  const { title, content, icon, parentId } = req.body;
  await db.update(documentsTable).set({
    ...(title !== undefined && { title }),
    ...(content !== undefined && { content }),
    ...(icon !== undefined && { icon }),
    ...(parentId !== undefined && { parentId }),
    updatedAt: new Date(),
  }).where(and(eq(documentsTable.id, id), eq(documentsTable.userId, userId)));
  const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
  res.json(doc);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId!;
  await db.delete(documentsTable).where(and(eq(documentsTable.id, id), eq(documentsTable.userId, userId)));
  res.json({ success: true });
});

export default router;
