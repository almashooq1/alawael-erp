/**
 * Tests for Performance Dashboard
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

const mockDashboardData = {
  data: {
    webVitalsSummary: {
      LCP: { good: 10, needsImprovement: 2, poor: 1 },
    },
    latestLighthouse: {
      url: 'https://example.com',
      scores: { performance: 90, accessibility: 95, bestPractices: 85, seo: 80 },
    },
    latestPageSpeed: {
      url: 'https://example.com',
      strategy: 'mobile',
      scores: { performance: 88 },
    },
    alerts: [],
  },
};

describe('PerformanceDashboard', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.doMock('../../../services/performance.service', () => ({
      default: {
        getDashboard: vi.fn().mockResolvedValue(mockDashboardData),
        getWebVitals: vi.fn().mockResolvedValue({ data: { data: [] } }),
        getLatestLighthouse: vi.fn().mockResolvedValue({ data: { data: null } }),
        getPageSpeed: vi.fn().mockResolvedValue({ data: { data: null } }),
        getAlerts: vi.fn().mockResolvedValue({ data: { data: [] } }),
      },
    }));
  });

  afterEach(() => {
    vi.doUnmock('../../../services/performance.service');
  });

  it('renders dashboard title', async () => {
    const { default: PerformanceDashboard } = await import('./index');
    render(<PerformanceDashboard />);
    await waitFor(() => {
      expect(screen.getByText('لوحة تحكم الأداء')).toBeInTheDocument();
    });
  });

  it('renders error state on fetch failure', async () => {
    vi.doMock('../../../services/performance.service', () => ({
      default: {
        getDashboard: vi.fn().mockRejectedValue(new Error('Network error')),
        getWebVitals: vi.fn().mockResolvedValue({ data: { data: [] } }),
        getLatestLighthouse: vi.fn().mockResolvedValue({ data: { data: null } }),
        getPageSpeed: vi.fn().mockResolvedValue({ data: { data: null } }),
        getAlerts: vi.fn().mockResolvedValue({ data: { data: [] } }),
      },
    }));
    const { default: PerformanceDashboard } = await import('./index');
    render(<PerformanceDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });
});
