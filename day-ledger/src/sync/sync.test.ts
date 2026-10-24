import { describe, expect, it } from 'vitest';
import { SyncEngine, type Backend, type SyncStatus } from './engine';
import { fromDocs, mergeStates, stamp, toDocs } from './merge';
import type { RemoteDoc, SyncState } from './types';
import { addNode, childrenOf, removeNode, repairCompletion, toggleDone } from '../tree';
import type { Node } from '../types';

const DAY = '2026-10-24';
const node = (id: string, over: Partial<Node> = {}): Node => ({
  id, parentId: null, title: id, done: false, day: DAY, order: 0, priority: 0, createdAt: 1, updatedAt: 1, ...over,
});
const empty: SyncState = { nodes: [], tombs: [] };

describe('stamp', () => {
  it('stamps changed and new nodes, leaves untouched ones, and tombstones removals', () => {
    const a = node('a'), b = node('b');
    const prev = { nodes: [a, b], tombs: [] };
    const next = stamp(prev, [a, { ...b, title: 'B2' }, node('c')], 50);
    expect(next.nodes.map((n) => [n.id, n.updatedAt])).toEqual([['a', 1], ['b', 50], ['c', 50]]);
    const removed = stamp(prev, [a], 60);
    expect(removed.tombs).toEqual([{ id: 'b', deletedAt: 60 }]);
    // bringing it back clears the tombstone
    expect(stamp(removed, [a, node('b')], 70).tombs).toEqual([]);
  });
});

describe('mergeStates', () => {
  it('keeps the newest version of each node', () => {
    const local = { nodes: [node('a', { title: 'old', updatedAt: 5 }), node('b', { updatedAt: 9 })], tombs: [] };
    const remote = { nodes: [node('a', { title: 'new', updatedAt: 8 }), node('b', { title: 'stale', updatedAt: 3 }), node('c')], tombs: [] };
    const { state, changed } = mergeStates(local, remote, 100);
    const by = Object.fromEntries(state.nodes.map((n) => [n.id, n.title]));
    expect(by).toEqual({ a: 'new', b: 'b', c: 'c' });
    expect(changed).toBe(true);
  });

  it('applies deletions both ways, and a deletion wins a tie', () => {
    const live = node('a', { updatedAt: 5 });
    expect(mergeStates({ nodes: [live], tombs: [] }, { nodes: [], tombs: [{ id: 'a', deletedAt: 6 }] }, 100).state.nodes).toEqual([]);
    expect(mergeStates({ nodes: [], tombs: [{ id: 'a', deletedAt: 4 }] }, { nodes: [live], tombs: [] }, 100).state.nodes).toHaveLength(1);
    expect(mergeStates({ nodes: [live], tombs: [] }, { nodes: [], tombs: [{ id: 'a', deletedAt: 5 }] }, 100).state.nodes).toEqual([]);
  });

  it('reports no change when remote has nothing newer', () => {
    const s = { nodes: [node('a')], tombs: [] };
    expect(mergeStates(s, { nodes: [], tombs: [] }, 100).changed).toBe(false);
    expect(mergeStates(s, s, 100).changed).toBe(false);
  });

  it('deletes children whose parent was deleted elsewhere', () => {
    const goal = node('g'), task = node('t', { parentId: 'g' }), sub = node('s', { parentId: 't' });
    const { state } = mergeStates({ nodes: [goal, task, sub], tombs: [] }, { nodes: [], tombs: [{ id: 'g', deletedAt: 99 }] }, 100);
    expect(state.nodes).toEqual([]);
    expect(state.tombs.map((t) => t.id).sort()).toEqual(['g', 's', 't']);
  });

  it('round-trips through remote documents', () => {
    const s = { nodes: [node('a')], tombs: [{ id: 'z', deletedAt: 7 }] };
    expect(fromDocs(toDocs(s))).toEqual(s);
    expect(fromDocs([{ nope: 1 } as unknown as RemoteDoc])).toEqual(empty);
  });
});

describe('repairCompletion', () => {
  it('re-derives a parent from its children', () => {
    const t = node('t', { parentId: 'g', done: true });
    const kids = [node('s1', { parentId: 't', done: true }), node('s2', { parentId: 't', done: false })];
    const fixed = repairCompletion([node('g'), t, ...kids]);
    expect(fixed.find((n) => n.id === 't')!.done).toBe(false);
    const all = repairCompletion([node('g'), node('t', { parentId: 'g' }), node('s1', { parentId: 't', done: true })]);
    expect(all.find((n) => n.id === 't')!.done).toBe(true);
  });
});

// ---- two simulated devices sharing one fake cloud ----

class FakeCloud implements Backend {
  docs = new Map<string, RemoteDoc>();
  listeners = new Set<(d: RemoteDoc[]) => void>();
  online = true;
  pushes = 0;
  subscribe(onDocs: (d: RemoteDoc[]) => void) {
    this.listeners.add(onDocs);
    queueMicrotask(() => onDocs([...this.docs.values()]));
    return () => this.listeners.delete(onDocs);
  }
  async push(docs: RemoteDoc[]) {
    if (!this.online) throw new Error('offline');
    this.pushes++;
    for (const d of docs) this.docs.set(d.id, d);
    queueMicrotask(() => this.listeners.forEach((l) => l([...this.docs.values()])));
  }
  async deleteAll() {
    this.docs.clear();
    this.listeners.forEach((l) => l([]));
  }
}

