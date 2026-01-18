import { getMetrics, recordSend, recordFailed } from '../metrics';

describe('metrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should record send and calculate success rate', () => {
    recordSend();
    recordSend();
    recordFailed();

    const metrics = getMetrics();
    expect(metrics.sent).toBe(2);
    expect(metrics.failed).toBe(1);
    expect(Number(metrics.successRate)).toBeLessThan(100);
  });

  it('should calculate average time', () => {
    recordSend();
    const metrics = getMetrics();
    expect(metrics.avgTime).toBeGreaterThanOrEqual(0);
  });
});
