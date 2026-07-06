import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      dbUser?: typeof usersTable.$inferSelect;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, auth.userId))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!user) {
    const id = randomUUID();
    const clerkUser = await auth.sessionClaims;
    const name =
      (clerkUser?.["name"] as string) ||
      (clerkUser?.["email"] as string) ||
      "Usuário";
    const email = (clerkUser?.["email"] as string) || "";
    const avatarUrl = (clerkUser?.["picture"] as string) || null;

    await db.insert(usersTable).values({
      id,
      clerkId: auth.userId,
      name,
      email,
      avatarUrl,
    });

    user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1)
      .then((r) => r[0]);

    const { sectorsTable } = await import("@workspace/db");
    await db.insert(sectorsTable).values([
      {
        id: randomUUID(),
        userId: id,
        label: "Pessoal",
        color: "#4CAF50",
        isDefault: true,
      },
      {
        id: randomUUID(),
        userId: id,
        label: "Empresarial",
        color: "#2196F3",
        isDefault: true,
      },
      {
        id: randomUUID(),
        userId: id,
        label: "Novos Projetos",
        color: "#9C27B0",
        isDefault: true,
      },
    ]);
  }

  req.userId = user.id;
  req.dbUser = user;
  next();
}
