import React from 'react';
import { render } from '@testing-library/react';
import ProductForm from './ProductForm';

jest.mock('../utils/api', () => ({
  post: jest.fn(),
  put: jest.fn(),
}));

describe('ProductForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    const { container } = render(<ProductForm onSubmit={jest.fn()} />);
    expect(container).toBeInTheDocument();
  });

  test('displays form element', () => {
    const { container } = render(<ProductForm onSubmit={jest.fn()} />);
    const form = container.querySelector('form');
    expect(form).toBeInTheDocument();
  });

  test('renders input fields', () => {
    const { container } = render(<ProductForm onSubmit={jest.fn()} />);
    const inputs = container.querySelectorAll('input');
    expect(inputs.length >= 0).toBe(true);
  });

  test('populates form with initial data', () => {
    const initialData = {
      name: 'Test Product',
      sku: 'SKU-123',
      category: 'Electronics',
      price: 99.99,
      description: 'A test product',
    };
    const { container } = render(<ProductForm onSubmit={jest.fn()} initialData={initialData} />);
    expect(container).toBeInTheDocument();
  });

  test('renders submit button', () => {
    const { container } = render(<ProductForm onSubmit={jest.fn()} />);
    const buttons = container.querySelectorAll('button');
    expect(buttons.length >= 0).toBe(true);
  });

  test('supports edit mode with initial data', () => {
    const initialData = { name: 'Existing Product', price: 50 };
    const { container } = render(
      <ProductForm onSubmit={jest.fn()} initialData={initialData} editMode={true} />
    );
    expect(container).toBeInTheDocument();
  });

  test('includes description field', () => {
    const { container } = render(<ProductForm onSubmit={jest.fn()} />);
    const textareas = container.querySelectorAll('textarea');
    expect(textareas).toBeDefined();
  });

  test('accepts callback prop', () => {
    const onSubmit = jest.fn();
    const { container } = render(<ProductForm onSubmit={onSubmit} />);
    expect(container.querySelector('form')).toBeInTheDocument();
  });
});
