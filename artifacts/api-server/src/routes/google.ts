import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import {
  isGoogleConfigured,
  getAuthUrl,
  verifyState,
  exchangeCodeForTokens,
  saveTokens,
  isGoogleConnected,
  getValidAccessToken,
  disconnectGoogle,
} from "../lib/googleOAuth";
import { listUpcomingEvents } from "../lib/googleCalendar";
import { logger } from "../lib/logger";

const router = Router();
const APP_URL = process.env.APP_URL ?? "https://audaz-lifehub.vercel.app";

router.get("/auth-url", requireAuth, async (req, res) => {
  if (!isGoogleConfigured()) { res.status(503).json({ error: "Google não configurado" }); return; }
  res.json({ url: getAuthUrl(req.userId!) });
});

router.get("/callback", async (req, res) => {
  const { code, state, error } = req.query as Record<string, string>;
  if (error) { res.redirect(`${APP_URL}/configuracoes?google=error`); return; }
  if (!code || !state) { res.redirect(`${APP_URL}/configuracoes?google=error`); return; }

  try {
    const userId = verifyState(state);
    const tokens = await exchangeCodeForTokens(code);
    await saveTokens(userId, tokens);
    res.redirect(`${APP_URL}/configuracoes?google=connected`);
  } catch (err) {
    logger.error(err, "Google OAuth callback failed");
    res.redirect(`${APP_URL}/configuracoes?google=error`);
  }
});

router.get("/status", requireAuth, async (req, res) => {
  const connected = await isGoogleConnected(req.userId!);
  res.json({ connected });
});

router.post("/disconnect", requireAuth, async (req, res) => {
  await disconnectGoogle(req.userId!);
  res.json({ success: true });
});

router.get("/calendar/events", requireAuth, async (req, res) => {
  const { timeMin, timeMax } = req.query as Record<string, string>;
  if (!timeMin || !timeMax) { res.status(400).json({ error: "timeMin and timeMax required" }); return; }
  const events = await listUpcomingEvents(req.userId!, new Date(timeMin), new Date(timeMax));
  res.json(events);
});

router.get("/drive/token", requireAuth, async (req, res) => {
  const accessToken = await getValidAccessToken(req.userId!);
  if (!accessToken) { res.status(404).json({ error: "Google não conectado" }); return; }
  res.json({ accessToken, pickerApiKey: process.env.GOOGLE_PICKER_API_KEY ?? null });
});

export default router;
