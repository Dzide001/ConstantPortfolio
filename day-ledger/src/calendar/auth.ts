/**
 * Google sign-in for the browser using Google Identity Services (token model).
 * The access token lives in memory only and lasts about an hour; it is re-requested when needed.
 */
export const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ?? '';
export const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const FLAG = 'day-ledger:gcal';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

export const isConfigured = () => CLIENT_ID.length > 0;

export function wasConnected(): boolean {
  try {
    return localStorage.getItem(FLAG) === '1';
  } catch {
    return false;
  }
}

function setConnected(on: boolean) {
  try {
    if (on) localStorage.setItem(FLAG, '1');
    else localStorage.removeItem(FLAG);
  } catch {
    /* storage unavailable: the user just reconnects by hand next time */
  }
}

let gisLoading: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  gisLoading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      gisLoading = null;
      reject(new Error('Could not load Google sign-in. Check your connection.'));
    };
    document.head.appendChild(s);
  });
  return gisLoading;
}

let token: { value: string; expiresAt: number } | null = null;

function request(prompt: string | undefined): Promise<string> {
  return loadGis().then(
    () =>
      new Promise<string>((resolve, reject) => {
        const client = window.google!.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPE,
          callback: (r) => {
            if (r.error || !r.access_token) return reject(new Error(r.error_description || r.error || 'Sign-in failed.'));
            token = { value: r.access_token, expiresAt: Date.now() + (r.expires_in ?? 3600) * 1000 };
            setConnected(true);
            resolve(r.access_token);
          },
          error_callback: (e) =>
            reject(new Error(e.type === 'popup_closed' ? 'Sign-in was cancelled.' : e.message || 'Sign-in failed.')),
        });
        client.requestAccessToken(prompt === undefined ? {} : { prompt });
      }),
  );
}

/** Opens Google's consent popup. Call from a click handler. */
export const signIn = () => request(undefined);

/** Re-uses an earlier grant without showing the consent screen. May fail if the browser blocks the popup. */
export const signInQuietly = () => request('');

/** Returns a valid token, refreshing it quietly when it is about to expire. */
export async function getToken(): Promise<string> {
  if (token && token.expiresAt - Date.now() > 60_000) return token.value;
  return signInQuietly();
}

export function signOut() {
  const current = token?.value;
  token = null;
  setConnected(false);
  if (current && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(current);
}
