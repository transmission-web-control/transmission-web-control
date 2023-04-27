/**
 * 根据指定的十六进制颜色值，返回RGB颜色数值
 */
function getRGB(s) {
  const reg = /^#([0-9a-f]{3}|[0-9a-f]{6})$/;
  let color = s.toLowerCase();
  if (color && reg.test(color)) {
    if (color.length === 4) {
      let sColorNew = '#';
      for (var i = 1; i < 4; i += 1) {
        sColorNew += color.slice(i, i + 1).concat(color.slice(i, i + 1));
      }
      color = sColorNew;
    }
    // 处理六位的颜色值
    const result = [];
    for (var i = 1; i < 7; i += 2) {
      result.push(parseInt('0x' + color.slice(i, i + 2)));
    }

    return {
      R: result[0],
      G: result[1],
      B: result[2],
    };
  } else {
    return s;
  }
}

/**
 * 获取一个颜色的人眼感知亮度，并以 0~1 之间的小数表示。
 * @param {*} color
 */
function getGrayLevel(color) {
  if (!color) {
    color = {
      R: 0,
      G: 0,
      B: 0,
    };
  }
  if (typeof color === 'string') {
    color = getRGB(color);
  }
  return (0.299 * color.R + 0.587 * color.G + 0.114 * color.B) / 255;
}

function getLocalTime(time) {
  return new Date(parseInt(time) * 1000)
    .toLocaleString()
    .replace(/年|月/g, '-')
    .replace(/日/g, ' ');
}

function formatLongTime(time, formatString) {
  const now = new Date(parseInt(time) * 1000);
  return formatDate(now);
}

function formatDate(formatDate, formatString) {
  if (!formatString) {
    formatString = 'yyyy-mm-dd hh:nn:ss';
  }
  if (formatDate instanceof Date) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const yyyy = formatDate.getFullYear();
    const yy = yyyy.toString().substring(2);
    const m = formatDate.getMonth() + 1;
    const mm = m < 10 ? '0' + m : m;
    const mmm = months[m];
    const d = formatDate.getDate();
    const dd = d < 10 ? '0' + d : d;

    const h = formatDate.getHours();
    const hh = h < 10 ? '0' + h : h;
    const n = formatDate.getMinutes();
    const nn = n < 10 ? '0' + n : n;
    const s = formatDate.getSeconds();
    const ss = s < 10 ? '0' + s : s;

    formatString = formatString.replace(/yyyy/i, yyyy);
    formatString = formatString.replace(/yy/i, yy);
    formatString = formatString.replace(/mmm/i, mmm);
    formatString = formatString.replace(/mm/i, mm);
    formatString = formatString.replace(/m/i, m);
    formatString = formatString.replace(/dd/i, dd);
    formatString = formatString.replace(/d/i, d);
    formatString = formatString.replace(/hh/i, hh);
    formatString = formatString.replace(/h/i, h);
    formatString = formatString.replace(/nn/i, nn);
    formatString = formatString.replace(/n/i, n);
    formatString = formatString.replace(/ss/i, ss);
    formatString = formatString.replace(/s/i, s);

    return formatString;
  } else {
    return '';
  }
}

/**
 * @param {number} bytes
 * @param {boolean} zeroToEmpty
 * @param {'speed'|undefined} type
 */
function formatSize(bytes, zeroToEmpty, type) {
  if (bytes === 0) {
    if (zeroToEmpty) {
      return '';
    }

    if (type === 'speed') {
      return '0.00 KB/s';
    } else {
      return '0.00';
    }
  }

  if (type === 'speed') {
    return formatBytes(bytes) + '/s';
  }

  return formatBytes(bytes);
}

