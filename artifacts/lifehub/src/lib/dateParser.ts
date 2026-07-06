import * as chrono from "chrono-node";

export function parsePortugueseDate(text: string): Date | null {
  if (!text || text.trim() === "") return null;

  const normalizedText = text.toLowerCase();

  if (normalizedText.includes("hoje")) {
    const d = new Date();
    const time = parseTimeExpression(normalizedText);
    if (time) {
      d.setHours(time.hours, time.minutes, 0, 0);
    }
    return d;
  }
  if (normalizedText.includes("amanhã") || normalizedText.includes("amanha")) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const time = parseTimeExpression(normalizedText);
    if (time) {
      d.setHours(time.hours, time.minutes, 0, 0);
    }
    return d;
  }

  try {
    const results = chrono.pt.parseDate(normalizedText, new Date(), { forwardDate: true });
    return results;
  } catch {
    return null;
  }
}

export function parseTimeExpression(text: string): { hours: number; minutes: number } | null {
  const lower = text.toLowerCase();

  const patterns = [
    /\b(\d{1,2})h(\d{2})?\b/i,
    /\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i,
    /\b(\d{1,2})\s*(am|pm)\b/i,
  ];

  for (const pattern of patterns) {
    const m = lower.match(pattern);
    if (m) {
      let hours = parseInt(m[1]);
      const minutes = m[2] && !["am","pm"].includes(m[2].toLowerCase()) ? parseInt(m[2]) : 0;
      const ampm = m[3] || m[2];
      if (ampm) {
        if (ampm.toLowerCase() === "pm" && hours < 12) hours += 12;
        if (ampm.toLowerCase() === "am" && hours === 12) hours = 0;
      }
      if (hours >= 0 && hours < 24) {
        return { hours, minutes };
      }
    }
  }
  return null;
}

export function extractPriority(text: string): { priority: number; cleaned: string } | null {
  const match = text.match(/\b(p[1-4])\b/i);
  if (!match) return null;
  const priority = parseInt(match[1].slice(1));
  const cleaned = text.replace(/\b(p[1-4])\b/gi, "").replace(/\s+/g, " ").trim();
  return { priority, cleaned };
}

const DATE_PATTERNS = [
  /\b(hoje|amanhã|amanha)\b/i,
  /\b(segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)(-feira)?\b/i,
  /\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/,
  /\b\d{1,2}\s+(de\s+)?(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/i,
  /\b(próxim[ao]|proxim[ao])\s+\w+/i,
  /\b\d{1,2}h\d{0,2}\b/i,
  /\b\d{1,2}:\d{2}(\s*(am|pm))?\b/i,
  /\b\d{1,2}\s*(am|pm)\b/i,
  /\b(manha|tarde|noite)\b/i,
  /\bàs\s+\d/i,
];

export function extractTitle(text: string, parsedDate: Date | null): string {
  if (!parsedDate) return text;

  let cleaned = text;
  for (const pattern of DATE_PATTERNS) {
    cleaned = cleaned.replace(pattern, "");
  }
  cleaned = cleaned
    .replace(/\s+/g, " ")
    .replace(/^\s*[-,]\s*|\s*[-,]\s*$/g, "")
    .trim();

  return cleaned || text;
}
