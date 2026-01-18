"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const metrics_1 = require("../metrics");
describe('metrics', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('should record send and calculate success rate', () => {
        (0, metrics_1.recordSend)();
        (0, metrics_1.recordSend)();
        (0, metrics_1.recordFailed)();
        const metrics = (0, metrics_1.getMetrics)();
        expect(metrics.sent).toBe(2);
        expect(metrics.failed).toBe(1);
        expect(Number(metrics.successRate)).toBeLessThan(100);
    });
    it('should calculate average time', () => {
        (0, metrics_1.recordSend)();
        const metrics = (0, metrics_1.getMetrics)();
        expect(metrics.avgTime).toBeGreaterThanOrEqual(0);
    });
});
