import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, CalendarApi, type CalEvent } from './api';
import { getToken, isConfigured, signIn, signInQuietly, signOut, wasConnected } from './auth';
import type { Ledger } from '../useLedger';
import type { Node } from '../types';

export type CalStatus = 'unconfigured' | 'disconnected' | 'connecting' | 'connected';

const signature = (n: Node) => JSON.stringify([n.title, n.day, n.start, n.minutes]);
const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong with Google Calendar.');

export function useCalendar(ledger: Ledger) {
  const { nodes, today, patch } = ledger;
  const [status, setStatus] = useState<CalStatus>(isConfigured() ? 'disconnected' : 'unconfigured');
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const api = useMemo(() => new CalendarApi(getToken), []);
  const synced = useRef(new Map<string, string>());

  const fail = useCallback((e: unknown) => {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      setStatus('disconnected');
      setEvents([]);
      setError('Google Calendar access ended. Connect again to continue.');
    } else {
      setError(message(e));
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      setEvents(await api.listDay(today));
      setError(null);
    } catch (e) {
      fail(e);
    }
  }, [api, today, fail]);

  const connect = useCallback(async () => {
    setStatus('connecting');
    setError(null);
    try {
      await signIn();
      setStatus('connected');
    } catch (e) {
      setStatus('disconnected');
      setError(message(e));
    }
  }, []);

  const disconnect = useCallback(() => {
    signOut();
    synced.current.clear();
    setEvents([]);
    setError(null);
    setStatus('disconnected');
  }, []);

  // Pick up an earlier grant without a click. Browsers may block the popup, in which case the user taps Connect.
  useEffect(() => {
    if (!isConfigured() || !wasConnected()) return;
    setStatus('connecting');
    signInQuietly().then(
      () => setStatus('connected'),
      () => setStatus('disconnected'),
    );
  }, []);

  useEffect(() => {
    if (status !== 'connected') return;
    refresh();
    const id = setInterval(refresh, 5 * 60_000);
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [status, refresh]);

  // Keep linked calendar events in step with edits to their tasks.
  useEffect(() => {
    if (status !== 'connected') return;
    for (const n of nodes) {
      if (!n.eventId) continue;
      const sig = signature(n);
      const prev = synced.current.get(n.id);
      synced.current.set(n.id, sig);
      if (prev === undefined || prev === sig) continue;
      const eventId = n.eventId;
      const job = n.start
        ? api.update(eventId, { title: n.title, day: n.day, start: n.start, minutes: n.minutes ?? 30 })
        : api.remove(eventId).then(() => patch(n.id, { eventId: undefined }));
      job.then(refresh, fail);
    }
  }, [nodes, status, api, patch, refresh, fail]);

  const addTask = useCallback(
    async (n: Node) => {
      if (!n.start) return;
      try {
        const eventId = await api.create({ title: n.title, day: n.day, start: n.start, minutes: n.minutes ?? 30 });
        synced.current.set(n.id, signature(n));
        patch(n.id, { eventId });
        await refresh();
      } catch (e) {
        fail(e);
      }
    },
    [api, patch, refresh, fail],
  );

  const removeTask = useCallback(
    async (n: Node) => {
      if (!n.eventId) return;
      synced.current.delete(n.id);
      try {
        await api.remove(n.eventId);
        await refresh();
      } catch (e) {
        fail(e);
      }
    },
    [api, refresh, fail],
  );

  const unlinkTask = useCallback(
    async (n: Node) => {
      await removeTask(n);
      patch(n.id, { eventId: undefined });
    },
    [removeTask, patch],
  );

  return { status, events, error, connect, disconnect, refresh, addTask, removeTask, unlinkTask };
}

export type Calendar = ReturnType<typeof useCalendar>;
