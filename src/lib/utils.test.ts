import { expect, test } from 'vitest';

import { formatBytes, getMinutesFromHours } from './utils';

test('formatBytes', () => {
  expect(formatBytes(100)).toMatchInlineSnapshot('"100 B"');
  expect(formatBytes(1024)).toMatchInlineSnapshot('"1.02 KB"');
  expect(formatBytes(4 * 1000 * 1000)).toMatchInlineSnapshot('"4 MB"');
  expect(formatBytes(4 * 1000 * 1000 * 1000)).toMatchInlineSnapshot('"4 GB"');
  expect(formatBytes(4 * 1000 * 1000 * 1000 * 1000)).toMatchInlineSnapshot('"4 TB"');
  expect(formatBytes(4 * 1000 * 1000 * 1000 * 1000 * 1000 * 1000)).toMatchInlineSnapshot('"4 EB"');
  expect(formatBytes(4 * 1000 * 1000 * 1000 * 1000 * 1000 * 1000 * 1000)).toMatchInlineSnapshot(
    '"4 ZB"',
  );
  expect(
    formatBytes(4 * 1000 * 1000 * 1000 * 1000 * 1000 * 1000 * 1000 * 1000 * 1000),
  ).toMatchInlineSnapshot('"4.00 YB"');
  expect(
    formatBytes(4 * 1000 * 1000 * 1000 * 1000 * 1000 * 1000 * 1000 * 1000 * 1000),
  ).toMatchInlineSnapshot('"4.00 YB"');
  expect(
    formatBytes(1000 * 4.2002 * 1000 * 1000 * 1000 * 1000 * 1000 * 1000 * 1000 * 1000 * 1000),
  ).toMatchInlineSnapshot('"4200.20 YB"');
});

test('getMinutesFromHours', () => {
  expect(getMinutesFromHours('10:20')).toMatchInlineSnapshot('620');
  expect(getMinutesFromHours('12:20')).toMatchInlineSnapshot('740');
  expect(getMinutesFromHours('00:20')).toMatchInlineSnapshot('20');
  expect(getMinutesFromHours('122:20')).toMatchInlineSnapshot('7340');
  expect(getMinutesFromHours('1:01')).toMatchInlineSnapshot('61');
});
