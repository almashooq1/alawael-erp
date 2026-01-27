"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventWatcher = void 0;
// وحدة مراقبة الأحداث (Event Watcher)
const events_1 = require("events");
class EventWatcher extends events_1.EventEmitter {
    constructor() {
        super();
    }
    watch(event, handler) {
        this.on(event, handler);
    }
    trigger(event, ...args) {
        this.emit(event, ...args);
    }
}
exports.EventWatcher = EventWatcher;
