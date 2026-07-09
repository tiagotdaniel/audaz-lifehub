import { Router } from "express";
import { db, userStreaksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const [streak] = await db.select().from(userStreaksTable).where(eq(userStreaksTable.userId, userId));
  if (!streak) { res.json({ streakDays: 0, lastActiveDate: null }); return; }
  res.json(streak);
});

router.post("/ping", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const today = new Date().toISOString().split("T")[0]!;
  const [streak] = await db.select().from(userStreaksTable).where(eq(userStreaksTable.userId, userId));
  if (!streak) {
    await db.insert(userStreaksTable).values({ userId, streakDays: 1, lastActiveDate: today });
    res.json({ streakDays: 1, lastActiveDate: today });
    return;
  }
  if (streak.lastActiveDate === today) { res.json(streak); return; }
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]!;
  const newStreak = streak.lastActiveDate === yesterday ? streak.streakDays + 1 : 1;
  await db.update(userStreaksTable).set({ streakDays: newStreak, lastActiveDate: today, updatedAt: new Date() }).where(eq(userStreaksTable.userId, userId));
  res.json({ streakDays: newStreak, lastActiveDate: today });
});

export default router;
