import { Router } from "express";
import { db, projectsTable, tasksTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { randomUUID } from "crypto";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const projects = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.userId, req.userId!));

  const withCounts = await Promise.all(
    projects.map(async (p) => {
      const [counts] = await db
        .select({
          taskCount: sql<number>`COUNT(*)`,
          doneCount: sql<number>`SUM(CASE WHEN ${tasksTable.status} = 'done' THEN 1 ELSE 0 END)`,
        })
        .from(tasksTable)
        .where(and(eq(tasksTable.projectId, p.id), eq(tasksTable.userId, req.userId!)));
      return {
        ...p,
        taskCount: counts?.taskCount ?? 0,
        doneCount: counts?.doneCount ?? 0,
      };
    })
  );

  res.json(withCounts);
});

router.post("/", requireAuth, async (req, res) => {
  const { name, description, color, deadline } = req.body;
  const id = randomUUID();
  await db.insert(projectsTable).values({
    id,
    userId: req.userId!,
    name,
    description: description ?? null,
    color: color ?? "#C9A84C",
    deadline: deadline ? new Date(deadline) : null,
  });
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  res.status(201).json({ ...project, taskCount: 0, doneCount: 0 });
});

router.patch("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const updates: Partial<typeof projectsTable.$inferInsert> = {};
  const fields = ["name", "description", "color", "status"] as const;
  for (const f of fields) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }
  if (req.body.deadline !== undefined) updates.deadline = req.body.deadline ? new Date(req.body.deadline) : null;

  await db.update(projectsTable).set(updates).where(and(eq(projectsTable.id, id), eq(projectsTable.userId, req.userId!)));
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...project, taskCount: 0, doneCount: 0 });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const [project] = await db.select().from(projectsTable).where(and(eq(projectsTable.id, id), eq(projectsTable.userId, req.userId!)));
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(projectsTable).where(eq(projectsTable.id, id));
  res.json({ ...project, taskCount: 0, doneCount: 0 });
});

export default router;
