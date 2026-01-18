import { EventEmitter } from 'events';

class EventBus extends EventEmitter {
  publish(type, data, metadata = {}) {
    const evt = { type, data, metadata: { ...metadata, timestamp: new Date() } };
    this.emit(type, evt);
  }
  subscribe(type, handler) {
    this.on(type, handler);
    return () => this.off(type, handler);
  }
}

export const eventBus = new EventBus();