function formatBytes(bytes, decimals) {
  const k = 1000;
  const dm = decimals || 2;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// 根据分钟获取小时
function getHoursFromMinutes(minutes) {
  return (Math.floor(minutes / 60) % 60).toString() + ':' + (minutes % 60).toString();
}

// 根据小时获取分钟
/**
 *
 * @param {string} hours
 * @return {number}
 */
function getMinutesFromHours(hours) {
  const s = hours.split(':');
  if (s.length === 1) {
    return parseInt(s[0]);
  }

  if (s.length === 2) {
    return parseInt(s[0]) * 60 + parseInt(s[1]);
  }

  if (s.length === 3) {
    return parseInt(s[0]) * 24 * 60 + parseInt(s[1]) * 60 + parseInt(s[2]);
  }

  throw new Error('failed to parse hours');
}

// Get the cumulative time
function getTotalTime(time, format) {
  // time [ms]
  if (!format) {
    format = '%dd %hh %mm %ss ';
  }
  // Calculate the difference between the number of days
  const days = Math.floor(time / (24 * 3600 * 1000));

  // Calculate the number of hours
  const leave1 = time % (24 * 3600 * 1000);
  // The number of milliseconds remaining after calculating the number of days
  const hours = Math.floor(leave1 / (3600 * 1000));

  // Calculate the number of minutes
  const leave2 = leave1 % (3600 * 1000);
  // The number of milliseconds remaining after the number of hours is counted
  const minutes = Math.floor(leave2 / (60 * 1000));

  // Calculate the number of seconds
  const leave3 = leave2 % (60 * 1000);
  // The number of milliseconds remaining after calculating the number of minutes
  const seconds = Math.round(leave3 / 1000);

  let result = format;
  if (days === 0) {
    result = result.replace(/(%d+\s)/, '');
  } else result = result.replace('%d', days);

  if (hours === 0) {
    result = result.replace(/(%h+\s)/, '');
  } else result = result.replace('%h', hours);

  if (minutes === 0) {
    result = result.replace(/(%m+\s)/, '');
  } else result = result.replace('%m', minutes);

  if (seconds === 0) {
    result = result.replace(/(%s+\s)/, '');
  } else result = result.replace('%s', seconds);
  return result;
}

// Array object sort extension
function arrayObjectSort(field, sortOrder) {
  return function (object1, object2) {
    const value1 = object1[field];
    const value2 = object2[field];
    if (value1 < value2) {
      if (sortOrder === 'desc') {
        return 1;
      } else return -1;
    } else if (value1 > value2) {
      if (sortOrder === 'desc') {
        return -1;
      } else return 1;
    } else {
      return 0;
    }
  };
}

// Generic time - sharing processing functions
function timedChunk(items, process, context, delay, callback) {
  const todo = items.concat();
  if (delay == undefined) delay = 25;

  setTimeout(function () {
    const start = +new Date();

    do {
      process.call(context, todo.shift());
    } while (todo.length > 0 && +new Date() - start < 100);

    if (todo.length > 0) {
      setTimeout(arguments.callee, delay);
    } else if (callback) {
      callback(items);
    }
  }, delay);
}

// jQuery Extended
(function ($) {
  // Fade in and out
  $.fn.fadeInAndOut = function (speed, easing, fn) {
    const options = {
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

// returns only unique values
function uniq(a) {
  const seen = {};
  return a.filter(function (item) {
    // eslint-disable-next-line no-prototype-builtins
    return seen.hasOwnProperty(item) ? false : (seen[item] = true);
  });
}

/**
 * 加载指定的文件内容
 */
function loadFileContent(fileType, callback) {
  $("<input id='file-loadContent' type='file' style='display:none;' multiple='true'/>")
    .on('change', function () {
      const fileSelector = this;
      if (fileSelector.files.length > 0 && fileSelector.files[0].name.length > 0) {
        const files = fileSelector.files;
        const count = files.length;
        let index = 0;
        const r = new FileReader();
        r.onload = function (e) {
          callback && callback.call(system, e.target.result);
          readFile();
        };
        r.onerror = function () {
          alert('文件加载失败');
          console.log('文件加载失败');
          readFile();
        };

        function readFile(file) {
          if (index == count) {
            $(fileSelector).remove();
            fileSelector.value = '';
            return;
          }
          var file = files[index];
          const lastIndex = file.name.lastIndexOf('.');
          const fix = file.name.substr(lastIndex + 1);

          index++;

          if (fileType) {
            if (fix != fileType) {
              alert('文件类型错误');
              return;
            }
          }

          r.readAsText(file);
        }

        readFile();
      }
    })
    .click();
}

/**
 * 将指定的内容保存为文件
 * @param fileName 文件名
 * @param fileData 文件内容
 */
function saveFileAs(fileName, fileData) {
  try {
    const Blob = window.Blob || window.WebKitBlob;

    // Detect availability of the Blob constructor.
    let constructor_supported = false;
    if (Blob) {
      try {
        new Blob([], {
          type: 'text/plain',
        });
        constructor_supported = true;
      } catch (_) {}
    }

    let b = null;
    if (constructor_supported) {
      b = new Blob([fileData], {
        type: 'text/plain',
      });
    } else {
      // Deprecated BlobBuilder API
      const BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder;
      const bb = new BlobBuilder();
      bb.append(fileData);
      b = bb.getBlob('text/plain');
    }

    saveAs(b, fileName);
  } catch (e) {
    console.log(e.toString());
  }
}
