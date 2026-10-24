import { useState } from 'react';
import type { Sync } from '../sync/useSync';

function ago(at: number | null): string {
  if (!at) return '';
  const s = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
}

export function SyncPanel({ sync }: { sync: Sync }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const { status, user, error } = sync;

  if (status === 'unconfigured') return null;

  if (status === 'signed-out' || status === 'connecting') {
    return (
      <div className="syncwrap">
        <button type="button" className="chipbtn" onClick={sync.signIn} disabled={status === 'connecting'}>
          {status === 'connecting' ? 'Connecting…' : 'Sign in to sync devices'}
        </button>
        {error && <p className="notehint calerr" role="alert">{error}</p>}
      </div>
    );
  }

  const label =
    status === 'syncing'
      ? 'Syncing…'
      : status === 'offline'
        ? 'Offline. Will sync when back online'
        : status === 'error'
          ? 'Sync problem'
          : `Synced ${ago(sync.lastAt)}`;

  return (
    <div className="syncwrap">
      <button
        type="button"
        className={`chip chipmenu ${status === 'error' ? 'bad' : ''}`}
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          setConfirm(false);
        }}
      >
        <i className={`dot ${status === 'synced' ? '' : status === 'syncing' ? 'busy' : 'off'}`} />
        {label}
      </button>
      {open && (
        <div className="syncmenu">
          <p>
            Signed in as <b>{user?.email ?? user?.name ?? 'your Google account'}</b>. Your tasks sync across every device signed in to this account.
          </p>
          <div className="syncbtns">
            <button type="button" onClick={() => void sync.syncNow()}>
              Sync now
            </button>
            <button type="button" onClick={() => void sync.signOut()}>
              Sign out
            </button>
            {confirm ? (
              <button type="button" className="danger" onClick={() => void sync.deleteCloud()}>
                Confirm: delete cloud copy
              </button>
            ) : (
              <button type="button" onClick={() => setConfirm(true)}>
                Delete cloud copy
              </button>
            )}
          </div>
          {confirm && (
            <p className="hint">
              This removes your synced tasks from the cloud and signs you out here. Tasks on this device stay. Sign out of other devices first, or they will upload their copy again.
            </p>
          )}
        </div>
      )}
      {error && (
        <p className="notehint calerr" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
