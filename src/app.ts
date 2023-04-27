import * as lo from 'lodash-es';
import * as vue from 'vue';

import app from './components/torrent-list.vue';
import { lang } from './i18n.ts';
import type enLocal from './i18n/en.json';
import { pinia } from './state';

export const App = vue
  .createApp(app)
  .use({
    install(app) {
      app.config.globalProperties.$lang = lang;
      app.config.globalProperties.lo = lo;
    },
  })
  .use(pinia);

declare module 'vue' {
  interface Vue {
    $lang: typeof enLocal;
    lo: typeof lo;
  }
}
