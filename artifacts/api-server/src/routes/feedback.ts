import { Router } from "express";
import { db, feedbackTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { randomUUID } from "crypto";
import { appendFeedbackRow } from "../lib/googleSheets";

const router = Router();

router.post("/", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const dbUser = req.dbUser!;
  const { type, message, attachments } = req.body;
  if (!message?.trim()) { res.status(400).json({ error: "Message required" }); return; }
  const id = randomUUID();
  const [entry] = await db
    .insert(feedbackTable)
    .values({ id, userId, type: type ?? "bug", message, email: dbUser.email, attachments: attachments ?? [] })
    .returning();
  res.status(201).json(entry);

  appendFeedbackRow({
    type: entry.type,
    userName: dbUser.name,
    userEmail: dbUser.email,
    message: entry.message,
    attachments: attachments ?? [],
    createdAt: entry.createdAt,
  });
});

export default router;
