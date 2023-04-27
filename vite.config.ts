import { defineConfig } from 'vite';

import { version } from './package.json';

const TRANSMISSION_RPC = process.env.TRANSMISSION_RPC || 'http://192.168.1.3:9091/transmission/rpc';

export default defineConfig(({ mode }) => {
  return {
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
    plugins: [],
    css: {},
    define: {
      'import.meta.env.__APP_VERSION__': JSON.stringify(version),
    },
  };
});
