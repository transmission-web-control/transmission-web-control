// Generic time - sharing processing functions
export function timedChunk<T>(
  {
    items,
    process,
    context,
    delay = 25,
  }: {
    items: T[];
    process: (v: T) => void;
    context: any;
    delay?: number;
  },
  callback: (items: T[]) => void,
) {
  const todo = items.concat();

  setTimeout(function () {
    const start = +new Date();

    do {
      process.call(context, todo.shift()!);
    } while (todo.length > 0 && +new Date() - start < 100);

    if (todo.length > 0) {
      setTimeout(arguments.callee, delay);
    } else if (callback) {
      callback(items);
    }
  }, delay);
}
