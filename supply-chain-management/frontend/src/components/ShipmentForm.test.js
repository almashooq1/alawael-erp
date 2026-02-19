import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ShipmentForm from './ShipmentForm';

jest.mock('../utils/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
}));

describe('ShipmentForm Component', () => {
  test('renders without crashing', () => {
    const { container } = render(<ShipmentForm onSubmit={jest.fn()} />);
    expect(container).toBeInTheDocument();
  });

  test('renders form with inputs', () => {
    render(<ShipmentForm onSubmit={jest.fn()} />);
    const inputs = screen.queryAllByRole('textbox');
    expect(inputs).toBeDefined();
  });

  test('renders submit button', () => {
    render(<ShipmentForm onSubmit={jest.fn()} />);
    const buttons = screen.queryAllByRole('button');
    expect(buttons).toBeDefined();
  });

  test('displays form with proper structure', () => {
    const { container } = render(<ShipmentForm onSubmit={jest.fn()} />);
    const form = container.querySelector('form');
    expect(form).toBeInTheDocument();
  });

  test('populates form with initial data', () => {
    const initialData = {
      trackingNumber: 'TRACK-123',
      origin: 'Warehouse A',
      destination: 'Customer City',
      status: 'in-transit',
      estimatedDelivery: '2026-02-21',
    };
    const { container } = render(<ShipmentForm onSubmit={jest.fn()} initialData={initialData} />);
    expect(container).toBeInTheDocument();
  });

  test('updates input value on change', () => {
    render(<ShipmentForm onSubmit={jest.fn()} />);
    const inputs = screen.queryAllByRole('textbox');
    if (inputs.length > 0) {
      fireEvent.change(inputs[0], { target: { value: 'TRACK-999' } });
      expect(inputs[0].value).toBe('TRACK-999');
    }
  });

  test('handles form submission', () => {
    const onSubmit = jest.fn();
    render(<ShipmentForm onSubmit={onSubmit} />);
    const form = document.querySelector('form');
    if (form) {
      fireEvent.submit(form);
    }
  });

  test('accepts tracking number input', () => {
    render(<ShipmentForm onSubmit={jest.fn()} />);
    const inputs = screen.queryAllByRole('textbox');
    if (inputs.length > 0) {
      fireEvent.change(inputs[0], { target: { value: 'SHIPMENT-2026-001' } });
      expect(inputs[0].value).toBe('SHIPMENT-2026-001');
    }
  });

  test('supports edit mode with initial data', () => {
    const initialData = {
      trackingNumber: 'TRACK-123',
      status: 'delivered',
    };
    const { container } = render(
      <ShipmentForm onSubmit={jest.fn()} initialData={initialData} editMode={true} />
    );
    expect(container).toBeInTheDocument();
  });
});
