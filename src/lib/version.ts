export const APP_VERSION = 'v' + ((import.meta.env.__APP_VERSION__ as string) || '0.0.0');

// @ts-expect-error global variable
globalThis.APP_VERSION = APP_VERSION;
