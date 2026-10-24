import { useState } from 'react';
import { notifyState, requestNotify } from '../notifications';

const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const INSTALLED = window.matchMedia?.('(display-mode: standalone)').matches;

export function AlertsToggle() {
  const [state, setState] = useState(notifyState());

  if (state === 'unsupported' || (IOS && !INSTALLED)) {
    return (
      <p className="notehint">
        {IOS && !INSTALLED
          ? 'On iPhone, add Day Ledger to your Home Screen to get alerts.'
          : 'This browser does not support notifications. Reminders still show inside the app.'}
      </p>
    );
  }
  if (state === 'granted') return <span className="chip"><i className="dot" />Alerts on while the app is open</span>;
  if (state === 'denied') {
    return <p className="notehint">Notifications are blocked. Allow them in your browser's site settings to get alerts.</p>;
  }
  return (
    <button type="button" className="chipbtn" onClick={async () => setState(await requestNotify())}>
      Turn on alerts
    </button>
  );
}
