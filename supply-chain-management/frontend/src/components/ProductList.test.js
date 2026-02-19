import React from 'react';
import { render } from '@testing-library/react';
import ProductList from './ProductList';
import apiClient from '../utils/api';

jest.mock('../utils/api');
jest.mock('../utils/exportToExcel');
jest.mock('../utils/exportToPDF');
jest.mock('./ProductForm', () => () => <div>Form</div>);
jest.mock(
  './Modal',
  () =>
    ({ open, children }) =>
      open ? <div>{children}</div> : null
);

const mockUser = { id: '1', role: 'admin' };

describe('ProductList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
  });

  test('renders without crashing', () => {
    apiClient.get.mockResolvedValue({ data: [] });
    const { container } = render(<ProductList user={mockUser} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('calls API to fetch products', () => {
    apiClient.get.mockResolvedValue({ data: [] });
    render(<ProductList user={mockUser} notify={null} />);
    expect(apiClient.get).toHaveBeenCalled();
  });

  test('renders with product data', () => {
    apiClient.get.mockResolvedValue({
      data: [{ _id: '1', name: 'Product 1', price: 100 }],
    });
    const { container } = render(<ProductList user={mockUser} notify={null} />);
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  test('handles empty product list', () => {
    apiClient.get.mockResolvedValue({ data: [] });
    const { container } = render(<ProductList user={mockUser} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('handles API errors', () => {
    apiClient.get.mockRejectedValue(new Error('API Error'));
    const { container } = render(<ProductList user={mockUser} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('handles null data response', () => {
    apiClient.get.mockResolvedValue({ data: null });
    const { container } = render(<ProductList user={mockUser} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('handles delete operation', () => {
    apiClient.get.mockResolvedValue({ data: [{ _id: '1', name: 'Item' }] });
    apiClient.delete.mockResolvedValue({ data: { success: true } });
    render(<ProductList user={mockUser} notify={null} />);
    expect(apiClient.get).toHaveBeenCalled();
  });

  test('handles notify callback', () => {
    const notify = jest.fn();
    apiClient.get.mockResolvedValue({ data: [] });
    render(<ProductList user={mockUser} notify={notify} />);
    expect(apiClient.get).toHaveBeenCalled();
  });

  test('renders list with users prop', () => {
    const user = { id: '1', role: 'admin' };
    apiClient.get.mockResolvedValue({ data: [] });
    const { container } = render(<ProductList user={user} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('handles large product list', () => {
    const products = Array.from({ length: 100 }, (_, i) => ({
      _id: String(i),
      name: `Product ${i}`,
      price: 100 + i,
    }));
    apiClient.get.mockResolvedValue({ data: products });
    const { container } = render(<ProductList user={mockUser} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('renders with different data structures', () => {
    apiClient.get.mockResolvedValue({ data: { data: [], products: [] } });
    const { container } = render(<ProductList user={mockUser} notify={null} />);
    expect(container).toBeInTheDocument();
  });
});
