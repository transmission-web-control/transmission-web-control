import 'reset-css';
import 'vue-dialog-drag/dist/dialog-styles.css';

import { createApp } from 'vue';
import { createI18n } from 'vue-i18n';

import app from './app.vue';
import i18nManifest from './i18n.json';
import enLocal from './i18n/en.json';
import { getUserLang } from './lib/utils';
import { router } from './routes';

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

createApp(app)
  .use(
    createI18n({
      locale: getUserLang(),
      fallbackLocale: 'en',
      messages,
    }),
  )
  .use(router)
  .mount('#app');
