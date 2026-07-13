import { Request, Response, NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";
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

    // Session claims are minimal by default (no email/name), so fetch the
    // real profile from Clerk's API instead. Email is guaranteed non-empty
    // here (falling back to a clerkId-derived placeholder) because the
    // column is unique — an empty string would collide across every user
    // whose Clerk profile has no email on file.
    const clerkUser = await clerkClient.users.getUser(auth.userId);
    const primaryEmail =
      clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress ??
      null;
    const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim();
    const name = fullName || primaryEmail || "Usuário";
    const email = primaryEmail || `${auth.userId}@no-email.audazlifehub.local`;
    const avatarUrl = clerkUser.imageUrl || null;

    // Serverless invocations can race here: several concurrent requests from
    // the same brand-new user may all see "no user yet" at once. Only the
    // request that actually wins the insert (empty result = lost the race,
    // someone else already created it) creates the default sectors.
    const [inserted] = await db
      .insert(usersTable)
      .values({ id, clerkId: auth.userId, name, email, avatarUrl })
      .onConflictDoNothing({ target: usersTable.clerkId })
      .returning();

    if (inserted) {
      user = inserted;

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
    } else {
      user = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.clerkId, auth.userId))
        .limit(1)
        .then((r) => r[0]);
    }
  }

  req.userId = user.id;
  req.dbUser = user;
  next();
}
