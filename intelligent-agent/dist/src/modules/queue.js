"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Queue = void 0;
// وحدة الطوابير (Queue)
class Queue {
    constructor() {
        this.items = [];
    }
    enqueue(item) {
        this.items.push(item);
    }
    dequeue() {
        return this.items.shift();
    }
    isEmpty() {
        return this.items.length === 0;
    }
    size() {
        return this.items.length;
    }
}
exports.Queue = Queue;
