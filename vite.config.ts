import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

import { version } from './package.json';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const TRANSMISSION_RPC = process.env.TRANSMISSION_RPC || 'http://192.168.1.3:9091/transmission/rpc';

export default defineConfig(() => {
  return {
    base: './',
    build: {
      chunkSizeWarningLimit: 1024 * 1024 * 1024,
      sourcemap: true,
    },
    server: {
      proxy: {
        '/rpc': {
          target: TRANSMISSION_RPC,
          changeOrigin: true,
        },
      },
    },
    plugins: [
      vue(),
      nodePolyfills({
        exclude: [],
        protocolImports: true,
      }),
    ],
    define: {
      'import.meta.env.__APP_VERSION__': JSON.stringify(version),
    },
  };
});
