/**
 * One flat record type for the whole hierarchy.
 *   depth 0 = goal (no day, container only)
 *   depth 1 = task (planned on a `day`)
 *   depth 2 = subtask (belongs to a task)
 * Depth is derived from parentId, never stored.
 */
export interface Node {
  id: string;
  parentId: string | null;
  title: string;
  done: boolean;
  /** Planned day as local YYYY-MM-DD. Only meaningful for tasks (depth 1). */
  day: string;
  /** Sort position among siblings. */
  order: number;
  /** Optional time block, "HH:MM" 24h local time. Tasks only. */
  start?: string;
  /** Length of the time block in minutes. */
  minutes?: number;
  /** Reminder lead time in minutes before `start` (0 = at start). null = no reminder, undefined = never set. */
  remindMinutes?: number | null;
  priority: 0 | 1 | 2;
  /** Google Calendar event id when this task has been added to the calendar. */
  eventId?: string;
  createdAt: number;
  doneAt?: number;
}

export type Depth = 0 | 1 | 2;
export const MAX_DEPTH: Depth = 2;
