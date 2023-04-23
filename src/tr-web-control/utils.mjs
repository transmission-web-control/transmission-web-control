export function getQueryString(s) {
    const u = new URLSearchParams(location.search);
    return u.get(s);
}
