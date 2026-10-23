import type { Node } from './types';

const DB_NAME = 'day-ledger';
const STORE = 'nodes';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
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

export async function loadAll(): Promise<Node[]> {
  const db = await open();
  const req = db.transaction(STORE).objectStore(STORE).getAll();
  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      db.close();
      resolve(req.result as Node[]);
    };
    req.onerror = () => reject(req.error);
  });
}

/** Replaces the stored list in one transaction. Personal task lists are small, so this stays simple. */
export async function saveAll(nodes: Node[]): Promise<void> {
  const db = await open();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  store.clear();
  nodes.forEach((n) => store.put(n));
  await done(tx);
  db.close();
}
