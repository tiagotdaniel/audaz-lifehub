import { Router } from "express";
import { db, workoutDaysTable, userShapeProfilesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { randomUUID } from "crypto";

const router = Router();

router.get("/days", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const days = await db.select().from(workoutDaysTable).where(eq(workoutDaysTable.userId, userId));
  res.json(days);
});

router.put("/days/:dayOfWeek", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const dayOfWeek = parseInt(req.params.dayOfWeek);
  const { exercises } = req.body;
  const existing = await db.select().from(workoutDaysTable).where(and(eq(workoutDaysTable.userId, userId), eq(workoutDaysTable.dayOfWeek, dayOfWeek)));
  if (existing.length > 0) {
    await db.update(workoutDaysTable).set({ exercises, updatedAt: new Date() }).where(and(eq(workoutDaysTable.userId, userId), eq(workoutDaysTable.dayOfWeek, dayOfWeek)));
  } else {
    await db.insert(workoutDaysTable).values({ id: randomUUID(), userId, dayOfWeek, exercises });
  }
  const [day] = await db.select().from(workoutDaysTable).where(and(eq(workoutDaysTable.userId, userId), eq(workoutDaysTable.dayOfWeek, dayOfWeek)));
  res.json(day);
});

router.get("/profile", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const [profile] = await db.select().from(userShapeProfilesTable).where(eq(userShapeProfilesTable.userId, userId));
  res.json(profile ?? null);
});

router.put("/profile", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { age, heightCm, weightKg } = req.body;
  const existing = await db.select().from(userShapeProfilesTable).where(eq(userShapeProfilesTable.userId, userId));
  if (existing.length > 0) {
    await db.update(userShapeProfilesTable).set({ age, heightCm, weightKg, updatedAt: new Date() }).where(eq(userShapeProfilesTable.userId, userId));
  } else {
    await db.insert(userShapeProfilesTable).values({ userId, age, heightCm, weightKg });
  }
  const [profile] = await db.select().from(userShapeProfilesTable).where(eq(userShapeProfilesTable.userId, userId));
  res.json(profile);
});

export default router;
