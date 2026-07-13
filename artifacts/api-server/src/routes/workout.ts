import { Router } from "express";
import { db, workoutDaysTable, userShapeProfilesTable, dailyFitnessLogsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { randomUUID } from "crypto";

const router = Router();

// Small kcal-per-serving reference table for the quick calculator.
// Values are common approximations (kcal per 100g unless noted) and are
// meant for casual tracking, not clinical accuracy.
const FOODS = [
  { name: "Arroz branco cozido (100g)", kcal: 130, carbsG: 28, proteinG: 2.7, fatG: 0.3, sugarG: 0.1 },
  { name: "Feijão cozido (100g)", kcal: 76, carbsG: 14, proteinG: 4.8, fatG: 0.5, sugarG: 0.3 },
  { name: "Peito de frango grelhado (100g)", kcal: 165, carbsG: 0, proteinG: 31, fatG: 3.6, sugarG: 0 },
  { name: "Ovo cozido (1 unidade)", kcal: 78, carbsG: 0.6, proteinG: 6.3, fatG: 5.3, sugarG: 0.6 },
  { name: "Pão francês (1 unidade, 50g)", kcal: 150, carbsG: 28, proteinG: 4, fatG: 1.5, sugarG: 2 },
  { name: "Banana (1 unidade)", kcal: 89, carbsG: 23, proteinG: 1.1, fatG: 0.3, sugarG: 12 },
  { name: "Maçã (1 unidade)", kcal: 52, carbsG: 14, proteinG: 0.3, fatG: 0.2, sugarG: 10 },
  { name: "Batata doce cozida (100g)", kcal: 86, carbsG: 20, proteinG: 1.6, fatG: 0.1, sugarG: 4 },
  { name: "Leite integral (200ml)", kcal: 122, carbsG: 9.6, proteinG: 6.4, fatG: 6.6, sugarG: 9.6 },
  { name: "Iogurte natural (1 pote, 170g)", kcal: 100, carbsG: 7, proteinG: 6, fatG: 5, sugarG: 7 },
  { name: "Azeite de oliva (1 colher de sopa)", kcal: 119, carbsG: 0, proteinG: 0, fatG: 13.5, sugarG: 0 },
  { name: "Aveia em flocos (30g)", kcal: 117, carbsG: 20, proteinG: 4.2, fatG: 2.3, sugarG: 0.3 },
  { name: "Salmão grelhado (100g)", kcal: 208, carbsG: 0, proteinG: 20, fatG: 13, sugarG: 0 },
  { name: "Whey protein (1 scoop, 30g)", kcal: 120, carbsG: 3, proteinG: 24, fatG: 1.5, sugarG: 2 },
  { name: "Refrigerante (1 lata, 350ml)", kcal: 140, carbsG: 39, proteinG: 0, fatG: 0, sugarG: 39 },
];

router.get("/foods", requireAuth, async (_req, res) => {
  res.json(FOODS);
});

router.get("/days", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const days = await db.select().from(workoutDaysTable).where(eq(workoutDaysTable.userId, userId));
  res.json(days);
});

router.put("/days/:dayOfWeek", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const dayOfWeek = parseInt(req.params.dayOfWeek as string);
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
  const { age, heightCm, weightKg, goalWeightKg, goalDate } = req.body;
  const existing = await db.select().from(userShapeProfilesTable).where(eq(userShapeProfilesTable.userId, userId));
  const values = { age, heightCm, weightKg, goalWeightKg: goalWeightKg ?? null, goalDate: goalDate ?? null };
  if (existing.length > 0) {
    await db.update(userShapeProfilesTable).set({ ...values, updatedAt: new Date() }).where(eq(userShapeProfilesTable.userId, userId));
  } else {
    await db.insert(userShapeProfilesTable).values({ userId, ...values });
  }
  const [profile] = await db.select().from(userShapeProfilesTable).where(eq(userShapeProfilesTable.userId, userId));
  res.json(profile);
});

router.get("/fitness-log", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const logs = await db.select().from(dailyFitnessLogsTable).where(eq(dailyFitnessLogsTable.userId, userId));
  res.json(logs);
});

router.put("/fitness-log/:date", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { date } = req.params as Record<string, string>;
  const { trainedMinutes, kcal, carbsG, proteinG, fatG, sugarG, waterMl } = req.body;
  const existing = await db.select().from(dailyFitnessLogsTable).where(and(eq(dailyFitnessLogsTable.userId, userId), eq(dailyFitnessLogsTable.date, date)));
  const values = {
    trainedMinutes: trainedMinutes ?? 0,
    kcal: kcal ?? 0,
    carbsG: carbsG ?? 0,
    proteinG: proteinG ?? 0,
    fatG: fatG ?? 0,
    sugarG: sugarG ?? 0,
    waterMl: waterMl ?? 0,
  };
  if (existing.length > 0) {
    await db.update(dailyFitnessLogsTable).set({ ...values, updatedAt: new Date() }).where(and(eq(dailyFitnessLogsTable.userId, userId), eq(dailyFitnessLogsTable.date, date)));
  } else {
    await db.insert(dailyFitnessLogsTable).values({ id: randomUUID(), userId, date, ...values });
  }
  const [log] = await db.select().from(dailyFitnessLogsTable).where(and(eq(dailyFitnessLogsTable.userId, userId), eq(dailyFitnessLogsTable.date, date)));
  res.json(log);
});

export default router;
