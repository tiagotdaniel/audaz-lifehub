import jwt from "jsonwebtoken";
import { logger } from "./logger";

const TOKEN_URI = "https://oauth2.googleapis.com/token";
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const HEADER_ROW = ["Data/Hora", "Usuário", "E-mail", "Mensagem", "Anexos"];

export const TYPE_TO_TAB: Record<string, string> = {
  bug: "Bugs",
  feedback: "Feedback",
  praise: "Elogios",
  feature: "Sugestão de função",
};

function isConfigured() {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_SHEET_ID
  );
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.token;

  const now = Math.floor(Date.now() / 1000);
  const privateKey = process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const assertion = jwt.sign(
    {
      iss: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: TOKEN_URI,
      iat: now,
      exp: now + 3600,
    },
    privateKey,
    { algorithm: "RS256" },
  );

  const res = await fetch(TOKEN_URI, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

const ensuredTabs = new Set<string>();

async function ensureTabExists(token: string, spreadsheetId: string, tabName: string) {
  if (ensuredTabs.has(tabName)) return;

  const metaRes = await fetch(`${SHEETS_API}/${spreadsheetId}?fields=sheets.properties.title`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!metaRes.ok) throw new Error(`Failed to read spreadsheet metadata: ${metaRes.status}`);
  const meta = (await metaRes.json()) as { sheets?: { properties: { title: string } }[] };
  const exists = meta.sheets?.some((s) => s.properties.title === tabName);

  if (!exists) {
    const addRes = await fetch(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tabName } } }] }),
    });
    if (!addRes.ok) throw new Error(`Failed to create tab ${tabName}: ${addRes.status} ${await addRes.text()}`);

    await fetch(`${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(tabName)}!A1:E1?valueInputOption=RAW`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [HEADER_ROW] }),
    });
  }

  ensuredTabs.add(tabName);
}

export async function appendFeedbackRow(row: {
  type: string;
  userName: string;
  userEmail: string;
  message: string;
  attachments: { name: string; url: string }[];
  createdAt: Date;
}) {
  if (!isConfigured()) return;

  const tabName = TYPE_TO_TAB[row.type] ?? "Feedback";
  const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

  try {
    const token = await getAccessToken();
    await ensureTabExists(token, spreadsheetId, tabName);

    const attachmentsCell = row.attachments.map((a) => a.name).join(", ");
    const values = [[
      row.createdAt.toLocaleString("pt-BR"),
      row.userName,
      row.userEmail,
      row.message,
      attachmentsCell,
    ]];

    const appendRes = await fetch(
      `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(tabName)}!A:E:append?valueInputOption=RAW`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      },
    );
    if (!appendRes.ok) throw new Error(`Failed to append row: ${appendRes.status} ${await appendRes.text()}`);
  } catch (err) {
    logger.error(err, "Failed to sync feedback to Google Sheets");
  }
}
