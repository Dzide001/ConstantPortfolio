import { parseDay, toMinutes } from './dates';
import type { Node } from './types';

/** Choices shown in the task menu. `null` means no reminder. */
export const LEAD_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'No reminder' },
  { value: 0, label: 'At start' },
  { value: 5, label: '5 min before' },
  { value: 10, label: '10 min before' },
  { value: 15, label: '15 min before' },
  { value: 30, label: '30 min before' },
  { value: 60, label: '1 hour before' },
];

/** New time blocks get this lead time until the user picks another. */
export const DEFAULT_LEAD = 10;
export const SNOOZE_MINUTES = 10;
/** A reminder is still shown this long after the task's start (covers opening the app a little late). */
const GRACE_MINUTES = 30;

export function startDate(n: Node): Date {
  const d = parseDay(n.day);
  d.setMinutes(toMinutes(n.start!));
  return d;
}

/** One reminder per task, per scheduled slot and lead time. Changing any of them makes a new reminder. */
export function reminderKey(n: Node): string {
  return `${n.id}|${n.day}|${n.start}|${n.remindMinutes}`;
}

export function leadLabel(n: Node, now: Date): string {
  const mins = Math.round((startDate(n).getTime() - now.getTime()) / 60_000);
  if (mins > 1) return `starts in ${mins} min`;
  if (mins >= 0) return 'starts now';
  return `started ${-mins} min ago`;
}

export interface ReminderState {
  /** Keys already shown. */
  fired: string[];
  /** Key -> time (ms) before which the reminder stays quiet. */
  snoozed: Record<string, number>;
}

/**
 * Tasks whose reminder should fire right now.
 * Skips done tasks, tasks without a time or lead, tasks planned for another day,
 * and tasks on Google Calendar (the calendar delivers those reminders itself).
 */
export function dueReminders(nodes: Node[], now: Date, state: ReminderState): Node[] {
  const t = now.getTime();
  return nodes.filter((n) => {
    if (n.done || !n.start || n.eventId) return false;
    if (n.remindMinutes === null || n.remindMinutes === undefined) return false;
    const key = reminderKey(n);
    if (state.fired.includes(key)) return false;
    if ((state.snoozed[key] ?? 0) > t) return false;
    const start = startDate(n).getTime();
    return t >= start - n.remindMinutes * 60_000 && t < start + GRACE_MINUTES * 60_000;
  });
}
