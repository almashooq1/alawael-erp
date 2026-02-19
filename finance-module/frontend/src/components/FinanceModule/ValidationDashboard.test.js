/**
 * ValidationDashboard Tests
 * Component and integration tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ValidationDashboard from './ValidationDashboard';

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(() => 'fake-token'),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('ValidationDashboard Component', () => {
  beforeEach(() => {
    fetch.mockClear();
    localStorageMock.getItem.mockClear();
  });

  describe('Component Rendering', () => {
    test('should render dashboard title', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          stats: {
            total: 0,
            complianceRate: 100,
            bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
            byStatus: { detected: 0, investigating: 0, resolved: 0, waived: 0 }
          }
        })
      });

      render(<ValidationDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Financial Validation Dashboard')).toBeInTheDocument();
      });
    });

    test('should render statistics cards', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          stats: {
            total: 5,
            bySeverity: { critical: 1, high: 2, medium: 2, low: 0 },
            byStatus: { detected: 3, investigating: 1, resolved: 1, waived: 0 },
            complianceRate: 80
          }
        })
      });

      render(<ValidationDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Total Violations')).toBeInTheDocument();
        expect(screen.getByText('Outstanding Issues')).toBeInTheDocument();
        expect(screen.getByText('Compliance Rate')).toBeInTheDocument();
        expect(screen.getByText('Critical Issues')).toBeInTheDocument();
      });
    });

    test('should render filter controls', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          stats: {
            total: 0,
            complianceRate: 100,
            bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
            byStatus: { detected: 0, investigating: 0, resolved: 0, waived: 0 }
          }
        })
      });

      render(<ValidationDashboard />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('All Statuses')).toBeInTheDocument();
        expect(screen.getByDisplayValue('All Severities')).toBeInTheDocument();
        expect(screen.getByDisplayValue('All Types')).toBeInTheDocument();
      });
    });
  });

  describe('Data Loading', () => {
    test('should load violations data on mount', async () => {
      const mockViolations = [
        {
          _id: '1',
          violationType: 'amount_mismatch',
          severity: 'high',
          amount: 1000,
          status: 'detected',
          detectionDate: '2025-02-16'
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockViolations,
          stats: {
            total: 1,
            complianceRate: 90,
            bySeverity: { critical: 0, high: 1, medium: 0, low: 0 },
            byStatus: { detected: 1, investigating: 0, resolved: 0, waived: 0 }
          }
        })
      });

      render(<ValidationDashboard />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
        expect(screen.getByText('Amount Mismatch')).toBeInTheDocument();
      });
    });

    test('should display error message on fetch failure', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<ValidationDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load violations/i)).toBeInTheDocument();
      });
    });

    test('should show loading state initially', () => {
      fetch.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      const { container } = render(<ValidationDashboard />);

      expect(container.querySelector('svg')).toBeInTheDocument(); // CircularProgress
    });
  });

  describe('Filtering', () => {
    test('should filter violations by status', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          stats: {
            total: 0,
            complianceRate: 100,
            bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
            byStatus: { detected: 0, investigating: 0, resolved: 0, waived: 0 }
          }
        })
      });

      render(<ValidationDashboard />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('All Statuses')).toBeInTheDocument();
      });

      const statusSelect = screen.getByDisplayValue('All Statuses');
      fireEvent.mouseDown(statusSelect);
      fireEvent.click(screen.getByText('Resolved'));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('status=resolved'),
          expect.any(Object)
        );
      });
    });

    test('should filter violations by severity', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          stats: {
            total: 0,
            complianceRate: 100,
            bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
            byStatus: { detected: 0, investigating: 0, resolved: 0, waived: 0 }
          }
        })
      });

      render(<ValidationDashboard />);

      await waitFor(() => {
        const severitySelect = screen.getByDisplayValue('All Severities');
        fireEvent.mouseDown(severitySelect);
        fireEvent.click(screen.getByText('Critical'));

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('severity=critical'),
          expect.any(Object)
        );
      });
    });

    test('should clear all filters', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          stats: {
            total: 0,
            complianceRate: 100,
            bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
            byStatus: { detected: 0, investigating: 0, resolved: 0, waived: 0 }
          }
        })
      });

      const { rerender } = render(<ValidationDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Clear Filters')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Clear Filters'));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Violation Management', () => {
    test('should open detail dialog when clicking view details', async () => {
      const mockViolations = [
        {
          _id: '1',
          violationType: 'amount_mismatch',
          severity: 'high',
          amount: 1000,
          status: 'detected',
          detectionDate: '2025-02-16',
          description: 'Test violation'
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockViolations,
          stats: {
            total: 1,
            complianceRate: 90,
            bySeverity: { critical: 0, high: 1, medium: 0, low: 0 },
            byStatus: { detected: 1, investigating: 0, resolved: 0, waived: 0 }
          }
        })
      });

      render(<ValidationDashboard />);

      await waitFor(() => {
        const detailButtons = screen.getAllByTitle('View Details');
        fireEvent.click(detailButtons[0]);
      });

      await waitFor(() => {
        expect(screen.getByText('Violation Details')).toBeInTheDocument();
        expect(screen.getByText('Test violation')).toBeInTheDocument();
      });
    });

    test('should resolve violation', async () => {
      const mockViolations = [
        {
          _id: '1',
          violationType: 'amount_mismatch',
          severity: 'high',
          amount: 1000,
          status: 'detected',
          detectionDate: '2025-02-16'
        }
      ];

      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: mockViolations,
            stats: {
              total: 1,
              complianceRate: 90,
              bySeverity: { critical: 0, high: 1, medium: 0, low: 0 },
              byStatus: { detected: 1, investigating: 0, resolved: 0, waived: 0 }
            }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [],
            stats: {
              total: 0,
              complianceRate: 100,
              bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
              byStatus: { detected: 0, investigating: 0, resolved: 0, waived: 0 }
            }
          })
        });

      render(<ValidationDashboard />);

      await waitFor(() => {
        const resolveButtons = screen.getAllByTitle('Resolve');
        fireEvent.click(resolveButtons[0]);
      });

      await waitFor(() => {
        expect(screen.getByText('Resolve Violation')).toBeInTheDocument();
      });

      const notesInput = screen.getByDisplayValue('');
      fireEvent.change(notesInput, { target: { value: 'Issue resolved' } });

      fireEvent.click(screen.getByText('Resolve'));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/violations/1/resolve'),
          expect.objectContaining({
            method: 'POST'
          })
        );
      });
    });
  });

  describe('Report Generation', () => {
    test('should open report dialog', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          stats: {
            total: 0,
            complianceRate: 100,
            bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
            byStatus: { detected: 0, investigating: 0, resolved: 0, waived: 0 }
          }
        })
      });

      render(<ValidationDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Generate Report'));
      });

      expect(screen.getByText('Generate Report')).toBeInTheDocument();
    });

    test('should generate report with date range', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          stats: {
            total: 0,
            complianceRate: 100,
            bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
            byStatus: { detected: 0, investigating: 0, resolved: 0, waived: 0 }
          }
        })
      });

      render(<ValidationDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Generate Report'));
      });

      // Dialog should appear
      await waitFor(() => {
        const buttons = screen.getAllByText('Generate');
        fireEvent.click(buttons[buttons.length - 1]); // Last Generate button is in the dialog
      });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/validation/reports/generate',
          expect.objectContaining({
            method: 'POST'
          })
        );
      });
    });
  });

  describe('Statistics Display', () => {
    test('should display correct statistics values', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          stats: {
            total: 10,
            complianceRate: 75.5,
            bySeverity: { critical: 3, high: 2, medium: 3, low: 2 },
            byStatus: { detected: 5, investigating: 2, resolved: 2, waived: 1 }
          }
        })
      });

      render(<ValidationDashboard />);

      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument(); // Total
        expect(screen.getByText('75.5%')).toBeInTheDocument(); // Compliance rate
        expect(screen.getByText('3')).toBeInTheDocument(); // Critical
        expect(screen.getByText('5')).toBeInTheDocument(); // Outstanding
      });
    });
  });

  describe('Table Display', () => {
    test('should display violations table with correct columns', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          stats: {
            total: 0,
            complianceRate: 100,
            bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
            byStatus: { detected: 0, investigating: 0, resolved: 0, waived: 0 }
          }
        })
      });

      render(<ValidationDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Type')).toBeInTheDocument();
        expect(screen.getByText('Severity')).toBeInTheDocument();
        expect(screen.getByText('Amount')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
        expect(screen.getByText('Detection Date')).toBeInTheDocument();
        expect(screen.getByText('Actions')).toBeInTheDocument();
      });
    });

    test('should display "no violations found" message when list is empty', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          stats: {
            total: 0,
            complianceRate: 100,
            bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
            byStatus: { detected: 0, investigating: 0, resolved: 0, waived: 0 }
          }
        })
      });

      render(<ValidationDashboard />);

      await waitFor(() => {
        expect(screen.getByText('No violations found')).toBeInTheDocument();
      });
    });

    test('should display violations in table rows', async () => {
      const mockViolations = [
        {
          _id: '1',
          violationType: 'amount_mismatch',
          severity: 'high',
          amount: 1500.5,
          status: 'detected',
          detectionDate: '2025-02-16'
        },
        {
          _id: '2',
          violationType: 'duplicate',
          severity: 'medium',
          amount: 500,
          status: 'resolved',
          detectionDate: '2025-02-15'
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockViolations,
          stats: {
            total: 2,
            complianceRate: 50,
            bySeverity: { critical: 0, high: 1, medium: 1, low: 0 },
            byStatus: { detected: 1, investigating: 0, resolved: 1, waived: 0 }
          }
        })
      });

      render(<ValidationDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Amount Mismatch')).toBeInTheDocument();
        expect(screen.getByText('Duplicate')).toBeInTheDocument();
        expect(screen.getByText('$1500.50')).toBeInTheDocument();
        expect(screen.getByText('$500.00')).toBeInTheDocument();
      });
    });
  });

  describe('User Auth Integration', () => {
    test('should include authorization token in requests', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          stats: {
            total: 0,
            complianceRate: 100,
            bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
            byStatus: { detected: 0, investigating: 0, resolved: 0, waived: 0 }
          }
        })
      });

      render(<ValidationDashboard />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer fake-token'
            })
          })
        );
      });
    });
  });

  describe('Charts Rendering', () => {
    test('should render pie chart for severity distribution', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          stats: {
            total: 10,
            complianceRate: 80,
            bySeverity: { critical: 3, high: 2, medium: 3, low: 2 },
            byStatus: { detected: 5, investigating: 2, resolved: 2, waived: 1 }
          }
        })
      });

      render(<ValidationDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Violations by Severity')).toBeInTheDocument();
      });
    });

    test('should render bar chart for status distribution', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          stats: {
            total: 10,
            complianceRate: 80,
            bySeverity: { critical: 3, high: 2, medium: 3, low: 2 },
            byStatus: { detected: 5, investigating: 2, resolved: 2, waived: 1 }
          }
        })
      });

      render(<ValidationDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Violations by Status')).toBeInTheDocument();
      });
    });
  });
});
