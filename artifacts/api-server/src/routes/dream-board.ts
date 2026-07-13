import { Router } from "express";
import { db, dreamBoardItemsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { randomUUID } from "crypto";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const items = await db.select().from(dreamBoardItemsTable).where(eq(dreamBoardItemsTable.userId, userId));
  res.json(items);
});

router.post("/", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { imageUrl, quote, position } = req.body;
  const id = randomUUID();
  const [item] = await db.insert(dreamBoardItemsTable).values({ id, userId, imageUrl, quote, position: position ?? 0 }).returning();
  res.status(201).json(item);
});

router.patch("/:id", requireAuth, async (req, res) => {
  const { id } = req.params as Record<string, string>;
  const userId = req.userId!;
  const { imageUrl, quote, position } = req.body;
  await db.update(dreamBoardItemsTable).set({ ...(imageUrl && { imageUrl }), ...(quote !== undefined && { quote }), ...(position !== undefined && { position }) }).where(and(eq(dreamBoardItemsTable.id, id), eq(dreamBoardItemsTable.userId, userId)));
  const [item] = await db.select().from(dreamBoardItemsTable).where(eq(dreamBoardItemsTable.id, id));
  res.json(item);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params as Record<string, string>;
  const userId = req.userId!;
  await db.delete(dreamBoardItemsTable).where(and(eq(dreamBoardItemsTable.id, id), eq(dreamBoardItemsTable.userId, userId)));
  res.json({ success: true });
});

export default router;
