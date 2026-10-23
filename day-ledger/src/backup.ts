import type { Node } from './types';

const FORMAT = 'day-ledger-backup';

export function toBackup(nodes: Node[]): string {
  return JSON.stringify({ format: FORMAT, version: 1, exportedAt: new Date().toISOString(), nodes }, null, 2);
}

/** Parses and validates a backup file. Throws a readable Error on bad input. */
export function fromBackup(text: string): Node[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  const obj = data as { format?: string; nodes?: unknown };
  if (obj?.format !== FORMAT || !Array.isArray(obj.nodes)) {
    throw new Error('That file is not a Day Ledger backup.');
  }
  const ids = new Set<string>();
  for (const raw of obj.nodes) {
    const n = raw as Partial<Node>;
    if (
      typeof n.id !== 'string' ||
      typeof n.title !== 'string' ||
      typeof n.done !== 'boolean' ||
      typeof n.day !== 'string' ||
      typeof n.order !== 'number' ||
      (n.parentId !== null && typeof n.parentId !== 'string')
    ) {
      throw new Error('The backup contains a malformed task.');
    }
    ids.add(n.id);
  }
  for (const n of obj.nodes as Node[]) {
    if (n.parentId && !ids.has(n.parentId)) throw new Error('The backup has a task with a missing parent.');
  }
  return (obj.nodes as Node[]).map((n) => ({ ...n, priority: n.priority ?? 0, createdAt: n.createdAt ?? Date.now() }));
}
