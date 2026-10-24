import { useCallback, useEffect, useRef, useState } from 'react';
import { loadAll, saveAll } from './db';
import { dayKey } from './dates';
import { stamp } from './sync/merge';
import type { SyncState } from './sync/types';
import { addNode, removeNode, repairCompletion, rescheduleOverdue, toggleDone, updateNode } from './tree';
import type { Node } from './types';

/** Same id on every device, so signing in on a second device does not create a second Inbox. */
export const INBOX_ID = 'inbox';

function defaultGoal(): Node {
  return {
    id: INBOX_ID,
    parentId: null,
    title: 'Inbox',
    done: false,
    day: dayKey(),
    order: 0,
    priority: 0,
    createdAt: 0,
    updatedAt: 0,
  };
}

const EMPTY: SyncState = { nodes: [], tombs: [] };

export function useLedger() {
  // The ref is the source of truth so sync can read and write it between renders; state only triggers re-rendering.
  const ref = useRef<SyncState>(EMPTY);
  const [data, setData] = useState<SyncState>(EMPTY);
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState(dayKey());
  const [saveError, setSaveError] = useState<string | null>(null);
  const loaded = useRef(false);

  const set = useCallback((next: SyncState) => {
    ref.current = next;
    setData(next);
  }, []);

  useEffect(() => {
    loadAll()
      .then((stored) => set(stored.nodes.length ? stored : { nodes: [defaultGoal()], tombs: stored.tombs }))
      .catch(() => {
        set({ nodes: [defaultGoal()], tombs: [] });
        setSaveError('Saving is unavailable in this browser. Tasks will be lost when you close the tab.');
      })
      .finally(() => {
        loaded.current = true;
        setReady(true);
      });
  }, [set]);

  useEffect(() => {
    if (!loaded.current) return;
    saveAll(data).then(
      () => setSaveError(null),
      () => setSaveError('Could not save your latest change. Export a backup to be safe.'),
    );
  }, [data]);

  // Roll "today" over at midnight, and when the app returns to the foreground.
  useEffect(() => {
    const tick = () => setToday(dayKey());
    const id = setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  /** Applies an edit to the node list and records what changed (updatedAt, tombstones). */
  const commit = useCallback(
    (edit: (nodes: Node[]) => Node[]) => set(stamp(ref.current, edit(ref.current.nodes), Date.now())),
    [set],
  );

  /** Takes a merged state from sync. Repairs made here count as local edits so they sync back. */
  const applyRemote = useCallback(
    (merged: SyncState): SyncState => {
      const repaired = stamp(merged, repairCompletion(merged.nodes), Date.now());
      const next = { nodes: repaired.nodes.length ? repaired.nodes : [defaultGoal()], tombs: [...merged.tombs, ...repaired.tombs] };
      set(next);
      return next;
    },
    [set],
  );

  const addGoal = useCallback((title: string) => commit((n) => addNode(n, { title, parentId: null, day: today })), [commit, today]);
  const add = useCallback(
    (title: string, parentId: string) => commit((n) => addNode(n, { title, parentId, day: today })),
    [commit, today],
  );
  const toggle = useCallback((id: string) => commit((n) => toggleDone(n, id)), [commit]);
  const remove = useCallback((id: string) => commit((n) => removeNode(n, id)), [commit]);
  const patch = useCallback((id: string, p: Partial<Node>) => commit((n) => updateNode(n, id, p)), [commit]);
  const moveOverdueToToday = useCallback(() => commit((n) => rescheduleOverdue(n, today)), [commit, today]);
  const replaceAll = useCallback((next: Node[]) => commit(() => (next.length ? next : [defaultGoal()])), [commit]);

  return {
    nodes: data.nodes,
    data,
    ready,
    today,
    saveError,
    addGoal,
    add,
    toggle,
    remove,
    patch,
    moveOverdueToToday,
    replaceAll,
    applyRemote,
  };
}

export type Ledger = ReturnType<typeof useLedger>;
