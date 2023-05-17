import { EventEmitter } from 'eventemitter3';

const useState = <T>(
  defaultValue: T,
): {
  event: EventEmitter<{
    change: (newValue: T) => void;
  }>;
  get(): T;
  set(newValue: T): void;
} => {
  const event = new EventEmitter<{
    change: (newValue: T) => void;
  }>();

  let value = defaultValue;

  const getValue = () => value;

  const setValue = (newValue: T) => {
    value = newValue;
    event.emit('change', newValue);
  };

  return {
    event,
    get: getValue,
    set: setValue,
  };
};

export const freeSpace = useState(0);
