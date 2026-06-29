/**
 * Tests for Performance Service
 */

import performanceService from './performance.service';
import apiClient from './api.client';

vi.spyOn(apiClient, 'get').mockResolvedValue({ data: {} });
vi.spyOn(apiClient, 'post').mockResolvedValue({ data: {} });
vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: {} });

describe('performanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends web vitals metrics', async () => {
    const metrics = [{ name: 'LCP', value: 1200, rating: 'good' }];
    await performanceService.sendWebVitals(metrics);
    expect(apiClient.post).toHaveBeenCalledWith('/performance/web-vitals', { metrics });
  });

  it('fetches dashboard data', async () => {
    await performanceService.getDashboard();
    expect(apiClient.get).toHaveBeenCalledWith('/performance/dashboard', { params: undefined });
  });

  it('fetches alerts', async () => {
    await performanceService.getAlerts();
    expect(apiClient.get).toHaveBeenCalledWith('/performance/alerts', { params: undefined });
  });

  it('fetches budget', async () => {
    await performanceService.getBudget();
    expect(apiClient.get).toHaveBeenCalledWith('/performance/budget');
  });

  it('updates budget', async () => {
    const data = { maxJsSizeKb: 800 };
    await performanceService.updateBudget(data);
    expect(apiClient.post).toHaveBeenCalledWith('/performance/budget', data);
  });
});
