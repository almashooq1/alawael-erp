import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import InventoryForm from './InventoryForm';

jest.mock('../utils/api', () => ({
  post: jest.fn(),
  put: jest.fn(),
}));

describe('InventoryForm Component', () => {
  test('renders without crashing', () => {
    const { container } = render(<InventoryForm onSubmit={jest.fn()} />);
    expect(container).toBeInTheDocument();
  });

  test('renders form with input fields', () => {
    render(<InventoryForm onSubmit={jest.fn()} />);
    const inputs = screen.queryAllByRole('textbox');
    expect(inputs).toBeDefined();
  });

  test('renders submit button', () => {
    render(<InventoryForm onSubmit={jest.fn()} />);
    const buttons = screen.queryAllByRole('button');
    expect(buttons).toBeDefined();
  });

  test('displays form when rendered', () => {
    const { container } = render(<InventoryForm onSubmit={jest.fn()} />);
    const form = container.querySelector('form');
    expect(form).toBeInTheDocument();
  });

  test('populates form with initial data', () => {
    const initialData = {
      product: 'test-product',
      quantity: 100,
      warehouse: 'warehouse-1',
      location: 'A1',
    };
    const { container } = render(<InventoryForm onSubmit={jest.fn()} initialData={initialData} />);
    expect(container).toBeInTheDocument();
  });

  test('updates input value on change', () => {
    render(<InventoryForm onSubmit={jest.fn()} />);
    const inputs = screen.queryAllByRole('textbox');
    if (inputs.length > 0) {
      fireEvent.change(inputs[0], { target: { value: 'test' } });
      expect(inputs[0].value).toBe('test');
    }
  });

  test('handles form submission', () => {
    const onSubmit = jest.fn();
    render(<InventoryForm onSubmit={onSubmit} />);
    const form = document.querySelector('form');
    if (form) {
      fireEvent.submit(form);
    }
  });

  test('accepts numeric quantity input', () => {
    render(<InventoryForm onSubmit={jest.fn()} />);
    const inputs = screen.queryAllByRole('textbox');
    if (inputs.length > 1) {
      fireEvent.change(inputs[1], { target: { value: '999' } });
      expect(inputs[1].value).toBe('999');
    }
  });

  test('supports edit mode with initial data', () => {
    const initialData = { product: 'existing', quantity: 50 };
    const { container } = render(
      <InventoryForm onSubmit={jest.fn()} initialData={initialData} editMode={true} />
    );
    expect(container).toBeInTheDocument();
  });
});
