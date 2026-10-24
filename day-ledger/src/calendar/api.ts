import { addDays, fromMinutes, parseDay, toMinutes } from '../dates';

const BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

export interface CalEvent {
  id: string;
  title: string;
  allDay: boolean;
  /** Minutes from local midnight of the viewed day (clamped for multi-day events). */
  startMin: number;
  endMin: number;
  location?: string;
  link?: string;
}

export interface TaskEventInput {
  title: string;
  day: string;
  start: string; // HH:MM
  minutes: number;
  /** See Node.remindMinutes. undefined leaves the calendar's own default reminders alone. */
  remindMinutes?: number | null;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

interface RawEvent {
  id: string;
  status?: string;
  summary?: string;
  location?: string;
  htmlLink?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  attendees?: { self?: boolean; responseStatus?: string }[];
}

const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes();

/** Converts a raw API event for `day`. Returns null for events that should not show. */
export function mapEvent(raw: RawEvent, day: string): CalEvent | null {
  if (raw.status === 'cancelled') return null;
  if (raw.attendees?.some((a) => a.self && a.responseStatus === 'declined')) return null;
  const base = {
    id: raw.id,
    title: raw.summary?.trim() || '(No title)',
    location: raw.location,
    link: raw.htmlLink,
  };
  if (raw.start?.date) return { ...base, allDay: true, startMin: 0, endMin: 0 };
  if (!raw.start?.dateTime || !raw.end?.dateTime) return null;
  const start = new Date(raw.start.dateTime);
  const end = new Date(raw.end.dateTime);
  const dayStart = parseDay(day).getTime();
  const dayEnd = parseDay(addDays(day, 1)).getTime();
  return {
    ...base,
    allDay: false,
    startMin: start.getTime() < dayStart ? 0 : minutesOfDay(start),
    endMin: end.getTime() >= dayEnd ? 24 * 60 : minutesOfDay(end),
  };
}

export function eventBody({ title, day, start, minutes, remindMinutes }: TaskEventInput) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const endMin = Math.min(toMinutes(start) + minutes, 24 * 60 - 1);
  return {
    summary: title,
    start: { dateTime: `${day}T${start}:00`, timeZone },
    end: { dateTime: `${day}T${fromMinutes(endMin)}:00`, timeZone },
    // Google Calendar delivers this popup on every device the account is signed in on, even when this app is closed.
    ...(remindMinutes === undefined
      ? {}
      : {
          reminders: {
            useDefault: false,
            overrides: remindMinutes === null ? [] : [{ method: 'popup', minutes: remindMinutes }],
          },
        }),
  };
}

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

/** Thin Calendar REST client. `token` is called per request so it can refresh. */
export class CalendarApi {
  constructor(
    private token: () => Promise<string>,
    private f: Fetcher = (u, i) => fetch(u, i),
  ) {}

  private async call(url: string, init: RequestInit = {}): Promise<unknown> {
    const res = await this.f(url, {
      ...init,
      headers: { Authorization: `Bearer ${await this.token()}`, 'Content-Type': 'application/json', ...init.headers },
    });
    if (!res.ok) throw new ApiError(res.status, `Google Calendar returned ${res.status}`);
    return res.status === 204 ? null : res.json();
  }

  async listDay(day: string): Promise<CalEvent[]> {
    const q = new URLSearchParams({
      timeMin: parseDay(day).toISOString(),
      timeMax: parseDay(addDays(day, 1)).toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '100',
    });
    const data = (await this.call(`${BASE}?${q}`)) as { items?: RawEvent[] };
    return (data.items ?? []).map((e) => mapEvent(e, day)).filter((e): e is CalEvent => e !== null);
  }

  async create(input: TaskEventInput): Promise<string> {
    const data = (await this.call(BASE, { method: 'POST', body: JSON.stringify(eventBody(input)) })) as { id: string };
    return data.id;
  }

  async update(eventId: string, input: TaskEventInput): Promise<void> {
    await this.call(`${BASE}/${encodeURIComponent(eventId)}`, { method: 'PATCH', body: JSON.stringify(eventBody(input)) });
  }

  /** Deleting an event that is already gone counts as success. */
  async remove(eventId: string): Promise<void> {
    try {
      await this.call(`${BASE}/${encodeURIComponent(eventId)}`, { method: 'DELETE' });
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 410)) return;
      throw e;
    }
  }
}
