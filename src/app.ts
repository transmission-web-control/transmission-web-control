import * as vue from 'vue';
import { createI18n } from 'vue-i18n';

import app from './components/torrent-list.vue';
import i18nManifest from './i18n.json';
import { i18n } from './i18n.ts';
import enLocal from './i18n/en.json';
import { getUserLang } from './lib/utils';
import { pinia } from './state';

const messages = {
  'en-US': enLocal,
  ...Object.fromEntries(
    Object.keys(i18nManifest).map((key) => {
      key = key.replace('-', '_');
      return [key, i18n[`./i18n/${key}.json`]];
    }),
  ),
};

export const App = vue
  .createApp(app)
  .use(
    createI18n({
      locale: getUserLang(),
      fallbackLocale: 'en',
      messages,
    }),
  )
  .use(pinia);
