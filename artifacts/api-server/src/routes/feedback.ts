import { Router } from "express";
import { db, feedbackTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { randomUUID } from "crypto";

const router = Router();

router.post("/", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { type, message, email } = req.body;
  if (!message?.trim()) { res.status(400).json({ error: "Message required" }); return; }
  const id = randomUUID();
  const [entry] = await db.insert(feedbackTable).values({ id, userId, type: type ?? "bug", message, email }).returning();
  res.status(201).json(entry);
});

export default router;
