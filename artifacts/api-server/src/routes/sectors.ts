import { Router } from "express";
import { db, sectorsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { randomUUID } from "crypto";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const sectors = await db
    .select()
    .from(sectorsTable)
    .where(eq(sectorsTable.userId, req.userId!));
  res.json(sectors);
});

router.post("/", requireAuth, async (req, res) => {
  const { label, color } = req.body;
  const id = randomUUID();
  await db.insert(sectorsTable).values({ id, userId: req.userId!, label, color: color ?? "#6B7280" });
  const [sector] = await db.select().from(sectorsTable).where(eq(sectorsTable.id, id));
  res.status(201).json(sector);
});

router.patch("/:id", requireAuth, async (req, res) => {
  const { id } = req.params as Record<string, string>;
  const { label, color } = req.body;
  const updates: Partial<typeof sectorsTable.$inferInsert> = {};
  if (label !== undefined) updates.label = label;
  if (color !== undefined) updates.color = color;

  await db.update(sectorsTable).set(updates).where(and(eq(sectorsTable.id, id), eq(sectorsTable.userId, req.userId!)));
  const [sector] = await db.select().from(sectorsTable).where(eq(sectorsTable.id, id));
  if (!sector) { res.status(404).json({ error: "Not found" }); return; }
  res.json(sector);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params as Record<string, string>;
  const [sector] = await db.select().from(sectorsTable).where(and(eq(sectorsTable.id, id), eq(sectorsTable.userId, req.userId!)));
  if (!sector) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(sectorsTable).where(eq(sectorsTable.id, id));
  res.json(sector);
});

export default router;
