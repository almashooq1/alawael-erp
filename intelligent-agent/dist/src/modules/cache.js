"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cache = void 0;
// وحدة التخزين المؤقت (Cache)
class Cache {
    constructor() {
        this.store = new Map();
    }
    set(key, value) {
        this.store.set(key, value);
    }
    get(key) {
        return this.store.get(key);
    }
    has(key) {
        return this.store.has(key);
    }
    clear() {
        this.store.clear();
    }
}
exports.Cache = Cache;
