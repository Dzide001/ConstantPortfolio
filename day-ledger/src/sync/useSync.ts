import { useCallback, useEffect, useRef, useState } from 'react';
import { setHint } from '../calendar/auth';
import type { Ledger } from '../useLedger';
import { SyncEngine, type SyncStatus } from './engine';
import { isSyncConfigured, loadFirebase, wasSignedIn, type FirebaseHandle, type SyncUser } from './firebase';

function signInMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case 'auth/popup-blocked':
      return 'The sign-in window was blocked. Allow pop-ups and try again.';
    case 'auth/unauthorized-domain':
      return 'This web address is not allowed to sign in. Add it under Firebase Authentication, Settings, Authorized domains.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not turned on in your Firebase project.';
    case 'auth/network-request-failed':
    case 'auth/internal-error':
      return 'Could not reach Google sign-in. Check your connection and your Firebase settings.';
    default:
      return fallback;
  }
}

export type SyncUiStatus = 'unconfigured' | 'signed-out' | 'connecting' | SyncStatus;

export function useSync(ledger: Ledger) {
  const { data, ready, applyRemote } = ledger;
  const configured = isSyncConfigured();
  const [user, setUser] = useState<SyncUser | null>(null);
  const [connecting, setConnecting] = useState(configured && wasSignedIn());
  const [engineStatus, setEngineStatus] = useState<SyncStatus>('syncing');
  const [lastAt, setLastAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fb = useRef<FirebaseHandle | null>(null);
  const engine = useRef<SyncEngine | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  // Restore a previous session. The SDK is only downloaded if the person has signed in before.
  useEffect(() => {
    if (!configured || !wasSignedIn()) return;
    let off = () => {};
    loadFirebase().then(
      (h) => {
        fb.current = h;
        off = h.onUser((u) => {
          setUser(u);
          setConnecting(false);
        });
      },
      (e) => {
        setConnecting(false);
        setError(e.message);
      },
    );
    return () => off();
  }, [configured]);

  // Run the sync engine while signed in and the local list has loaded.
  useEffect(() => {
    if (!user || !ready || !fb.current) return;
    setHint(user.email ?? undefined);
    const e = new SyncEngine(fb.current.backendFor(user.uid), {
      apply: applyRemote,
      onStatus: (s, info) => {
        setEngineStatus(s);
        if (info?.at) setLastAt(info.at);
        setError(s === 'error' || s === 'offline' ? (info?.message ?? null) : null);
      },
    });
    engine.current = e;
    e.start(dataRef.current);
    return () => {
      e.stop();
      engine.current = null;
    };
  }, [user, ready, applyRemote]);

  useEffect(() => {
    engine.current?.setLocal(data);
  }, [data]);

  useEffect(() => {
    const online = () => void engine.current?.syncNow();
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    setConnecting(true);
    try {
      const h = fb.current ?? (await loadFirebase());
      if (!fb.current) {
        fb.current = h;
        h.onUser((u) => {
          setUser(u);
          setConnecting(false);
        });
      }
      await h.signIn();
    } catch (e) {
      setConnecting(false);
      const code = (e as { code?: string }).code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      setError(signInMessage(code, (e as Error).message));
    }
  }, []);

  const signOut = useCallback(async () => {
    engine.current?.stop();
    await fb.current?.signOut();
    setUser(null);
  }, []);

  /** Removes this account's data from the cloud and signs out. Data on this device stays. */
  const deleteCloud = useCallback(async () => {
    if (!user || !fb.current) return;
    engine.current?.stop();
    try {
      await fb.current.backendFor(user.uid).deleteAll();
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    await signOut();
  }, [user, signOut]);

  const status: SyncUiStatus = !configured ? 'unconfigured' : connecting ? 'connecting' : !user ? 'signed-out' : engineStatus;

  return { status, user, lastAt, error, signIn, signOut, deleteCloud, syncNow: () => engine.current?.syncNow() };
}

export type Sync = ReturnType<typeof useSync>;
