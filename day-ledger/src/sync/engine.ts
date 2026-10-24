import { docTime, fromDocs, mergeStates, toDocs } from './merge';
import type { RemoteDoc, SyncState } from './types';

/** The only thing the engine needs from a cloud database. */
export interface Backend {
  /** Calls `onDocs` with the complete remote set now and after every remote change. Returns an unsubscribe function. */
  subscribe(onDocs: (docs: RemoteDoc[]) => void, onError: (e: Error) => void): () => void;
  push(docs: RemoteDoc[]): Promise<void>;
  deleteAll(): Promise<void>;
}

export type SyncStatus = 'syncing' | 'synced' | 'offline' | 'error';

export interface EngineOptions {
  /** Receives the merged state and returns what the app actually kept (it may repair it). */
  apply: (merged: SyncState) => SyncState;
  onStatus: (status: SyncStatus, info?: { at?: number; message?: string }) => void;
  debounceMs?: number;
  retryMs?: number;
  now?: () => number;
}

/**
 * Keeps one device's list and the cloud copy equal.
 * Remote documents are merged into the local state, and anything the cloud lacks or has an older version of is pushed.
 */
export class SyncEngine {
  private local: SyncState = { nodes: [], tombs: [] };
  /** Version (updatedAt) of each document as last seen in, or written to, the cloud. */
  private known = new Map<string, number>();
  private unsubscribe: (() => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private ready = false;
  private running = false;

  constructor(
    private backend: Backend,
    private opts: EngineOptions,
  ) {}

  start(initial: SyncState) {
    this.local = initial;
    this.running = true;
    this.ready = false;
    this.opts.onStatus('syncing');
    this.unsubscribe = this.backend.subscribe(
      (docs) => this.onRemote(docs),
      (e) => this.fail(e),
    );
  }

  stop() {
    this.running = false;
    this.unsubscribe?.();
    this.unsubscribe = null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  /** Call whenever the app's list changes. */
  setLocal(state: SyncState) {
    this.local = state;
    if (this.running && this.ready) this.schedule(this.opts.debounceMs ?? 800);
  }

  syncNow(): Promise<void> {
    return this.flush();
  }

  private now() {
    return (this.opts.now ?? Date.now)();
  }

  private onRemote(docs: RemoteDoc[]) {
    if (!this.running) return;
    this.known = new Map(docs.map((d) => [d.id, docTime(d)]));
    const { state, changed } = mergeStates(this.local, fromDocs(docs), this.now());
    if (changed) this.local = this.opts.apply(state);
    this.ready = true;
    void this.flush();
  }

  private schedule(ms: number) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), ms);
  }

  private async flush() {
    if (!this.running || !this.ready) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const dirty = toDocs(this.local).filter((d) => docTime(d) > (this.known.get(d.id) ?? -1));
    if (dirty.length === 0) {
      this.opts.onStatus('synced', { at: this.now() });
      return;
    }
    this.opts.onStatus('syncing');
    try {
      await this.backend.push(dirty);
      for (const d of dirty) this.known.set(d.id, Math.max(docTime(d), this.known.get(d.id) ?? -1));
      if (!this.running) return;
      this.opts.onStatus('synced', { at: this.now() });
      // Edits made while the push was in flight.
      if (toDocs(this.local).some((d) => docTime(d) > (this.known.get(d.id) ?? -1))) this.schedule(this.opts.debounceMs ?? 800);
    } catch (e) {
      this.fail(e as Error, true);
    }
  }

  private fail(e: Error, retry = false) {
    if (!this.running) return;
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    this.opts.onStatus(offline ? 'offline' : 'error', { message: e.message });
    if (retry) this.schedule(this.opts.retryMs ?? 10_000);
  }
}
