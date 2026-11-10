import { expect, test } from '@playwright/test';
import { checks } from '../scripts/check-dist.ts';

test.describe('dist', () => {
  for (const check of checks) {
    test(`AC ${check.ac} [DIST] ${check.name}`, () => {
      expect(check.run('dist')).toEqual([]);
    });
  }
});
