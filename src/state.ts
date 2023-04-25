import { createPinia, defineStore } from 'pinia';

import type { Torrent } from './lib/transmission';

export const pinia = createPinia();

export const useServerInfoStore = defineStore('serverInfo', {
  state: () => ({ version: 'unknown', rpc: 0 }),
  actions: {
    setInfo(v: { version: string; rpc: number }) {
      this.version = v.version;
      this.rpc = v.rpc;
    },
  },
});

export const useTorrentListStore = defineStore('torrentList', {
  state: () => ({ torrents: [] as Torrent[] }),
  actions: {
    setValue(torrents: Torrent[]) {
      this.torrents = torrents;
    },
  },
});

export const useUserConfigStore = defineStore('userConfig', {
  state: () => ({
    page: 30,
    fields: [
      { field: 'name', width: 100 },
      { field: 'totalSize', width: 80 },
      { field: 'totalSize', width: 100 },
    ] as Array<{ field: string; width: number }>,
  }),
  actions: {
    setPagination(v: number) {
      this.page = v;
    },
  },
});
