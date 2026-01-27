// وحدة مراقبة الأحداث (Event Watcher)
import { EventEmitter } from 'events';

export class EventWatcher extends EventEmitter {
  constructor() {
    super();
  }

  watch(event: string, handler: (...args: any[]) => void) {
    this.on(event, handler);
  }

  trigger(event: string, ...args: any[]) {
    this.emit(event, ...args);
  }
}
