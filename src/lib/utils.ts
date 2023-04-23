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
