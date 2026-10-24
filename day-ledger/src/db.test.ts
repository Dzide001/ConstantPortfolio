import { expect, it } from 'vitest';
import { loadAll, saveAll } from './db';
import { addNode } from './tree';

it('persists and reloads nodes and tombstones', async () => {
  const nodes = addNode([], { title: 'Saved', parentId: null, day: '2026-10-23' });
  const state = { nodes, tombs: [{ id: 'gone', deletedAt: 5 }] };
  await saveAll(state);
  expect(await loadAll()).toEqual(state);
  await saveAll({ nodes: [], tombs: [] });
  expect(await loadAll()).toEqual({ nodes: [], tombs: [] });
});

it('gives nodes saved before sync existed an updatedAt', async () => {
  const [n] = addNode([], { title: 'Old', parentId: null, day: '2026-10-23', now: 111 });
  const { updatedAt: _drop, ...legacy } = n;
  await saveAll({ nodes: [legacy as typeof n], tombs: [] });
  expect((await loadAll()).nodes[0].updatedAt).toBe(111);
});
