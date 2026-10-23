import { useCallback, useEffect, useRef, useState } from 'react';
import { loadAll, saveAll } from './db';
import { dayKey } from './dates';
import { addNode, newId, removeNode, rescheduleOverdue, toggleDone, updateNode } from './tree';
import type { Node } from './types';

function defaultGoal(): Node {
  return {
    id: newId(),
    parentId: null,
    title: 'Inbox',
    done: false,
    day: dayKey(),
    order: 0,
    priority: 0,
    createdAt: Date.now(),
  };
}

export function useLedger() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState(dayKey());
  const [saveError, setSaveError] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    loadAll()
      .then((stored) => setNodes(stored.length ? stored : [defaultGoal()]))
      .catch(() => {
        setNodes([defaultGoal()]);
        setSaveError('Saving is unavailable in this browser. Tasks will be lost when you close the tab.');
      })
      .finally(() => {
        loaded.current = true;
        setReady(true);
      });
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    saveAll(nodes).then(
      () => setSaveError(null),
      () => setSaveError('Could not save your latest change. Export a backup to be safe.'),
    );
  }, [nodes]);

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

  const addGoal = useCallback((title: string) => setNodes((n) => addNode(n, { title, parentId: null, day: today })), [today]);
  const add = useCallback(
    (title: string, parentId: string) => setNodes((n) => addNode(n, { title, parentId, day: today })),
    [today],
  );
  const toggle = useCallback((id: string) => setNodes((n) => toggleDone(n, id)), []);
  const remove = useCallback((id: string) => setNodes((n) => removeNode(n, id)), []);
  const patch = useCallback((id: string, p: Partial<Node>) => setNodes((n) => updateNode(n, id, p)), []);
  const moveOverdueToToday = useCallback(() => setNodes((n) => rescheduleOverdue(n, today)), [today]);
  const replaceAll = useCallback((next: Node[]) => setNodes(next.length ? next : [defaultGoal()]), []);

  return { nodes, ready, today, saveError, addGoal, add, toggle, remove, patch, moveOverdueToToday, replaceAll };
}

export type Ledger = ReturnType<typeof useLedger>;
