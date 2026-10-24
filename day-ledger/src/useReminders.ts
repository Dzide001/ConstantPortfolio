import { useCallback, useEffect, useRef, useState } from 'react';
import { showNotification } from './notifications';
import { SNOOZE_MINUTES, dueReminders, leadLabel, reminderKey, startDate, type ReminderState } from './reminders';
import type { Ledger } from './useLedger';

const STORE = 'day-ledger:reminders';

function load(): ReminderState {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) ?? '');
    return { fired: Array.isArray(raw.fired) ? raw.fired : [], snoozed: raw.snoozed ?? {} };
  } catch {
    return { fired: [], snoozed: {} };
  }
}

function save(state: ReminderState) {
  try {
    localStorage.setItem(STORE, JSON.stringify(state));
  } catch {
    /* without storage a reload may repeat a reminder, which is harmless */
  }
}

export interface Alert {
  key: string;
  taskId: string;
}

/** In-app reminders. They only run while the app is open; Google Calendar covers the rest. */
export function useReminders(ledger: Ledger) {
  const { nodes, patch, toggle } = ledger;
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [, setTick] = useState(0); // re-render so "starts in N min" stays current
  const state = useRef<ReminderState>(load());
  const latest = useRef(nodes);
  latest.current = nodes;

  const check = useCallback(() => {
    const now = new Date();
    const due = dueReminders(latest.current, now, state.current);
    if (due.length === 0) return;
    // Forget keys for slots that have passed their window so the stored list stays small.
    const live = new Set(latest.current.map(reminderKey));
    state.current.fired = state.current.fired.filter((k) => live.has(k));
    for (const n of due) {
      const key = reminderKey(n);
      state.current.fired.push(key);
      delete state.current.snoozed[key];
      void showNotification(n.title, `${leadLabel(n, now)} (${n.start})`, key);
    }
    save(state.current);
    setAlerts((a) => [...a, ...due.map((n) => ({ key: reminderKey(n), taskId: n.id }))]);
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(() => {
      check();
      setTick((t) => t + 1);
    }, 15_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', check);
    };
  }, [check, nodes]);

  const dismiss = useCallback((key: string) => setAlerts((a) => a.filter((x) => x.key !== key)), []);

  const snooze = useCallback(
    (key: string) => {
      state.current.fired = state.current.fired.filter((k) => k !== key);
      state.current.snoozed[key] = Date.now() + SNOOZE_MINUTES * 60_000;
      save(state.current);
      dismiss(key);
    },
    [dismiss],
  );

  const complete = useCallback(
    (a: Alert) => {
      toggle(a.taskId);
      dismiss(a.key);
    },
    [toggle, dismiss],
  );

  // Hide alerts for tasks that were finished, moved, deleted or put on Google Calendar since the reminder fired.
  const visible = alerts
    .map((a) => ({ alert: a, node: nodes.find((n) => n.id === a.taskId) }))
    .filter((x) => x.node && !x.node.done && !x.node.eventId && reminderKey(x.node) === x.alert.key);

  return {
    visible: visible.map((x) => ({ alert: x.alert, node: x.node!, label: leadLabel(x.node!, new Date()), at: startDate(x.node!) })),
    dismiss,
    snooze,
    complete,
    setLead: (id: string, lead: number | null) => patch(id, { remindMinutes: lead }),
  };
}

export type Reminders = ReturnType<typeof useReminders>;
