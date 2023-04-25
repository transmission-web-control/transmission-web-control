import $ from 'jquery';
import { createApp } from 'vue';
import { createI18n } from 'vue-i18n';

import i18nManifest from '../i18n.json';
import enLocal from '../i18n/en.json';
// @ts-expect-error
import app from './app.vue';
import { system } from './system.js';
import { getQueryString, getUserLang } from './utils';

const i18n = import.meta.glob('../i18n/*.json', { eager: true });

$(document).ready(function () {
  const lang = getUserLang();

  // Loads a list of available languages
  system.languages = i18nManifest;
  system.init(lang, getQueryString('local'));

  const messages = {
    'en-US': enLocal,
    ...Object.fromEntries(
      Object.keys(i18nManifest).map((key) => {
        key = key.replace('-', '_');
        return [key, i18n[`../i18n/${key}.json`]];
      }),
    ),
  };

  console.log(messages);

  createApp(app)
    .use(
      createI18n({
        locale: lang,
        fallbackLocale: 'en',
        messages,
      }),
    )
    .mount('#m_body');
});
