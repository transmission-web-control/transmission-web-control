import { EventEmitter } from 'eventemitter3';

export const userActions = new EventEmitter<{
  selectTorrent(id: number): void;
}>();
