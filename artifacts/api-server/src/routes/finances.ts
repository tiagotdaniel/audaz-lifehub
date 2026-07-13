import { Router } from "express";
import { db, financialEntriesTable, financialAccountsTable, financialGoalsTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { randomUUID } from "crypto";

const router = Router();

// Caixas e investimentos (registered before "/:id" to avoid path collision)
router.get("/accounts", requireAuth, async (req, res) => {
  const accounts = await db.select().from(financialAccountsTable).where(eq(financialAccountsTable.userId, req.userId!));
  res.json(accounts);
});

router.post("/accounts", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { name, type, balance } = req.body;
  const id = randomUUID();
  const [account] = await db.insert(financialAccountsTable).values({ id, userId, name, type: type ?? "caixa", balance: balance ?? 0 }).returning();
  res.status(201).json(account);
});

router.patch("/accounts/:id", requireAuth, async (req, res) => {
  const { id } = req.params as Record<string, string>;
  const userId = req.userId!;
  const { name, type, balance } = req.body;
  await db.update(financialAccountsTable).set({
    ...(name !== undefined && { name }),
    ...(type !== undefined && { type }),
    ...(balance !== undefined && { balance }),
  }).where(and(eq(financialAccountsTable.id, id), eq(financialAccountsTable.userId, userId)));
  const [account] = await db.select().from(financialAccountsTable).where(eq(financialAccountsTable.id, id));
  res.json(account);
});

router.delete("/accounts/:id", requireAuth, async (req, res) => {
  const { id } = req.params as Record<string, string>;
  const userId = req.userId!;
  await db.delete(financialAccountsTable).where(and(eq(financialAccountsTable.id, id), eq(financialAccountsTable.userId, userId)));
  res.json({ success: true });
});

// Metas financeiras (registered before "/:id" to avoid path collision)
router.get("/goals", requireAuth, async (req, res) => {
  const goals = await db.select().from(financialGoalsTable).where(eq(financialGoalsTable.userId, req.userId!));
  res.json(goals);
});

router.post("/goals", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { name, targetAmount, currentAmount, deadline } = req.body;
  const id = randomUUID();
  const [goal] = await db.insert(financialGoalsTable).values({
    id, userId, name, targetAmount, currentAmount: currentAmount ?? 0,
    deadline: deadline ? new Date(deadline) : null,
  }).returning();
  res.status(201).json(goal);
});

router.patch("/goals/:id", requireAuth, async (req, res) => {
  const { id } = req.params as Record<string, string>;
  const userId = req.userId!;
  const { name, targetAmount, currentAmount, deadline } = req.body;
  await db.update(financialGoalsTable).set({
    ...(name !== undefined && { name }),
    ...(targetAmount !== undefined && { targetAmount }),
    ...(currentAmount !== undefined && { currentAmount }),
    ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
  }).where(and(eq(financialGoalsTable.id, id), eq(financialGoalsTable.userId, userId)));
  const [goal] = await db.select().from(financialGoalsTable).where(eq(financialGoalsTable.id, id));
  res.json(goal);
});

router.delete("/goals/:id", requireAuth, async (req, res) => {
  const { id } = req.params as Record<string, string>;
  const userId = req.userId!;
  await db.delete(financialGoalsTable).where(and(eq(financialGoalsTable.id, id), eq(financialGoalsTable.userId, userId)));
  res.json({ success: true });
});

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
  const { id } = req.params as Record<string, string>;
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
  const { id } = req.params as Record<string, string>;
  const userId = req.userId!;
  await db.delete(financialEntriesTable).where(and(eq(financialEntriesTable.id, id), eq(financialEntriesTable.userId, userId)));
  res.json({ success: true });
});

export default router;
