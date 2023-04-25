import 'reset-css';
import './index.css';
import './iconfont/iconfont.css';

import { createApp } from 'vue';
import { createI18n } from 'vue-i18n';

import app from './app.vue';
import i18nManifest from './i18n.json';
import enLocal from './i18n/en.json';
import { transmission } from './lib/transmission';
import { getUserLang } from './lib/utils';
import { router } from './routes';
import { pinia, useServerInfoStore } from './state';

export const i18n = import.meta.glob('./i18n/*.json', { eager: true });

const messages = {
  'en-US': enLocal,
  ...Object.fromEntries(
    Object.keys(i18nManifest).map((key) => {
      key = key.replace('-', '_');
      return [key, i18n[`./i18n/${key}.json`]];
    }),
  ),
};

async function main() {
  try {
    await transmission.init();
  } catch (e) {
    document.body.innerHTML = 'failed to connect transmission server';
    return;
  }

  transmission.getSession().then(
    (data) => {
      if (data.result == 'success') {
        const state = data.arguments;
        useServerInfoStore().setInfo({ version: state.version, rpc: state['rpc-version'] });
      }
    },
    (err) => {
      console.error('failed to get session', err);
    },
  );

  createApp(app)
    .use(
      createI18n({
        locale: getUserLang(),
        fallbackLocale: 'en',
        messages,
      }),
    )
    .use(router)
    .use(pinia)
    .mount('#app');
}

await main();
