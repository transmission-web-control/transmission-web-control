import 'vite/client';

declare global {
  const system: {
    plugin: { exec(key: string): void };

    control: any;
    openDialogFromTemplate(config: {
      id: string;
      options: unknown;
      datas?: unknown;
      type?: number;
      source?: unknown;
    }): void;
  };
}
