import { describe, expect, it } from 'vitest';
import { addNode, childrenOf, progressFor, removeNode, rescheduleOverdue, tasksForDay, toggleDone } from './tree';
import { fromBackup, toBackup } from './backup';
import { addDays, dayKey } from './dates';
import type { Node } from './types';

const TODAY = '2026-10-23';

function build() {
  let n: Node[] = [];
  n = addNode(n, { title: 'Goal', parentId: null, day: TODAY });
  const goal = n[0];
  n = addNode(n, { title: 'Task', parentId: goal.id, day: TODAY });
  const task = n[1];
  n = addNode(n, { title: 'Sub A', parentId: task.id, day: TODAY });
  n = addNode(n, { title: 'Sub B', parentId: task.id, day: TODAY });
  return { n, goal, task, subs: childrenOf(n, task.id) };
}

describe('hierarchy', () => {
  it('rejects empty titles and a fourth level', () => {
    const { n, subs } = build();
    expect(addNode(n, { title: '   ', parentId: null, day: TODAY })).toBe(n);
    expect(addNode(n, { title: 'too deep', parentId: subs[0].id, day: TODAY })).toBe(n);
  });

  it('completes the parent when all subtasks are done, and reopens it when one is unticked', () => {
    const { n, task, subs } = build();
    let next = toggleDone(n, subs[0].id);
    expect(next.find((x) => x.id === task.id)!.done).toBe(false);
    next = toggleDone(next, subs[1].id);
    expect(next.find((x) => x.id === task.id)!.done).toBe(true);
    next = toggleDone(next, subs[0].id);
    expect(next.find((x) => x.id === task.id)!.done).toBe(false);
  });

  it('completing a task completes its subtasks, and a new subtask reopens it', () => {
    const { n, task, subs } = build();
    let next = toggleDone(n, task.id);
    expect(subs.every((s) => next.find((x) => x.id === s.id)!.done)).toBe(true);
    next = addNode(next, { title: 'Sub C', parentId: task.id, day: TODAY });
    expect(next.find((x) => x.id === task.id)!.done).toBe(false);
  });

  it('removes descendants and finishes the parent if only done children remain', () => {
    const { n, task, subs } = build();
    expect(removeNode(n, task.id)).toHaveLength(1);
    let next = toggleDone(n, subs[0].id);
    next = removeNode(next, subs[1].id);
    expect(next.find((x) => x.id === task.id)!.done).toBe(true);
  });
});

describe('days', () => {
  it('carries unfinished tasks forward but not finished ones', () => {
    const { n, task } = build();
    const tomorrow = addDays(TODAY, 1);
    expect(tasksForDay(n, tomorrow).map((t) => t.id)).toEqual([task.id]);
    const done = toggleDone(n, task.id);
    expect(tasksForDay(done, tomorrow)).toHaveLength(0);
    expect(tasksForDay(n, addDays(TODAY, -1))).toHaveLength(0);
  });

  it('moves overdue tasks to today', () => {
    const { n } = build();
    const tomorrow = addDays(TODAY, 1);
    const moved = rescheduleOverdue(n, tomorrow);
    expect(moved.find((x) => x.title === 'Task')!.day).toBe(tomorrow);
  });

  it('counts progress through subtasks', () => {
    const { n, subs } = build();
    expect(progressFor(n, TODAY)).toEqual({ done: 0, total: 2 });
    expect(progressFor(toggleDone(n, subs[0].id), TODAY)).toEqual({ done: 1, total: 2 });
  });

  it('formats and shifts local day keys', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('backup', () => {
  it('round-trips and rejects bad files', () => {
    const { n } = build();
    expect(fromBackup(toBackup(n)).map((x) => x.id)).toEqual(n.map((x) => x.id));
    expect(() => fromBackup('nope')).toThrow(/valid JSON/);
    expect(() => fromBackup('{"format":"other"}')).toThrow(/not a Day Ledger/);
    const orphan = JSON.stringify({ format: 'day-ledger-backup', nodes: [{ ...n[1], parentId: 'ghost' }] });
    expect(() => fromBackup(orphan)).toThrow(/missing parent/);
  });
});
