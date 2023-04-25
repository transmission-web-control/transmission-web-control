import i18nManifest from '../i18n.json';
// @ts-expect-error
import { system } from './system.js';
import { transmission } from './transmission';
import { getQueryString, getUserLang } from './utils';

globalThis.transmission = transmission;
globalThis.system = system;

$(document).ready(function () {
  // Loads a list of available languages
  system.languages = i18nManifest;
  system.init(getUserLang(), getQueryString('local'));
});
