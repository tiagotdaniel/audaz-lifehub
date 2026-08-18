import { getValidAccessToken } from "./googleOAuth";
import { logger } from "./logger";

const EVENTS_API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const DEFAULT_DURATION_MINUTES = 30;

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  htmlLink: string | null;
}

interface TaskForSync {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  googleEventId: string | null;
}

export async function syncTaskEvent(userId: string, task: TaskForSync): Promise<string | null> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return task.googleEventId;

  if (!task.dueDate) {
    if (task.googleEventId) await deleteTaskEvent(userId, task.googleEventId);
    return null;
  }

  const start = task.dueDate;
  const end = new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000);
  const body = {
    summary: task.title,
    description: task.description ?? undefined,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
  };

  try {
    const url = task.googleEventId ? `${EVENTS_API}/${task.googleEventId}` : EVENTS_API;
    const res = await fetch(url, {
      method: task.googleEventId ? "PATCH" : "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const data = (await res.json()) as { id: string };
    return data.id;
  } catch (err) {
    logger.error(err, "Failed to sync task to Google Calendar");
    return task.googleEventId;
  }
}

export async function deleteTaskEvent(userId: string, googleEventId: string): Promise<void> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return;

  try {
    const res = await fetch(`${EVENTS_API}/${googleEventId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      throw new Error(`${res.status} ${await res.text()}`);
    }
  } catch (err) {
    logger.error(err, "Failed to delete task's Google Calendar event");
  }
}

export async function listUpcomingEvents(userId: string, timeMin: Date, timeMax: Date): Promise<CalendarEvent[]> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return [];

  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  });

  const res = await fetch(`${EVENTS_API}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    logger.error(new Error(`${res.status} ${await res.text()}`), "Failed to list Google Calendar events");
    return [];
  }

  const data = (await res.json()) as {
    items?: {
      id: string;
      summary?: string;
      htmlLink?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
    }[];
  };

  return (data.items ?? []).map((item) => ({
    id: item.id,
    title: item.summary ?? "(sem título)",
    start: item.start?.dateTime ?? item.start?.date ?? "",
    end: item.end?.dateTime ?? item.end?.date ?? "",
    allDay: !item.start?.dateTime,
    htmlLink: item.htmlLink ?? null,
  }));
}
