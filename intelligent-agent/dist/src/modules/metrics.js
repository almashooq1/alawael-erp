"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Metrics = void 0;
// وحدة القياس (Metrics)
class Metrics {
    constructor() {
        this.counters = {};
    }
    increment(metric) {
        this.counters[metric] = (this.counters[metric] || 0) + 1;
    }
    get(metric) {
        return this.counters[metric] || 0;
    }
}
exports.Metrics = Metrics;
