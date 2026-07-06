import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const user = req.dbUser!;
  res.json({
    id: user.id,
    clerkId: user.clerkId,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    whatsappNumber: user.whatsappNumber,
    timezone: user.timezone,
    notifPrefs: user.notifPrefs,
    createdAt: user.createdAt,
  });
});

router.patch("/", requireAuth, async (req, res) => {
  const { whatsappNumber, timezone, notifPrefs } = req.body;
  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (whatsappNumber !== undefined) updates.whatsappNumber = whatsappNumber;
  if (timezone !== undefined) updates.timezone = timezone;
  if (notifPrefs !== undefined) updates.notifPrefs = notifPrefs;

  await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, req.userId!));

  const user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!))
    .limit(1)
    .then((r) => r[0]);

  res.json({
    id: user.id,
    clerkId: user.clerkId,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    whatsappNumber: user.whatsappNumber,
    timezone: user.timezone,
    notifPrefs: user.notifPrefs,
    createdAt: user.createdAt,
  });
});

export default router;
