import { Router } from "express";
import { db, financialEntriesTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { randomUUID } from "crypto";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { from, to } = req.query as Record<string, string>;
  const conditions = [eq(financialEntriesTable.userId, userId)];
  if (from) conditions.push(gte(financialEntriesTable.date, new Date(from)));
  if (to) conditions.push(lte(financialEntriesTable.date, new Date(to)));
  const entries = await db.select().from(financialEntriesTable).where(and(...conditions));
  res.json(entries);
});

router.get("/summary", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const result = await db.select({
    type: financialEntriesTable.type,
    total: sql<number>`COALESCE(SUM(${financialEntriesTable.amount}), 0)`,
  }).from(financialEntriesTable).where(eq(financialEntriesTable.userId, userId)).groupBy(financialEntriesTable.type);
  const income = result.find(r => r.type === "income")?.total ?? 0;
  const expense = result.find(r => r.type === "expense")?.total ?? 0;
  res.json({ income, expense, balance: income - expense });
});

router.post("/", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { type, amount, description, category, date } = req.body;
  const id = randomUUID();
  const [entry] = await db.insert(financialEntriesTable).values({
    id, userId, type: type ?? "expense", amount, description, category: category ?? "outros",
    date: date ? new Date(date) : new Date(),
  }).returning();
  res.status(201).json(entry);
});

router.patch("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId!;
  const { type, amount, description, category, date } = req.body;
  await db.update(financialEntriesTable).set({
    ...(type && { type }),
    ...(amount !== undefined && { amount }),
    ...(description && { description }),
    ...(category && { category }),
    ...(date && { date: new Date(date) }),
  }).where(and(eq(financialEntriesTable.id, id), eq(financialEntriesTable.userId, userId)));
  const [entry] = await db.select().from(financialEntriesTable).where(eq(financialEntriesTable.id, id));
  res.json(entry);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId!;
  await db.delete(financialEntriesTable).where(and(eq(financialEntriesTable.id, id), eq(financialEntriesTable.userId, userId)));
  res.json({ success: true });
});

export default router;
