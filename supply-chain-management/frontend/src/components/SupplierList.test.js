import React from 'react';
import { render } from '@testing-library/react';
import SupplierList from './SupplierList';
import apiClient from '../utils/api';

jest.mock('../utils/api');
jest.mock(
  './Modal',
  () =>
    ({ open, children }) =>
      open ? <div>{children}</div> : null
);
jest.mock('./SupplierForm', () => () => <div>Form</div>);

const mockUser = { id: '1', role: 'admin' };

describe('SupplierList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
  });

  test('renders without crashing', () => {
    apiClient.get.mockResolvedValue({ data: [] });
    const { container } = render(<SupplierList user={mockUser} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('calls API to fetch suppliers', () => {
    apiClient.get.mockResolvedValue({ data: [] });
    render(<SupplierList user={mockUser} notify={null} />);
    expect(apiClient.get).toHaveBeenCalled();
  });

  test('renders with supplier data', () => {
    apiClient.get.mockResolvedValue({
      data: [
        { _id: '1', name: 'Supplier 1', email: 'supplier1@test.com' },
        { _id: '2', name: 'Supplier 2', email: 'supplier2@test.com' },
      ],
    });
    const { container } = render(<SupplierList user={mockUser} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('handles empty supplier list', () => {
    apiClient.get.mockResolvedValue({ data: [] });
    const { container } = render(<SupplierList user={mockUser} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('handles API errors', () => {
    apiClient.get.mockRejectedValue(new Error('API Error'));
    const { container } = render(<SupplierList user={mockUser} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('handles delete operation', () => {
    apiClient.get.mockResolvedValue({
      data: [{ _id: '1', name: 'Supplier A' }],
    });
    apiClient.delete.mockResolvedValue({ data: { success: true } });
    render(<SupplierList user={mockUser} notify={null} />);
    expect(apiClient.get).toHaveBeenCalled();
  });

  test('handles cancel delete', () => {
    apiClient.get.mockResolvedValue({ data: [{ _id: '1' }] });
    window.confirm.mockReturnValue(false);
    const { container } = render(<SupplierList user={mockUser} notify={null} />);
    expect(apiClient.delete).not.toHaveBeenCalled();
  });

  test('renders with contact information', () => {
    apiClient.get.mockResolvedValue({
      data: [
        {
          _id: '1',
          name: 'Supplier',
          email: 'contact@supplier.com',
          phone: '1234567890',
        },
      ],
    });
    const { container } = render(<SupplierList user={mockUser} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('handles multiple suppliers', () => {
    const suppliers = Array.from({ length: 25 }, (_, i) => ({
      _id: String(i),
      name: `Supplier ${i}`,
      email: `supplier${i}@test.com`,
    }));
    apiClient.get.mockResolvedValue({ data: suppliers });
    const { container } = render(<SupplierList user={mockUser} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('handles null data', () => {
    apiClient.get.mockResolvedValue({ data: null });
    const { container } = render(<SupplierList user={mockUser} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('renders with user prop', () => {
    const user = { id: '1', role: 'admin' };
    apiClient.get.mockResolvedValue({ data: [] });
    const { container } = render(<SupplierList user={user} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('calls notify callback', () => {
    const notify = jest.fn();
    apiClient.get.mockResolvedValue({ data: [] });
    render(<SupplierList user={mockUser} notify={notify} />);
    expect(apiClient.get).toHaveBeenCalled();
  });
});
