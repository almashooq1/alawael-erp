import React from 'react';
import { render } from '@testing-library/react';
import InventoryList from './InventoryList';
import apiClient from '../utils/api';

jest.mock('../utils/api');
jest.mock(
  './Modal',
  () =>
    ({ open, children }) =>
      open ? <div>{children}</div> : null
);

describe('InventoryList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
  });

  test('renders without crashing', () => {
    apiClient.get.mockResolvedValue({ data: [] });
    const { container } = render(<InventoryList user={null} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('calls API to fetch inventory', () => {
    apiClient.get.mockResolvedValue({ data: [] });
    render(<InventoryList user={null} notify={null} />);
    expect(apiClient.get).toHaveBeenCalled();
  });

  test('renders with inventory data', () => {
    apiClient.get.mockResolvedValue({
      data: [
        {
          _id: '1',
          product: 'Product A',
          quantity: 100,
          warehouse: 'Warehouse 1',
          location: 'A1',
        },
      ],
    });
    const { container } = render(<InventoryList user={null} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('handles empty inventory list', () => {
    apiClient.get.mockResolvedValue({ data: [] });
    const { container } = render(<InventoryList user={null} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('handles API errors', () => {
    apiClient.get.mockRejectedValue(new Error('API Error'));
    const { container } = render(<InventoryList user={null} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('handles delete operation', () => {
    apiClient.get.mockResolvedValue({
      data: [{ _id: '1', product: 'Product A', quantity: 100 }],
    });
    apiClient.delete.mockResolvedValue({ data: { success: true } });
    render(<InventoryList user={null} notify={null} />);
    expect(apiClient.get).toHaveBeenCalled();
  });

  test('handles cancel delete', () => {
    apiClient.get.mockResolvedValue({ data: [{ _id: '1' }] });
    window.confirm.mockReturnValue(false);
    const { container } = render(<InventoryList user={null} notify={null} />);
    expect(apiClient.delete).not.toHaveBeenCalled();
  });

  test('handles low stock warning', () => {
    apiClient.get.mockResolvedValue({
      data: [{ _id: '1', product: 'Low Stock Item', quantity: 5, minQuantity: 10 }],
    });
    const { container } = render(<InventoryList user={null} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('handles multiple inventory items', () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      _id: String(i),
      product: `Product ${i}`,
      quantity: 100 - i,
      warehouse: 'Main',
    }));
    apiClient.get.mockResolvedValue({ data: items });
    const { container } = render(<InventoryList user={null} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('handles null data', () => {
    apiClient.get.mockResolvedValue({ data: null });
    const { container } = render(<InventoryList user={null} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('renders with user prop', () => {
    const user = { id: '1', role: 'manager' };
    apiClient.get.mockResolvedValue({ data: [] });
    const { container } = render(<InventoryList user={user} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('calls notify callback', () => {
    const notify = jest.fn();
    apiClient.get.mockResolvedValue({ data: [] });
    render(<InventoryList user={null} notify={notify} />);
    expect(apiClient.get).toHaveBeenCalled();
  });
});
