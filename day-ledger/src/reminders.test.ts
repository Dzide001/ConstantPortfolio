import { describe, expect, it } from 'vitest';
import { dueReminders, leadLabel, reminderKey, type ReminderState } from './reminders';
import { eventBody } from './calendar/api';
import type { Node } from './types';

const at = (h: number, m = 0) => new Date(2026, 9, 24, h, m);
const none: ReminderState = { fired: [], snoozed: {} };

const task = (over: Partial<Node> = {}): Node => ({
  id: 't1', parentId: 'g', title: 'Deck', done: false, day: '2026-10-24', order: 0, priority: 0,
  createdAt: 0, updatedAt: 0, start: '10:00', minutes: 30, remindMinutes: 10, ...over,
});

describe('dueReminders', () => {
  it('fires from the lead time until 30 minutes after the start', () => {
    const t = [task()];
    expect(dueReminders(t, at(9, 49), none)).toHaveLength(0);
    expect(dueReminders(t, at(9, 50), none)).toHaveLength(1);
    expect(dueReminders(t, at(10, 29), none)).toHaveLength(1);
    expect(dueReminders(t, at(10, 30), none)).toHaveLength(0);
  });

  it('supports "at start" (0) and ignores tasks with no lead', () => {
    expect(dueReminders([task({ remindMinutes: 0 })], at(9, 59), none)).toHaveLength(0);
    expect(dueReminders([task({ remindMinutes: 0 })], at(10, 0), none)).toHaveLength(1);
    expect(dueReminders([task({ remindMinutes: null })], at(10, 0), none)).toHaveLength(0);
    expect(dueReminders([task({ remindMinutes: undefined })], at(10, 0), none)).toHaveLength(0);
  });

  it('skips done tasks, untimed tasks, other days and tasks the calendar already reminds about', () => {
    const now = at(10, 0);
    expect(dueReminders([task({ done: true })], now, none)).toHaveLength(0);
    expect(dueReminders([task({ start: undefined })], now, none)).toHaveLength(0);
    expect(dueReminders([task({ day: '2026-10-25' })], now, none)).toHaveLength(0);
    expect(dueReminders([task({ day: '2026-10-23' })], now, none)).toHaveLength(0);
    expect(dueReminders([task({ eventId: 'ev1' })], now, none)).toHaveLength(0);
  });

  it('does not repeat a fired reminder, but a new time or lead makes a new one', () => {
    const t = task();
    const fired = { fired: [reminderKey(t)], snoozed: {} };
    expect(dueReminders([t], at(10, 0), fired)).toHaveLength(0);
    expect(dueReminders([task({ start: '10:05' })], at(10, 0), fired)).toHaveLength(1);
    expect(dueReminders([task({ remindMinutes: 15 })], at(10, 0), fired)).toHaveLength(1);
  });

  it('holds a snoozed reminder until the snooze ends', () => {
    const t = task();
    const state = { fired: [], snoozed: { [reminderKey(t)]: at(10, 5).getTime() } };
    expect(dueReminders([t], at(10, 4), state)).toHaveLength(0);
    expect(dueReminders([t], at(10, 5), state)).toHaveLength(1);
  });
});

describe('leadLabel', () => {
  it('describes time to start', () => {
    expect(leadLabel(task(), at(9, 50))).toBe('starts in 10 min');
    expect(leadLabel(task(), at(10, 0))).toBe('starts now');
    expect(leadLabel(task(), at(10, 7))).toBe('started 7 min ago');
  });
});

describe('calendar reminders', () => {
  const base = { title: 'Deck', day: '2026-10-24', start: '10:00', minutes: 30 };
  it('sends a popup override, an empty list for none, and nothing when never set', () => {
    expect(eventBody({ ...base, remindMinutes: 15 }).reminders).toEqual({ useDefault: false, overrides: [{ method: 'popup', minutes: 15 }] });
    expect(eventBody({ ...base, remindMinutes: 0 }).reminders?.overrides).toEqual([{ method: 'popup', minutes: 0 }]);
    expect(eventBody({ ...base, remindMinutes: null }).reminders).toEqual({ useDefault: false, overrides: [] });
    expect(eventBody(base)).not.toHaveProperty('reminders');
  });
});
