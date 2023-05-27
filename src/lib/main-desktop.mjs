import '../style/iconfont/iconfont.css';

import ClipboardJS from 'clipboard';
import * as lo from 'lodash-es';

import { events } from './events';
import { getGrayLevel, getHoursFromMinutes } from './formatter';
import { loadFileContent } from './loadFileContent.mjs';
import { saveFileAs } from './saveFileAs.mjs';
import { System } from './system.js';
import { transmission } from './transmission';
import { formatSize, getMinutesFromHours, getQueryString, getUserLang } from './utils';

const system = new System();

// used in templates
globalThis.events = events;
globalThis.uniq = lo.uniq;
globalThis.transmission = transmission;
globalThis.system = system;
globalThis.saveFileAs = saveFileAs;
globalThis.loadFileContent = loadFileContent;
globalThis.formatSize = formatSize;
globalThis.getHoursFromMinutes = getHoursFromMinutes;
globalThis.getMinutesFromHours = getMinutesFromHours;
globalThis.ClipboardJS = ClipboardJS;
globalThis.getGrayLevel = getGrayLevel;

// jQuery Extended
(function ($) {
  // Fade in and out
  $.fn.fadeInAndOut = function (speed, easing, fn) {
    var options = {
      speed,
      easing,
      fn,
    };
    $.extend(options, $.fn.fadeInAndOut.defaults);
    this.fadeIn(options.speed)
      .delay(options.speed)
      .fadeOut(options.speed, options.easing, options.fn);
  };

  // Plugin defaults
  $.fn.fadeInAndOut.defaults = {
    speed: 1000,
    easing: 'swing',
    fn: null,
  };
})(jQuery);

$(document).ready(function () {
  // Loads a list of available languages
  system.init(getUserLang(), getQueryString('local'));
});

onunhandledrejection = (event) => {
  console.error(`onunhandledrejection ${event}`);
};
