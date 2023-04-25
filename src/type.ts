import type message from './i18n/en.json';

export type Message = typeof message;

export interface System {
  lang: typeof message;
  plugin: { exec(key: string): void };

  control: any;

  openDialogFromTemplate(config: {
    id: string;
    options: unknown;
    datas?: unknown;
    type?: number;
    source?: unknown;
  }): void;
}
