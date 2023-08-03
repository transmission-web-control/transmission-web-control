import i18nManifest from '../i18n.json';

export function getQueryString(s: string): string | null {
  const u = new URLSearchParams(location.search);
  return u.get(s);
}

export function getUserLang(): string {
  const qsLang = getQueryString('lang');

  if (qsLang) {
    if (qsLang in i18nManifest) {
      return qsLang;
    }

    if (qsLang.includes('-')) {
      // Because Linux file size restrictions
      const lang = qsLang
        .split('-')
        .map((x, index) => {
          if (index == 0) {
            return x.toLocaleLowerCase();
          }
          return x.toLocaleUpperCase();
        })
        .join('-');

      if (lang in i18nManifest) {
        return lang;
      }
    }

    return '';
  }

  const browserLang = navigator.language;

  if (browserLang in i18nManifest) {
    return browserLang;
  }

  const mappedLang = browserLangMap[browserLang];
  if (mappedLang) {
    return mappedLang;
  }

  if (browserLang.includes('-')) {
    // Because Linux file size restrictions
    const lang = browserLang
      .split('-')
      .map((x, index) => {
        if (index == 0) {
          return x.toLocaleLowerCase();
        }
        return x.toLocaleUpperCase();
      })
      .join('-');

    if (lang in i18nManifest) {
      return lang;
    }
  }

  return '';
}

const browserLangMap: Record<string, string> = {
  zh: 'zh-CN',
};

export function formatSize(bytes: number, zeroToEmpty?: boolean, type?: 'speed'): string {
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

const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

export function formatBytes(bytes: number): string {
  const k = 1000;

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  const unit = sizes[i];
  if (unit) {
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${unit}`;
  }

  const n = bytes / Math.pow(k, sizes.length);

  return `${n.toFixed(2)} ${sizes[sizes.length - 1]!}`;
}

// Array object sort extension
export function arrayObjectSort<T>(
  field: keyof T,
  sortOrder: 'desc' | 'asc',
): (a: T, b: T) => number {
  return function (object1, object2) {
    const value1 = object1[field];
    const value2 = object2[field];
    if (value1 < value2) {
      if (sortOrder == 'desc') {
        return 1;
      } else {
        return -1;
      }
    } else if (value1 > value2) {
      if (sortOrder == 'desc') {
        return -1;
      } else {
        return 1;
      }
    } else {
      return 0;
    }
  };
}

// 根据小时获取分钟
export function getMinutesFromHours(hours: string): number {
  const [h, m] = hours.split(':');
  if (m === undefined) {
    return parseInt(h as string);
  }

  return parseInt(h as string) * 60 + parseInt(m);
}

export function normalizePath(p: string): string {
  return p.replaceAll(/\\/g, '/').replaceAll(/\/*$/g, '');
}
