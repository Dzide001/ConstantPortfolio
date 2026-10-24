import type { Node } from '../types';
import type { RemoteDoc, SyncState, Tomb } from './types';

/**
 * Compares `prev` and `next` and returns `next` with `updatedAt` set on every node that changed,
 * plus a tombstone for every node that disappeared. Lets the rest of the app edit plain lists.
 */
export function stamp(prev: SyncState, next: Node[], now: number): SyncState {
  const before = new Map(prev.nodes.map((n) => [n.id, n]));
  const nodes = next.map((n) => (before.get(n.id) === n ? n : { ...n, updatedAt: now }));
  const alive = new Set(nodes.map((n) => n.id));
  const tombs = new Map(prev.tombs.map((t) => [t.id, t]));
  for (const id of alive) tombs.delete(id);
  for (const n of prev.nodes) if (!alive.has(n.id)) tombs.set(n.id, { id: n.id, deletedAt: now });
  return { nodes, tombs: [...tombs.values()] };
}

interface Entry {
  ts: number;
  node?: Node;
  fromRemote: boolean;
}

/**
 * Last writer wins per node. A deletion beats an edit made at the same instant.
 * Nodes whose parent no longer exists are deleted too, so a task added on one device
 * to a goal deleted on another does not linger as an orphan.
 */
export function mergeStates(local: SyncState, remote: SyncState, now: number): { state: SyncState; changed: boolean } {
  const best = new Map<string, Entry>();
  const consider = (id: string, e: Entry) => {
    const cur = best.get(id);
    if (!cur || e.ts > cur.ts || (e.ts === cur.ts && !e.node && cur.node)) best.set(id, e);
  };
  for (const n of local.nodes) consider(n.id, { ts: n.updatedAt, node: n, fromRemote: false });
  for (const t of local.tombs) consider(t.id, { ts: t.deletedAt, fromRemote: false });
  for (const n of remote.nodes) consider(n.id, { ts: n.updatedAt, node: n, fromRemote: true });
  for (const t of remote.tombs) consider(t.id, { ts: t.deletedAt, fromRemote: true });

  let changed = false;
  let nodes: Node[] = [];
  const tombs: Tomb[] = [];
  for (const [id, e] of best) {
    if (e.fromRemote) changed = true;
    if (e.node) nodes.push(e.node);
    else tombs.push({ id, deletedAt: e.ts });
  }

  for (;;) {
    const ids = new Set(nodes.map((n) => n.id));
    const orphans = nodes.filter((n) => n.parentId !== null && !ids.has(n.parentId));
    if (orphans.length === 0) break;
    const gone = new Set(orphans.map((o) => o.id));
    nodes = nodes.filter((n) => !gone.has(n.id));
    for (const id of gone) tombs.push({ id, deletedAt: now });
    changed = true;
  }
  return { state: { nodes, tombs }, changed };
}

export function toDocs(state: SyncState): RemoteDoc[] {
  return [
    ...state.nodes,
    ...state.tombs.map((t): RemoteDoc => ({ id: t.id, deleted: true, updatedAt: t.deletedAt })),
  ];
}

export const docTime = (d: RemoteDoc): number => d.updatedAt;

export function fromDocs(docs: RemoteDoc[]): SyncState {
  const nodes: Node[] = [];
  const tombs: Tomb[] = [];
  for (const d of docs) {
    if (typeof d?.id !== 'string' || typeof d.updatedAt !== 'number') continue;
    if ('deleted' in d && d.deleted === true) tombs.push({ id: d.id, deletedAt: d.updatedAt });
    else if (typeof (d as Node).title === 'string') nodes.push(d as Node);
  }
  return { nodes, tombs };
}
