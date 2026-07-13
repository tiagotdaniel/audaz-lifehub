import { Router } from "express";
import { db, workspaceMembersTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { randomUUID } from "crypto";

const router = Router();

const VALID_ROLES = new Set(["guest", "member", "admin"]);

router.get("/", requireAuth, async (req, res) => {
  const ownerId = req.userId!;
  const members = await db.select().from(workspaceMembersTable).where(eq(workspaceMembersTable.ownerId, ownerId));
  res.json(members);
});

router.post("/", requireAuth, async (req, res) => {
  const ownerId = req.userId!;
  const { email, role } = req.body;
  if (!email?.trim()) { res.status(400).json({ error: "E-mail é obrigatório" }); return; }
  if (role && !VALID_ROLES.has(role)) { res.status(400).json({ error: "Papel inválido" }); return; }

  const [invitedUser] = await db.select().from(usersTable).where(eq(usersTable.email, email.trim()));

  const id = randomUUID();
  const [member] = await db.insert(workspaceMembersTable).values({
    id,
    ownerId,
    email: email.trim(),
    role: role ?? "member",
    status: invitedUser ? "active" : "pending",
    invitedUserId: invitedUser?.id ?? null,
  }).returning();
  res.status(201).json(member);
});

router.patch("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const ownerId = req.userId!;
  const { role } = req.body;
  if (role && !VALID_ROLES.has(role)) { res.status(400).json({ error: "Papel inválido" }); return; }
  await db.update(workspaceMembersTable).set({ ...(role && { role }) }).where(and(eq(workspaceMembersTable.id, id), eq(workspaceMembersTable.ownerId, ownerId)));
  const [member] = await db.select().from(workspaceMembersTable).where(eq(workspaceMembersTable.id, id));
  res.json(member);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const ownerId = req.userId!;
  await db.delete(workspaceMembersTable).where(and(eq(workspaceMembersTable.id, id), eq(workspaceMembersTable.ownerId, ownerId)));
  res.json({ success: true });
});

export default router;
