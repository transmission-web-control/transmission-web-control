import { EventEmitter } from 'eventemitter3';

import { type Torrent } from './transmission';

export const userActions = new EventEmitter<{
  selectTorrent(index: number, t: Torrent): void;
  onSelected(): void;
}>();
