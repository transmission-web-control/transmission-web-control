import * as lo from 'lodash-es';

import i18nManifest from './i18n.json';
import enLocal from './i18n/en.json';
import { getUserLang } from './lib/utils.ts';

export const i18n = import.meta.glob('./i18n/*.json', { eager: true });

const messages = Object.fromEntries(
  Object.keys(i18nManifest).map((key) => {
    key = key.replace('-', '_');
    return [key, i18n[`./i18n/${key}.json`]];
  }),
);

export const lang: typeof enLocal = lo.merge(enLocal, messages[getUserLang()]);
