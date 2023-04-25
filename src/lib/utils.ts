import i18nManifest from '../i18n.json';

export function getQueryString(s: string): string | null {
  const u = new URLSearchParams(location.search);
  return u.get(s);
}

export function getHostName(url: string): string {
  let result = url;
  const regex = /^\w+:\/\/([^\/]*).*/;
  const match = url.match(regex);
  if (typeof match !== 'undefined' && match != null) {
    // @ts-expect-error
    result = match[1];
    if (result.includes(':')) {
      // @ts-expect-error
      result = result.split(':')[0];
    }
  }
  return result;
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
        .join('_');

      if (lang in i18nManifest) {
        return lang;
      }
    }
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
      .join('_');

    if (lang in i18nManifest) {
      return lang;
    }
  }

  return 'en';
}

const browserLangMap: Record<string, string> = {
  zh: 'zh_CN',
};
