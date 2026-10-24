import type { SyncState, Tomb } from './sync/types';
import type { Node } from './types';

const DB_NAME = 'day-ledger';
const NODES = 'nodes';
const TOMBS = 'tombs';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(NODES)) db.createObjectStore(NODES, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(TOMBS)) db.createObjectStore(TOMBS, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function all<T>(store: IDBObjectStore): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function loadAll(): Promise<SyncState> {
  const db = await open();
  try {
    const tx = db.transaction([NODES, TOMBS]);
    const [nodes, tombs] = await Promise.all([all<Node>(tx.objectStore(NODES)), all<Tomb>(tx.objectStore(TOMBS))]);
    // Lists saved before sync existed have no updatedAt.
    return { nodes: nodes.map((n) => ({ ...n, updatedAt: n.updatedAt ?? n.createdAt })), tombs };
  } finally {
    db.close();
  }
}

/** Replaces the stored state in one transaction. Personal task lists are small, so this stays simple. */
export async function saveAll(state: SyncState): Promise<void> {
  const db = await open();
  const tx = db.transaction([NODES, TOMBS], 'readwrite');
  const nodes = tx.objectStore(NODES);
  const tombs = tx.objectStore(TOMBS);
  nodes.clear();
  tombs.clear();
  state.nodes.forEach((n) => nodes.put(n));
  state.tombs.forEach((t) => tombs.put(t));
  await done(tx);
  db.close();
}
