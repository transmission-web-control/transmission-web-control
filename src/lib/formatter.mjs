export function formatLongTime(time, formatString) {
  const now = new Date(parseInt(time) * 1000);
  return formatDate(now);
}

export function formatDate(formatDate, formatString) {
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
    const yy = yyyy.toString().slice(2);
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

// Get the cumulative time
export function getTotalTime(time, format) {
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
  } else {
    result = result.replace('%d', days);
  }

  if (hours === 0) {
    result = result.replace(/(%h+\s)/, '');
  } else {
    result = result.replace('%h', hours);
  }

  if (minutes === 0) {
    result = result.replace(/(%m+\s)/, '');
  } else {
    result = result.replace('%m', minutes);
  }

  if (seconds === 0) {
    result = result.replace(/(%s+\s)/, '');
  } else {
    result = result.replace('%s', seconds);
  }
  return result;
}

/**
 * 根据指定的十六进制颜色值，返回RGB颜色数值
 */
export function getRGB(s) {
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
export function getGrayLevel(color) {
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
