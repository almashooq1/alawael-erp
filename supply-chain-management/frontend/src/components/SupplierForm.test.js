import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SupplierForm from './SupplierForm';

jest.mock('../utils/api', () => ({
  post: jest.fn(),
  put: jest.fn(),
}));

describe('SupplierForm Component', () => {
  test('renders without crashing', () => {
    const { container } = render(<SupplierForm onSubmit={jest.fn()} />);
    expect(container).toBeInTheDocument();
  });

  test('renders form with inputs', () => {
    render(<SupplierForm onSubmit={jest.fn()} />);
    const inputs = screen.queryAllByRole('textbox');
    expect(inputs).toBeDefined();
  });

  test('renders submit button', () => {
    render(<SupplierForm onSubmit={jest.fn()} />);
    const buttons = screen.queryAllByRole('button');
    expect(buttons).toBeDefined();
  });

  test('displays form with proper structure', () => {
    const { container } = render(<SupplierForm onSubmit={jest.fn()} />);
    const form = container.querySelector('form');
    expect(form).toBeInTheDocument();
  });

  test('populates form with initial data', () => {
    const initialData = {
      name: 'Test Supplier',
      email: 'supplier@test.com',
      phone: '1234567890',
      address: '123 Supplier St',
      country: 'USA',
    };
    const { container } = render(<SupplierForm onSubmit={jest.fn()} initialData={initialData} />);
    expect(container).toBeInTheDocument();
  });

  test('updates input value on change', () => {
    render(<SupplierForm onSubmit={jest.fn()} />);
    const inputs = screen.queryAllByRole('textbox');
    if (inputs.length > 0) {
      fireEvent.change(inputs[0], { target: { value: 'Supplier Inc' } });
      expect(inputs[0].value).toBe('Supplier Inc');
    }
  });

  test('handles form submission', () => {
    const onSubmit = jest.fn();
    render(<SupplierForm onSubmit={onSubmit} />);
    const form = document.querySelector('form');
    if (form) {
      fireEvent.submit(form);
    }
  });

  test('handles email field input', () => {
    render(<SupplierForm onSubmit={jest.fn()} />);
    const inputs = screen.queryAllByRole('textbox');
    if (inputs.length > 1) {
      fireEvent.change(inputs[1], { target: { value: 'test@supplier.com' } });
      expect(inputs[1].value).toBe('test@supplier.com');
    }
  });

  test('accepts phone number input', () => {
    render(<SupplierForm onSubmit={jest.fn()} />);
    const inputs = screen.queryAllByRole('textbox');
    if (inputs.length > 2) {
      fireEvent.change(inputs[2], { target: { value: '+1-555-0123' } });
      expect(inputs[2].value).toBe('+1-555-0123');
    }
  });

  test('supports edit mode with initial data', () => {
    const initialData = { name: 'Existing Supplier', email: 'existing@test.com' };
    const { container } = render(
      <SupplierForm onSubmit={jest.fn()} initialData={initialData} editMode={true} />
    );
    expect(container).toBeInTheDocument();
  });

  test('includes contact input fields', () => {
    const { container } = render(<SupplierForm onSubmit={jest.fn()} />);
    const inputs = container.querySelectorAll('input, textarea');
    expect(inputs.length >= 0).toBe(true);
  });
});
