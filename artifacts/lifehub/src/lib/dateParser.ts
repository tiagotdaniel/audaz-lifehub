import * as chrono from "chrono-node";

export function parsePortugueseDate(text: string): Date | null {
  if (!text || text.trim() === "") return null;

  const normalizedText = text.toLowerCase();

  if (normalizedText.includes("hoje")) {
    return new Date();
  }
  if (normalizedText.includes("amanhã") || normalizedText.includes("amanha")) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }

  try {
    const results = chrono.pt.parseDate(normalizedText, new Date(), { forwardDate: true });
    return results;
  } catch {
    return null;
  }
}

const DATE_PATTERNS = [
  /\b(hoje|amanhã|amanha)\b/i,
  /\b(segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)\b/i,
  /\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/,
  /\b\d{1,2}\s+(de\s+)?(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/i,
  /\b(próxim|proxim)/i,
  /\b\d{1,2}h\d{0,2}\b/i,
  /\b(manha|tarde|noite)\b/i,
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
