import { describe, expect, it } from 'vitest';
import { ApiError, CalendarApi, eventBody, mapEvent } from './api';

const DAY = '2026-10-23';
const ok = (body: unknown, status = 200) => new Response(status === 204 ? null : JSON.stringify(body), { status });

describe('mapEvent', () => {
  it('maps timed, all-day and multi-day events, and skips cancelled or declined ones', () => {
    const local = (h: number, m = 0, d = 23) => new Date(2026, 9, d, h, m).toISOString();
    const timed = mapEvent({ id: 'a', summary: 'Standup', start: { dateTime: local(9) }, end: { dateTime: local(9, 15) } }, DAY)!;
    expect([timed.startMin, timed.endMin, timed.allDay]).toEqual([540, 555, false]);

    expect(mapEvent({ id: 'b', summary: 'Holiday', start: { date: DAY }, end: { date: '2026-10-24' } }, DAY)!.allDay).toBe(true);

    const multi = mapEvent({ id: 'c', start: { dateTime: local(20, 0, 22) }, end: { dateTime: local(8, 0, 24) } }, DAY)!;
    expect([multi.startMin, multi.endMin, multi.title]).toEqual([0, 1440, '(No title)']);

    expect(mapEvent({ id: 'd', status: 'cancelled', start: { date: DAY }, end: { date: DAY } }, DAY)).toBeNull();
    const declined = { id: 'e', start: { dateTime: local(9) }, end: { dateTime: local(10) }, attendees: [{ self: true, responseStatus: 'declined' }] };
    expect(mapEvent(declined, DAY)).toBeNull();
  });
});

describe('eventBody', () => {
  it('builds start and end in local time and clamps at the end of the day', () => {
    const b = eventBody({ title: 'Deck', day: DAY, start: '10:00', minutes: 45 });
    expect(b.start.dateTime).toBe('2026-10-23T10:00:00');
    expect(b.end.dateTime).toBe('2026-10-23T10:45:00');
    expect(eventBody({ title: 'Late', day: DAY, start: '23:30', minutes: 120 }).end.dateTime).toBe('2026-10-23T23:59:00');
  });
});

describe('CalendarApi', () => {
  it('lists the day with the bearer token and day bounds', async () => {
    let url = '';
    let auth = '';
    const api = new CalendarApi(async () => 'tok', async (u, init) => {
      url = u;
      auth = (init?.headers as Record<string, string>).Authorization;
      return ok({ items: [{ id: 'a', summary: 'X', start: { date: DAY }, end: { date: DAY } }] });
    });
    expect(await api.listDay(DAY)).toHaveLength(1);
    expect(auth).toBe('Bearer tok');
    expect(url).toContain('singleEvents=true');
    expect(url).toContain(encodeURIComponent(new Date(2026, 9, 23).toISOString()));
  });

  it('creates and returns the event id, patches, and treats an already-deleted event as success', async () => {
    const calls: string[] = [];
    const api = new CalendarApi(async () => 't', async (u, init) => {
      calls.push(`${init?.method} ${u.split('/events')[1] ?? ''}`);
      if (init?.method === 'POST') return ok({ id: 'new1' });
      if (init?.method === 'DELETE') return ok({}, 410);
      return ok({});
    });
    const input = { title: 'T', day: DAY, start: '09:00', minutes: 30 };
    expect(await api.create(input)).toBe('new1');
    await api.update('new1', input);
    await api.remove('gone');
    expect(calls).toEqual(['POST ', 'PATCH /new1', 'DELETE /gone']);
  });

  it('surfaces other failures with their status', async () => {
    const api = new CalendarApi(async () => 't', async () => ok({}, 401));
    await expect(api.listDay(DAY)).rejects.toMatchObject({ status: 401 });
    await expect(api.listDay(DAY)).rejects.toBeInstanceOf(ApiError);
  });
});
