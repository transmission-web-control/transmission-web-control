import { createPinia, defineStore } from 'pinia';

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
