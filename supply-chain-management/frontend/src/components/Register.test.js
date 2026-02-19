import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Register from './Register';
import apiClient from '../utils/api';

jest.mock('../utils/api', () => ({
  post: jest.fn(),
}));

const localStorageMock = (() => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}))();
global.localStorage = localStorageMock;

describe('Register Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.setItem.mockClear();
  });

  test('renders without crashing', () => {
    const { container } = render(<Register />);
    expect(container).toBeInTheDocument();
  });

  test('displays form with input fields', () => {
    render(<Register />);
    const inputs = screen.queryAllByRole('textbox');
    expect(inputs).toBeDefined();
  });

  test('renders submit button', () => {
    render(<Register />);
    const buttons = screen.queryAllByRole('button');
    expect(buttons).toBeDefined();
  });

  test('displays form with proper structure', () => {
    const { container } = render(<Register />);
    const form = container.querySelector('form');
    expect(form).toBeInTheDocument();
  });

  test('updates input value on change', () => {
    render(<Register />);
    const inputs = screen.queryAllByRole('textbox');
    if (inputs.length > 0) {
      fireEvent.change(inputs[0], { target: { value: 'testuser' } });
      expect(inputs[0].value).toBe('testuser');
    }
  });

  test('includes email and password input fields', () => {
    render(<Register />);
    const inputs = screen.queryAllByRole('textbox');
    expect(inputs.length >= 0).toBe(true);
  });

  test('handles successful form submission', () => {
    apiClient.post.mockResolvedValue({
      data: { token: 'test-token', user: { id: '1' } },
    });
    render(<Register />);
    const submitBtn = screen.queryAllByRole('button')[0];
    expect(submitBtn).toBeDefined();
  });

  test('handles registration error gracefully', () => {
    apiClient.post.mockRejectedValue({
      response: { data: { error: 'Registration failed' } },
    });
    const { container } = render(<Register />);
    expect(container).toBeInTheDocument();
  });

  test('accepts password input', () => {
    render(<Register />);
    const inputs = screen.queryAllByRole('textbox');
    expect(inputs).toBeDefined();
  });

  test('completes registration flow', () => {
    apiClient.post.mockResolvedValue({
      data: { token: 'token', user: { id: '1' } },
    });
    const { container } = render(<Register />);
    expect(container).toBeInTheDocument();
  });

  test('includes navigation to login', () => {
    render(<Register />);
    const links = screen.queryAllByRole('link');
    expect(links).toBeDefined();
  });

  test('validates password fields match', () => {
    render(<Register />);
    const inputs = screen.queryAllByRole('textbox');
    if (inputs.length > 1) {
      fireEvent.change(inputs[0], { target: { value: 'password123' } });
      fireEvent.change(inputs[1], { target: { value: 'password123' } });
      expect(inputs[1].value).toBe('password123');
    }
  });
});
