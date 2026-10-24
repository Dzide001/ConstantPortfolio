import { MAX_DEPTH, type Depth, type Node } from './types';

export function newId(): string {
  return crypto.randomUUID();
}

export function depthOf(nodes: Node[], id: string): Depth {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let depth = 0;
  let cur = byId.get(id);
  while (cur?.parentId) {
    depth++;
    cur = byId.get(cur.parentId);
  }
  return Math.min(depth, MAX_DEPTH) as Depth;
}

export function childrenOf(nodes: Node[], parentId: string | null): Node[] {
  return nodes.filter((n) => n.parentId === parentId).sort((a, b) => a.order - b.order);
}

export function descendantIds(nodes: Node[], id: string): Set<string> {
  const out = new Set<string>();
  const walk = (pid: string) => {
    for (const n of nodes) {
      if (n.parentId === pid && !out.has(n.id)) {
        out.add(n.id);
        walk(n.id);
      }
    }
  };
  walk(id);
  return out;
}

interface AddInput {
  title: string;
  parentId: string | null;
  day: string;
  now?: number;
}

/** Returns the new list, or the same list if the add is not allowed. */
export function addNode(nodes: Node[], input: AddInput): Node[] {
  const title = input.title.trim();
  if (!title) return nodes;
  if (input.parentId) {
    const parent = nodes.find((n) => n.id === input.parentId);
    if (!parent) return nodes;
    if (depthOf(nodes, parent.id) >= MAX_DEPTH) return nodes; // subtasks cannot nest further
  }
  const siblings = childrenOf(nodes, input.parentId);
  const node: Node = {
    id: newId(),
    parentId: input.parentId,
    title,
    done: false,
    day: input.day,
    order: siblings.length ? siblings[siblings.length - 1].order + 1 : 0,
    priority: 0,
    createdAt: input.now ?? Date.now(),
    updatedAt: input.now ?? Date.now(),
  };
  // A parent that was done becomes open again once it gets an unfinished child.
  const reopened = input.parentId ? setDone(nodes, input.parentId, false, 'self') : nodes;
  return [...reopened, node];
}

function setDone(nodes: Node[], id: string, done: boolean, mode: 'self' | 'cascade'): Node[] {
  const ids = new Set([id]);
  if (mode === 'cascade') descendantIds(nodes, id).forEach((d) => ids.add(d));
  const now = Date.now();
  return nodes.map((n) =>
    ids.has(n.id) && n.done !== done ? { ...n, done, doneAt: done ? now : undefined } : n,
  );
}

/**
 * Toggle completion. Completing a parent completes everything under it.
 * A parent with children is done exactly when all of its children are done,
 * and that rule is re-applied up the chain.
 */
export function toggleDone(nodes: Node[], id: string): Node[] {
  const target = nodes.find((n) => n.id === id);
  if (!target) return nodes;
  let next = setDone(nodes, id, !target.done, 'cascade');
  let parentId = target.parentId;
  while (parentId) {
    const kids = childrenOf(next, parentId);
    const allDone = kids.length > 0 && kids.every((k) => k.done);
    next = setDone(next, parentId, allDone, 'self');
    parentId = next.find((n) => n.id === parentId)?.parentId ?? null;
  }
  return next;
}

export function removeNode(nodes: Node[], id: string): Node[] {
  const gone = descendantIds(nodes, id);
  gone.add(id);
  const target = nodes.find((n) => n.id === id);
  let next = nodes.filter((n) => !gone.has(n.id));
  // Removing the last open child can finish the parent.
  if (target?.parentId) {
    const kids = childrenOf(next, target.parentId);
    if (kids.length > 0 && kids.every((k) => k.done)) {
      next = setDone(next, target.parentId, true, 'self');
    }
  }
  return next;
}

export function updateNode(nodes: Node[], id: string, patch: Partial<Node>): Node[] {
  return nodes.map((n) => (n.id === id ? { ...n, ...patch, id: n.id, parentId: n.parentId } : n));
}

/**
 * Tasks (depth 1) that belong on `today`'s list:
 * planned for today, or unfinished from an earlier day (carried over).
 * Nothing is rewritten, so a task stays on its original day until finished or moved.
 */
export function tasksForDay(nodes: Node[], today: string): Node[] {
  const goalIds = new Set(nodes.filter((n) => n.parentId === null).map((n) => n.id));
  return nodes.filter(
    (n) => n.parentId && goalIds.has(n.parentId) && (n.day === today || (!n.done && n.day < today)),
  );
}

export function isCarriedOver(n: Node, today: string): boolean {
  return !n.done && n.day < today;
}

/** Moves every carried-over task onto `today` (used by "Move to today"). */
export function rescheduleOverdue(nodes: Node[], today: string): Node[] {
  const overdue = new Set(tasksForDay(nodes, today).filter((n) => isCarriedOver(n, today)).map((n) => n.id));
  return nodes.map((n) => (overdue.has(n.id) ? { ...n, day: today } : n));
}

export interface Progress {
  done: number;
  total: number;
}

/** Counts leaf work: a task with subtasks counts through its subtasks. */
export function progressFor(nodes: Node[], today: string): Progress {
  const tasks = tasksForDay(nodes, today);
  let done = 0;
  let total = 0;
  for (const t of tasks) {
    const subs = childrenOf(nodes, t.id);
    const leaves = subs.length ? subs : [t];
    total += leaves.length;
    done += leaves.filter((l) => l.done).length;
  }
  return { done, total };
}

/**
 * Re-applies "a parent is done exactly when all its children are done" after
 * changes from another device were merged in. Only parents that have children are touched.
 */
export function repairCompletion(nodes: Node[]): Node[] {
  let next = nodes;
  for (let pass = 0; pass <= MAX_DEPTH; pass++) {
    const parents = new Set(next.map((n) => n.parentId).filter((id): id is string => id !== null));
    let changed = false;
    for (const id of parents) {
      const parent = next.find((n) => n.id === id);
      if (!parent) continue;
      const want = childrenOf(next, id).every((k) => k.done);
      if (parent.done !== want) {
        next = setDone(next, id, want, 'self');
        changed = true;
      }
    }
    if (!changed) break;
  }
  return next;
}
