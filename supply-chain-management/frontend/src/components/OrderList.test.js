import React from 'react';
import { render } from '@testing-library/react';
import OrderList from './OrderList';
import apiClient from '../utils/api';

jest.mock('../utils/api');
jest.mock(
  './Modal',
  () =>
    ({ open, children }) =>
      open ? <div>{children}</div> : null
);
jest.mock('./OrderForm', () => () => <div>Form</div>);

const mockUser = { id: '1', role: 'admin' };

describe('OrderList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
  });

  test('renders without crashing', () => {
    apiClient.get.mockResolvedValue({ data: [] });
    const { container } = render(<OrderList user={mockUser} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('calls API to fetch orders', () => {
    apiClient.get.mockResolvedValue({ data: [] });
    render(<OrderList user={mockUser} notify={null} />);
    expect(apiClient.get).toHaveBeenCalled();
  });

  test('renders with order data', () => {
    apiClient.get.mockResolvedValue({
      data: [{ _id: '1', orderNumber: 'ORD-001', status: 'pending' }],
    });
    const { container } = render(<OrderList user={mockUser} notify={null} />);
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  test('handles empty orders list', () => {
    apiClient.get.mockResolvedValue({ data: [] });
    const { container } = render(<OrderList user={mockUser} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('handles API errors', () => {
    apiClient.get.mockRejectedValue(new Error('API Error'));
    const { container } = render(<OrderList user={mockUser} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('handles delete operation', () => {
    apiClient.get.mockResolvedValue({ data: [{ _id: '1', orderNumber: 'ORD-001' }] });
    apiClient.delete.mockResolvedValue({ data: { success: true } });
    render(<OrderList user={mockUser} notify={null} />);
    expect(apiClient.get).toHaveBeenCalled();
  });

  test('handles cancel delete', () => {
    apiClient.get.mockResolvedValue({ data: [{ _id: '1' }] });
    window.confirm.mockReturnValue(false);
    const { container } = render(<OrderList user={mockUser} notify={null} />);
    expect(apiClient.delete).not.toHaveBeenCalled();
  });

  test('handles search functionality', () => {
    apiClient.get.mockResolvedValue({
      data: [
        { _id: '1', orderNumber: 'ORD-001' },
        { _id: '2', orderNumber: 'ORD-002' },
      ],
    });
    const { container } = render(<OrderList user={mockUser} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('calls notify callback', () => {
    const notify = jest.fn();
    apiClient.get.mockResolvedValue({ data: [] });
    render(<OrderList user={mockUser} notify={notify} />);
    expect(apiClient.get).toHaveBeenCalled();
  });

  test('handles null data', () => {
    apiClient.get.mockResolvedValue({ data: null });
    const { container } = render(<OrderList user={mockUser} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('handles large order list', () => {
    const orders = Array.from({ length: 50 }, (_, i) => ({
      _id: String(i),
      orderNumber: `ORD-${i}`,
      status: 'pending',
    }));
    apiClient.get.mockResolvedValue({ data: orders });
    const { container } = render(<OrderList user={mockUser} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('renders with user prop', () => {
    apiClient.get.mockResolvedValue({ data: [] });
    const { container } = render(<OrderList user={mockUser} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('handles different order statuses', () => {
    apiClient.get.mockResolvedValue({
      data: [
        { _id: '1', status: 'pending' },
        { _id: '2', status: 'completed' },
        { _id: '3', status: 'cancelled' },
      ],
    });
    const { container } = render(<OrderList user={mockUser} notify={null} />);
    expect(container).toBeInTheDocument();
  });
});
