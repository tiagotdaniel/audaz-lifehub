import { Router } from "express";
import { db, productivityProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const [profile] = await db.select().from(productivityProfilesTable).where(eq(productivityProfilesTable.userId, userId));
  res.json(profile ?? null);
});

router.put("/", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { dailyWorkHours, tasksPerDayEstimate, estimatedTimeLostMinutes, productivityRating } = req.body;
  if (
    typeof dailyWorkHours !== "number" ||
    typeof tasksPerDayEstimate !== "number" ||
    typeof estimatedTimeLostMinutes !== "number" ||
    typeof productivityRating !== "number"
  ) {
    res.status(400).json({ error: "Campos obrigatórios ausentes ou inválidos." });
    return;
  }
  const [existing] = await db.select().from(productivityProfilesTable).where(eq(productivityProfilesTable.userId, userId));
  if (existing) {
    await db
      .update(productivityProfilesTable)
      .set({ dailyWorkHours, tasksPerDayEstimate, estimatedTimeLostMinutes, productivityRating, completedAt: new Date() })
      .where(eq(productivityProfilesTable.userId, userId));
  } else {
    await db.insert(productivityProfilesTable).values({
      userId, dailyWorkHours, tasksPerDayEstimate, estimatedTimeLostMinutes, productivityRating,
    });
  }
  const [profile] = await db.select().from(productivityProfilesTable).where(eq(productivityProfilesTable.userId, userId));
  res.json(profile);
});

export default router;
