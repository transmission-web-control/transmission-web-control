import { UAParser } from 'ua-parser-js';

// @ts-expect-error
import { System } from './system.js';
import { transmission } from './transmission';
import { getQueryString, getUserLang } from './utils';

const system = new System();

globalThis.transmission = transmission;
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
