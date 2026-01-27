import { describe, it, expect } from 'vitest';
import { getSmartRecommendations } from '../dashboard/src/process/SmartUnifiedDashboard';

describe('getSmartRecommendations', () => {
  it('should recommend for overdue processes', () => {
    const procs = [
      { id: 1, name: 'A', duration: 5, overdue: true, failed: false },
      { id: 2, name: 'B', duration: 3, overdue: false, failed: false },
    ];
    const recs = getSmartRecommendations(procs);
    expect(recs.some(r => r.includes('متأخرة'))).toBe(true);
  });

  it('should recommend for failed processes', () => {
    const procs = [
      { id: 1, name: 'A', duration: 5, overdue: false, failed: true },
      { id: 2, name: 'B', duration: 3, overdue: false, failed: false },
    ];
    const recs = getSmartRecommendations(procs);
    expect(recs.some(r => r.includes('فاشلة'))).toBe(true);
  });

  it('should recommend for high average duration', () => {
    const procs = [
      { id: 1, name: 'A', duration: 10, overdue: false, failed: false },
      { id: 2, name: 'B', duration: 12, overdue: false, failed: false },
    ];
    const recs = getSmartRecommendations(procs);
    expect(recs.some(r => r.includes('متوسط مدة العمليات مرتفع'))).toBe(true);
  });

  it('should recommend good performance if no issues', () => {
    const procs = [
      { id: 1, name: 'A', duration: 2, overdue: false, failed: false },
      { id: 2, name: 'B', duration: 3, overdue: false, failed: false },
    ];
    const recs = getSmartRecommendations(procs);
    expect(recs[0]).toContain('الأداء جيد');
  });
});
