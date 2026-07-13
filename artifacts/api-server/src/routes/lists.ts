import { Router } from "express";
import { db, listsTable, listItemsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { randomUUID } from "crypto";

const router = Router();

function nextResetDate(from: Date, schedule: string): Date | null {
  const next = new Date(from);
  switch (schedule) {
    case "daily": next.setDate(next.getDate() + 1); break;
    case "weekly": next.setDate(next.getDate() + 7); break;
    case "monthly": next.setMonth(next.getMonth() + 1); break;
    case "quarterly": next.setMonth(next.getMonth() + 3); break;
    case "semiannual": next.setMonth(next.getMonth() + 6); break;
    case "annual": next.setFullYear(next.getFullYear() + 1); break;
    default: return null;
  }
  return next;
}

router.get("/", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const lists = await db.select().from(listsTable).where(eq(listsTable.userId, userId));
  const now = new Date();

  for (const list of lists) {
    const due = nextResetDate(new Date(list.lastResetAt ?? list.createdAt), list.resetSchedule);
    if (due && now >= due) {
      await db.update(listItemsTable).set({ checked: false, checkedAt: null }).where(and(eq(listItemsTable.listId, list.id), eq(listItemsTable.userId, userId)));
      await db.update(listsTable).set({ lastResetAt: now }).where(eq(listsTable.id, list.id));
      list.lastResetAt = now;
    }
  }

  const items = await db.select().from(listItemsTable).where(eq(listItemsTable.userId, userId));
  res.json(lists.map(list => ({ ...list, items: items.filter(i => i.listId === list.id) })));
});

router.post("/", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { name, description, color, resetSchedule } = req.body;
  const id = randomUUID();
  const [list] = await db.insert(listsTable).values({ id, userId, name, description, color: color ?? "#C9A84C", resetSchedule: resetSchedule ?? "none" }).returning();
  res.status(201).json({ ...list, items: [] });
});

router.patch("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId!;
  const updates: Record<string, unknown> = {};
  const fields = ["name", "description", "color", "resetSchedule"] as const;
  for (const f of fields) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }
  if (req.body.deadline !== undefined) updates.deadline = req.body.deadline ? new Date(req.body.deadline) : null;
  await db.update(listsTable).set(updates).where(and(eq(listsTable.id, id), eq(listsTable.userId, userId)));
  const [list] = await db.select().from(listsTable).where(eq(listsTable.id, id));
  const items = await db.select().from(listItemsTable).where(eq(listItemsTable.listId, id));
  res.json({ ...list, items });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId!;
  await db.delete(listsTable).where(and(eq(listsTable.id, id), eq(listsTable.userId, userId)));
  res.json({ success: true });
});

router.post("/:listId/items", requireAuth, async (req, res) => {
  const { listId } = req.params;
  const userId = req.userId!;
  const { title, description, price, position } = req.body;
  const id = randomUUID();
  const [item] = await db.insert(listItemsTable).values({ id, listId, userId, title, description, price, position: position ?? 0 }).returning();
  res.status(201).json(item);
});

router.patch("/:listId/items/:itemId", requireAuth, async (req, res) => {
  const { listId, itemId } = req.params;
  const userId = req.userId!;
  const updates = req.body;
  if (updates.checked !== undefined) updates.checkedAt = updates.checked ? new Date() : null;
  await db.update(listItemsTable).set(updates).where(and(eq(listItemsTable.id, itemId), eq(listItemsTable.listId, listId), eq(listItemsTable.userId, userId)));
  const [item] = await db.select().from(listItemsTable).where(eq(listItemsTable.id, itemId));
  res.json(item);
});

router.delete("/:listId/items/:itemId", requireAuth, async (req, res) => {
  const { listId, itemId } = req.params;
  const userId = req.userId!;
  await db.delete(listItemsTable).where(and(eq(listItemsTable.id, itemId), eq(listItemsTable.listId, listId), eq(listItemsTable.userId, userId)));
  res.json({ success: true });
});

router.post("/:listId/reset", requireAuth, async (req, res) => {
  const { listId } = req.params;
  const userId = req.userId!;
  await db.update(listItemsTable).set({ checked: false, checkedAt: null }).where(and(eq(listItemsTable.listId, listId), eq(listItemsTable.userId, userId)));
  await db.update(listsTable).set({ lastResetAt: new Date() }).where(and(eq(listsTable.id, listId), eq(listsTable.userId, userId)));
  res.json({ success: true });
});

export default router;
