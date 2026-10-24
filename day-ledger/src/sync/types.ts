import type { Node } from '../types';

/** A deleted node. Kept so a device that was offline cannot bring the node back. */
export interface Tomb {
  id: string;
  deletedAt: number;
}

export interface SyncState {
  nodes: Node[];
  tombs: Tomb[];
}

/** What is stored per document in the cloud: a node, or a deletion marker. */
export type RemoteDoc = Node | { id: string; deleted: true; updatedAt: number };
