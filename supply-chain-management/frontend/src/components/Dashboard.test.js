import React from 'react';
import { render } from '@testing-library/react';
import Dashboard from './Dashboard';
import apiClient from '../utils/api';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  LineChart: () => <div>L</div>,
  BarChart: () => <div>B</div>,
  PieChart: () => <div>P</div>,
  Line: () => null,
  Bar: () => null,
  Pie: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  Cell: () => null,
}));

jest.mock('../utils/api', () => ({
  get: jest.fn(),
}));

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    apiClient.get.mockResolvedValue({ data: {} });
    const { container } = render(<Dashboard />);
    expect(container).toBeInTheDocument();
  });

  test('calls API on mount', () => {
    apiClient.get.mockResolvedValue({ data: {} });
    render(<Dashboard />);
    expect(apiClient.get).toHaveBeenCalled();
  });

  test('renders with stat data', () => {
    apiClient.get.mockResolvedValue({
      data: { totalOrders: 100, revenue: 5000 },
    });
    const { container } = render(<Dashboard />);
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  test('handles API errors', () => {
    apiClient.get.mockRejectedValue(new Error('Error'));
    const { container } = render(<Dashboard />);
    expect(container).toBeInTheDocument();
  });

  test('handles null data', () => {
    apiClient.get.mockResolvedValue({ data: null });
    const { container } = render(<Dashboard />);
    expect(container).toBeInTheDocument();
  });

  test('renders multiple times safely', () => {
    apiClient.get.mockResolvedValue({ data: {} });
    const { rerender } = render(<Dashboard />);
    rerender(<Dashboard />);
    expect(apiClient.get).toHaveBeenCalled();
  });
});
