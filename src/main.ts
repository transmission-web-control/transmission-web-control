import './app.ts';

// @ts-expect-error
import { System } from './lib/system.js';
import { transmission } from './lib/transmission';
import { getQueryString, getUserLang } from './lib/utils';

const system = new System();

// @ts-expect-error
globalThis.transmission = transmission;
// @ts-expect-error
globalThis.system = system;

$(document).ready(function () {
  // Loads a list of available languages
  system.init(getUserLang(), getQueryString('local'));
});
