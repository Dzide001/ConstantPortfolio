import { expect, it } from 'vitest';
import { loadAll, saveAll } from './db';
import { addNode } from './tree';

it('persists and reloads the list', async () => {
  const nodes = addNode([], { title: 'Saved', parentId: null, day: '2026-10-23' });
  await saveAll(nodes);
  expect(await loadAll()).toEqual(nodes);
  await saveAll([]);
  expect(await loadAll()).toEqual([]);
});
