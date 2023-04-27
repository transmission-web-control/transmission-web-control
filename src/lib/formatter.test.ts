import { expect, test } from 'vitest';

import { formatDuration } from './formatter';

const s = 1;
const m = 60;
const h = m * 60;
const d = h * 24;
const y = d * 365;

test('formatDuration', () => {
  expect(formatDuration(1000 * (5 * s))).toMatchInlineSnapshot('"5s"');
  expect(formatDuration(1000 * (5 * m))).toMatchInlineSnapshot('"5m"');
  expect(formatDuration(1000 * (5 * m + 8 * s))).toMatchInlineSnapshot('"5m 8s"');
  expect(formatDuration(1000 * (50 * d + 5 * m + 8 * s))).toMatchInlineSnapshot('"50d 5m 8s"');
  expect(formatDuration(1000 * (2 * y + 3 * h + 5 * m))).toMatchInlineSnapshot('"2y 3h 5m"');
});
