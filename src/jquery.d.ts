interface JQuery {
  dialog(el: unknown): void;

  css(o: Record<string, string | number | undefined>): this;

  data(key: string, value: any): this;
}

interface JQueryStatic {
  parser: {
    parse(s: string): any;
  };

  webuiPopover(o: unknown): this;
}
