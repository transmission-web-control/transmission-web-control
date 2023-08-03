import { EventEmitter } from 'eventemitter3';

import { type ProcessedTorrent } from './transmission';

export const userActions = new EventEmitter<{
  selectTorrent(index: number, t: ProcessedTorrent): void;
  onSelected(): void;
}>();

export const events = new EventEmitter<{
  userChangeTorrent(ids: Array<number | string>): void;
}>();
