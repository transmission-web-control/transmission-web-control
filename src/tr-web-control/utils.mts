export function getQueryString(s: string) {
  const u = new URLSearchParams(location.search);
  return u.get(s);
}
