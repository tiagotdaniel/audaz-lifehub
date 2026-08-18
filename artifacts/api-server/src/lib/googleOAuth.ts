import { createHmac, timingSafeEqual } from "crypto";
import { db, googleTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const TOKEN_URI = "https://oauth2.googleapis.com/token";
const AUTH_URI = "https://accounts.google.com/o/oauth2/v2/auth";
const REVOKE_URI = "https://oauth2.googleapis.com/revoke";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/drive.file",
].join(" ");

const STATE_TTL_MS = 10 * 60 * 1000;

export function isGoogleConfigured() {
  return !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
}

function getRedirectUri() {
  const base = process.env.APP_URL ?? "https://audaz-lifehub.vercel.app";
  return `${base}/api/google/callback`;
}

function signState(userId: string): string {
  const payload = `${userId}.${Date.now()}`;
  const sig = createHmac("sha256", process.env.GOOGLE_OAUTH_CLIENT_SECRET!).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyState(state: string): string {
  const decoded = Buffer.from(state, "base64url").toString("utf8");
  const [userId, ts, sig] = decoded.split(".");
  if (!userId || !ts || !sig) throw new Error("Malformed state");

  const expectedSig = createHmac("sha256", process.env.GOOGLE_OAUTH_CLIENT_SECRET!)
    .update(`${userId}.${ts}`)
    .digest("hex");
  const sigBuf = Buffer.from(sig, "hex");
  const expectedBuf = Buffer.from(expectedSig, "hex");
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    throw new Error("Invalid state signature");
  }
  if (Date.now() - Number(ts) > STATE_TTL_MS) throw new Error("State expired");

  return userId;
}

export function getAuthUrl(userId: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: signState(userId),
  });
  return `${AUTH_URI}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URI, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google code exchange failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<TokenResponse>;
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URI, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<TokenResponse>;
}

export async function saveTokens(userId: string, tokens: TokenResponse) {
  const expiryDate = new Date(Date.now() + tokens.expires_in * 1000);
  const existing = await db.select().from(googleTokensTable).where(eq(googleTokensTable.userId, userId)).then((r) => r[0]);

  await db
    .insert(googleTokensTable)
    .values({
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? existing?.refreshToken ?? "",
      expiryDate,
      scope: tokens.scope,
    })
    .onConflictDoUpdate({
      target: googleTokensTable.userId,
      set: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? existing?.refreshToken ?? "",
        expiryDate,
        scope: tokens.scope,
        updatedAt: new Date(),
      },
    });
}

export async function isGoogleConnected(userId: string): Promise<boolean> {
  const row = await db.select().from(googleTokensTable).where(eq(googleTokensTable.userId, userId)).then((r) => r[0]);
  return !!row;
}

export async function getValidAccessToken(userId: string): Promise<string | null> {
  const row = await db.select().from(googleTokensTable).where(eq(googleTokensTable.userId, userId)).then((r) => r[0]);
  if (!row) return null;

  if (row.expiryDate.getTime() > Date.now() + 60_000) return row.accessToken;

  const refreshed = await refreshAccessToken(row.refreshToken);
  const expiryDate = new Date(Date.now() + refreshed.expires_in * 1000);
  await db
    .update(googleTokensTable)
    .set({ accessToken: refreshed.access_token, expiryDate, updatedAt: new Date() })
    .where(eq(googleTokensTable.userId, userId));
  return refreshed.access_token;
}

export async function disconnectGoogle(userId: string) {
  const row = await db.select().from(googleTokensTable).where(eq(googleTokensTable.userId, userId)).then((r) => r[0]);
  if (row) {
    try {
      await fetch(`${REVOKE_URI}?token=${encodeURIComponent(row.refreshToken)}`, { method: "POST" });
    } catch (err) {
      logger.error(err, "Failed to revoke Google token");
    }
  }
  await db.delete(googleTokensTable).where(eq(googleTokensTable.userId, userId));
}
