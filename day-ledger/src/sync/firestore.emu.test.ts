import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import * as fs from 'firebase/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SyncEngine } from './engine';
import { firestoreBackend } from './firebase';
import { stamp } from './merge';
import type { SyncState } from './types';
import { addNode, removeNode } from '../tree';

let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-dayledger',
    firestore: { rules: readFileSync('firebase/firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(async () => env.cleanup());

const dbFor = (uid: string | null) =>
  (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore() as unknown as fs.Firestore;
const settle = (ms = 150) => new Promise((r) => setTimeout(r, ms));
const goalDoc = { id: 'g1', parentId: null, title: 'Goal', done: false, day: '2026-10-24', order: 0, priority: 0, createdAt: 1, updatedAt: 1 };

describe('security rules', () => {
  it('lets a person read and write only their own list', async () => {
    await assertSucceeds(fs.setDoc(fs.doc(dbFor('alice'), 'users/alice/nodes/g1'), goalDoc));
    await assertSucceeds(fs.getDoc(fs.doc(dbFor('alice'), 'users/alice/nodes/g1')));
    await assertFails(fs.getDoc(fs.doc(dbFor('bob'), 'users/alice/nodes/g1')));
    await assertFails(fs.setDoc(fs.doc(dbFor('bob'), 'users/alice/nodes/g2'), { ...goalDoc, id: 'g2' }));
    await assertFails(fs.getDoc(fs.doc(dbFor(null), 'users/alice/nodes/g1')));
  });

  it('rejects malformed documents and accepts tombstones', async () => {
    const db = dbFor('carol');
    const ref = (id: string) => fs.doc(db, `users/carol/nodes/${id}`);
    await assertFails(fs.setDoc(ref('x'), { ...goalDoc, id: 'other' })); // id must match the path
    await assertFails(fs.setDoc(ref('x'), { ...goalDoc, id: 'x', updatedAt: 'soon' }));
    await assertFails(fs.setDoc(ref('x'), { ...goalDoc, id: 'x', title: 'a'.repeat(501) }));
    await assertFails(fs.setDoc(ref('x'), { ...goalDoc, id: 'x', title: 42 }));
    await assertSucceeds(fs.setDoc(ref('x'), { id: 'x', deleted: true, updatedAt: 9 }));
  });
});

describe('Firestore backend with the sync engine', () => {
  it('syncs two devices of one account through real Firestore, including deletions and delete-all', async () => {
    const clock = { t: 1000 };
    const mk = () => {
      const dev = {
        state: { nodes: [], tombs: [] } as SyncState,
        engine: undefined as unknown as SyncEngine,
        edit(f: (n: SyncState['nodes']) => SyncState['nodes']) {
          clock.t += 10;
          dev.state = stamp(dev.state, f(dev.state.nodes), clock.t);
          dev.engine.setLocal(dev.state);
        },
      };
      dev.engine = new SyncEngine(firestoreBackend(fs, dbFor('dave'), 'dave'), {
        apply: (m) => (dev.state = m),
        onStatus: () => {},
        debounceMs: 0,
        now: () => clock.t,
      });
      dev.engine.start(dev.state);
      return dev;
    };
    const a = mk();
    const b = mk();
    await settle();
    a.edit((n) => addNode(n, { title: 'Goal', parentId: null, day: '2026-10-24', now: clock.t }));
    await settle(400);
    expect(b.state.nodes.map((n) => n.title)).toEqual(['Goal']);

    const id = b.state.nodes[0].id;
    b.edit((n) => removeNode(n, id));
    await settle(400);
    expect(a.state.nodes).toEqual([]);
    expect(a.state.tombs.map((t) => t.id)).toEqual([id]);

    a.engine.stop();
    b.engine.stop();
    await firestoreBackend(fs, dbFor('dave'), 'dave').deleteAll();
    const left = await fs.getDocs(fs.collection(dbFor('dave'), 'users/dave/nodes'));
    expect(left.size).toBe(0);
  });
});
