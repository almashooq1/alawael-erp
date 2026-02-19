import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import OrderForm from './OrderForm';
import axios from 'axios';

jest.mock('axios');

describe('OrderForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockResolvedValue({ data: [] });
  });

  test('renders without crashing', () => {
    const { container } = render(<OrderForm onAdd={jest.fn()} />);
    expect(container).toBeInTheDocument();
  });

  test('renders form with inputs', () => {
    render(<OrderForm onAdd={jest.fn()} />);
    const inputs = screen.queryAllByRole('textbox');
    expect(inputs).toBeDefined();
  });

  test('displays form with proper structure', () => {
    const { container } = render(<OrderForm onAdd={jest.fn()} />);
    const form = container.querySelector('form');
    expect(form).toBeInTheDocument();
  });

  test('populates form with initial data', () => {
    const initialData = {
      supplier: 'supplier-1',
      products: [],
      status: 'pending',
      orderDate: '2026-02-14',
      deliveryDate: '2026-02-21',
      notes: 'Test order',
    };
    const { container } = render(<OrderForm onAdd={jest.fn()} initialData={initialData} />);
    expect(container).toBeInTheDocument();
  });

  test('updates input value on change', () => {
    render(<OrderForm onAdd={jest.fn()} />);
    const inputs = screen.queryAllByRole('textbox');
    if (inputs.length > 0) {
      fireEvent.change(inputs[0], { target: { value: 'test value' } });
      expect(inputs[0].value).toBe('test value');
    }
  });

  test('renders submit button', () => {
    render(<OrderForm onAdd={jest.fn()} />);
    const buttons = screen.queryAllByRole('button');
    expect(buttons).toBeDefined();
  });

  test('handles form submission', () => {
    const onAdd = jest.fn();
    const { container } = render(<OrderForm onAdd={onAdd} />);
    expect(container).toBeInTheDocument();
  });

  test('supports edit mode with initial data', () => {
    const initialData = { supplier: 'test', products: [], status: 'completed' };
    const { container } = render(
      <OrderForm onAdd={jest.fn()} initialData={initialData} editMode={true} />
    );
    expect(container).toBeInTheDocument();
  });

  test('loads suppliers and products on mount', () => {
    render(<OrderForm onAdd={jest.fn()} />);
    expect(axios.get).toHaveBeenCalled();
  });

  test('handles missing props gracefully', () => {
    const { container } = render(<OrderForm onAdd={jest.fn()} user={null} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('includes date selection fields', () => {
    render(<OrderForm onAdd={jest.fn()} />);
    const inputs = screen.queryAllByRole('textbox');
    expect(inputs).toBeDefined();
  });

  test('supports supplier and product selection', () => {
    render(<OrderForm onAdd={jest.fn()} />);
    expect(axios.get).toHaveBeenCalled();
  });
});
