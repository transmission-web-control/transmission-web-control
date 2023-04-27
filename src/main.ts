import './app.ts';
import './index.css';

import UAParser from 'ua-parser-js';

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

const { device } = UAParser(navigator.userAgent);

const nonpc: Array<string | unknown> = [
  'console',
  'mobile',
  'tablet',
  'smarttv',
  'wearable',
  'embedded',
];
if (nonpc.includes(device.type) && getQueryString('devicetype') !== 'computer') {
  location.href = 'index.mobile.html';
}
