import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateDataset } from './dataset-generator';

describe('dataset generator', () => {
  it('is deterministic and includes the three cities', async () => {
    const first = await mkdtemp(join(tmpdir(), 'kuri-generator-first-'));
    const second = await mkdtemp(join(tmpdir(), 'kuri-generator-second-'));
    try {
      await generateDataset(20260915, 30, first);
      await generateDataset(20260915, 30, second);
      expect(await readFile(join(first, 'events.jsonl'), 'utf8')).toBe(
        await readFile(join(second, 'events.jsonl'), 'utf8'),
      );
      const restaurants = await readFile(
        join(first, 'restaurants.json'),
        'utf8',
      );
      expect(restaurants).toContain('"BOG"');
      expect(restaurants).toContain('"MEX"');
      expect(restaurants).toContain('"LIM"');
    } finally {
      await rm(first, { recursive: true, force: true });
      await rm(second, { recursive: true, force: true });
    }
  });
});