class Device {
  state: SyncState;
  status: SyncStatus = 'syncing';
  engine: SyncEngine;
  constructor(cloud: FakeCloud, initial: SyncState = empty, private clock: { t: number }) {
    this.state = initial;
    this.engine = new SyncEngine(cloud, {
      apply: (m) => (this.state = { nodes: repairCompletion(m.nodes), tombs: m.tombs }),
      onStatus: (s) => (this.status = s),
      debounceMs: 0,
      retryMs: 5,
      now: () => this.clock.t,
    });
    this.engine.start(this.state);
  }
  edit(f: (n: Node[]) => Node[]) {
    this.clock.t += 10;
    this.state = stamp(this.state, f(this.state.nodes), this.clock.t);
    this.engine.setLocal(this.state);
  }
  titles() {
    return this.state.nodes.map((n) => n.title).sort();
  }
}
const settle = () => new Promise((r) => setTimeout(r, 25));
const add = (title: string, parentId: string | null, now: number) => (n: Node[]) => addNode(n, { title, parentId, day: DAY, now });

describe('SyncEngine with two devices', () => {
  it('uploads the first device and downloads onto a fresh one', async () => {
    const cloud = new FakeCloud();
    const clock = { t: 1000 };
    const a = new Device(cloud, empty, clock);
    await settle();
    a.edit(add('Goal', null, clock.t));
    a.edit((n) => addNode(n, { title: 'Task', parentId: n[0].id, day: DAY, now: clock.t }));
    await settle();
    expect(cloud.docs.size).toBe(2);
    const b = new Device(cloud, empty, clock);
    await settle();
    expect(b.titles()).toEqual(['Goal', 'Task']);
    expect(a.status).toBe('synced');
  });

  it('merges local data from before sign-in with cloud data, without duplicates', async () => {
    const cloud = new FakeCloud();
    const clock = { t: 1000 };
    const a = new Device(cloud, empty, clock);
    await settle();
    a.edit(add('From A', null, clock.t));
    await settle();
    const local = { nodes: [node('local-only', { title: 'Local only', updatedAt: 500 })], tombs: [] };
    const b = new Device(cloud, local, clock);
    await settle();
    expect(b.titles()).toEqual(['From A', 'Local only']);
    expect(a.titles()).toEqual(['From A', 'Local only']);
    expect(cloud.docs.size).toBe(2);
  });

  it('propagates edits, completion and deletions between devices', async () => {
    const cloud = new FakeCloud();
    const clock = { t: 1000 };
    const a = new Device(cloud, empty, clock);
    const b = new Device(cloud, empty, clock);
    await settle();
    a.edit(add('Goal', null, clock.t));
    await settle();
    const goal = a.state.nodes[0];
    a.edit(add('Task', goal.id, clock.t));
    await settle();
    const task = b.state.nodes.find((n) => n.title === 'Task')!;
    b.edit((n) => toggleDone(n, task.id));
    await settle();
    expect(a.state.nodes.find((n) => n.title === 'Task')!.done).toBe(true);
    a.edit((n) => removeNode(n, task.id));
    await settle();
    expect(b.titles()).toEqual(['Goal']);
    expect(childrenOf(b.state.nodes, goal.id)).toEqual([]);
  });

  it('keeps an offline edit, pushes it on reconnect, and does not resurrect deletions', async () => {
    const cloud = new FakeCloud();
    const clock = { t: 1000 };
    const a = new Device(cloud, empty, clock);
    const b = new Device(cloud, empty, clock);
    await settle();
    a.edit(add('Keep', null, clock.t));
    a.edit(add('Delete me', null, clock.t));
    await settle();

    cloud.online = false;
    a.edit((n) => n.map((x) => (x.title === 'Keep' ? { ...x, title: 'Keep (edited offline)' } : x)));
    await settle();
    expect(['error', 'offline']).toContain(a.status);

    // meanwhile B deletes a task
    const doomed = b.state.nodes.find((n) => n.title === 'Delete me')!;
    cloud.online = true;
    b.edit((n) => removeNode(n, doomed.id));
    await settle();
    await settle();
    expect(a.titles()).toEqual(['Keep (edited offline)']);
    expect(b.titles()).toEqual(['Keep (edited offline)']);
    expect(a.status).toBe('synced');
  });

  it('does not echo remote changes back to the cloud', async () => {
    const cloud = new FakeCloud();
    const clock = { t: 1000 };
    const a = new Device(cloud, empty, clock);
    new Device(cloud, empty, clock);
    await settle();
    a.edit(add('One', null, clock.t));
    await settle();
    await settle();
    expect(cloud.pushes).toBe(1);
  });

  it('stops syncing after stop()', async () => {
    const cloud = new FakeCloud();
    const clock = { t: 1000 };
    const a = new Device(cloud, empty, clock);
    await settle();
    a.engine.stop();
    a.edit(add('After stop', null, clock.t));
    await settle();
    expect(cloud.docs.size).toBe(0);
  });
});
