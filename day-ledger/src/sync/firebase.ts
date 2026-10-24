import type { Backend } from './engine';
import type { RemoteDoc } from './types';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

const env = import.meta.env;
export const FIREBASE_CONFIG: FirebaseConfig | null =
  env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_AUTH_DOMAIN && env.VITE_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_APP_ID
    ? {
        apiKey: env.VITE_FIREBASE_API_KEY,
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: env.VITE_FIREBASE_PROJECT_ID,
        appId: env.VITE_FIREBASE_APP_ID,
      }
    : null;

export const isSyncConfigured = () => FIREBASE_CONFIG !== null;

const FLAG = 'day-ledger:sync';
export function wasSignedIn(): boolean {
  try {
    return localStorage.getItem(FLAG) === '1';
  } catch {
    return false;
  }
}
function setFlag(on: boolean) {
  try {
    if (on) localStorage.setItem(FLAG, '1');
    else localStorage.removeItem(FLAG);
  } catch {
    /* the user signs in by hand next time */
  }
}

export interface SyncUser {
  uid: string;
  email: string | null;
  name: string | null;
}

export interface FirebaseHandle {
  /** Calls back now and on every sign-in or sign-out. Returns an unsubscribe function. */
  onUser(cb: (user: SyncUser | null) => void): () => void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  backendFor(uid: string): Backend;
}

const BATCH = 400; // Firestore allows 500 writes per batch

let handle: Promise<FirebaseHandle> | null = null;

/** Loads the Firebase SDK on first use, so people who never sign in do not download it. */
export function loadFirebase(): Promise<FirebaseHandle> {
  handle ??= create().catch((e) => {
    handle = null;
    throw e;
  });
  return handle;
}

async function create(): Promise<FirebaseHandle> {
  if (!FIREBASE_CONFIG) throw new Error('Sync is not set up.');
  const [{ initializeApp }, auth, fs] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ]);
  const app = initializeApp(FIREBASE_CONFIG);
  const fbAuth = auth.getAuth(app);
  const db = fs.initializeFirestore(app, { ignoreUndefinedProperties: true });

  return {
    onUser(cb) {
      return auth.onAuthStateChanged(fbAuth, (u) =>
        cb(u ? { uid: u.uid, email: u.email, name: u.displayName } : null),
      );
    },
    async signIn() {
      await auth.signInWithPopup(fbAuth, new auth.GoogleAuthProvider());
      setFlag(true);
    },
    async signOut() {
      setFlag(false);
      await auth.signOut(fbAuth);
    },
    backendFor: (uid) => firestoreBackend(fs, db, uid),
  };
}

type Firestore = typeof import('firebase/firestore');

/** Stores each node as users/{uid}/nodes/{id}. Exported separately so it can be tested against the emulator. */
export function firestoreBackend(fs: Firestore, db: import('firebase/firestore').Firestore, uid: string): Backend {
  const col = fs.collection(db, 'users', uid, 'nodes');
  const chunks = <T,>(items: T[]) =>
    Array.from({ length: Math.ceil(items.length / BATCH) }, (_, i) => items.slice(i * BATCH, (i + 1) * BATCH));
  return {
    subscribe(onDocs, onError) {
      return fs.onSnapshot(
        col,
        (snap) => onDocs(snap.docs.map((d) => d.data() as RemoteDoc)),
        (e) => onError(e),
      );
    },
    async push(docs) {
      for (const group of chunks(docs)) {
        const batch = fs.writeBatch(db);
        for (const d of group) batch.set(fs.doc(col, d.id), d);
        await batch.commit();
      }
    },
    async deleteAll() {
      const snap = await fs.getDocs(col);
      for (const group of chunks(snap.docs)) {
        const batch = fs.writeBatch(db);
        group.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    },
  };
}
