import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

import { version } from './package.json';

const TRANSMISSION_RPC = process.env.TRANSMISSION_RPC || 'http://192.168.1.3:9091/transmission/rpc';

export default defineConfig(({ mode }) => {
  return {
    root: 'src',
    base: './',
    publicDir: '../public/',
    build: {
      outDir: '../dist',
      rollupOptions: {
        input: {
          main: fileURLToPath(new URL('./src/index.html', import.meta.url)),
          mobile: fileURLToPath(new URL('./src/index.mobile.html', import.meta.url)),
        },
      },
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
    plugins: [vue()],
    css: {},
    define: {
      'import.meta.env.__APP_VERSION__': JSON.stringify(version),
    },
  };
});
