export type NotifyState = 'unsupported' | 'default' | 'granted' | 'denied';

export function notifyState(): NotifyState {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

/** Must be called from a click. Returns the resulting state. */
export async function requestNotify(): Promise<NotifyState> {
  if (typeof Notification === 'undefined') return 'unsupported';
  await Notification.requestPermission();
  return notifyState();
}

/**
 * Shows a system notification. Goes through the service worker when there is one,
 * because phones refuse `new Notification()` from a page.
 */
export async function showNotification(title: string, body: string, tag: string): Promise<void> {
  if (notifyState() !== 'granted') return;
  const options = { body, tag, icon: 'icon-192.png', badge: 'icon-192.png' };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) return await reg.showNotification(title, options);
    new Notification(title, options);
  } catch {
    /* the in-app banner is still shown */
  }
}
