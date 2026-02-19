import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Login from './Login';
import apiClient from '../utils/api';

// Mock the API client
jest.mock('../utils/api', () => ({
  post: jest.fn(),
}));

// Mock localStorage
const localStorageMock = (() => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}))();
global.localStorage = localStorageMock;

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.setItem.mockClear();
  });

  test('renders login form with title', () => {
    const onLogin = jest.fn();
    render(<Login onLogin={onLogin} />);
    // The component renders a form with h2 title
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  test('renders username and password input fields', () => {
    const onLogin = jest.fn();
    render(<Login onLogin={onLogin} />);

    const usernameInput = screen.getByPlaceholderText(/المستخدم|username|الاسم/i);
    const passwordInput = screen.getByPlaceholderText(/المرور|password|الكلمة/i);

    expect(usernameInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
  });

  test('updates form state on input change', () => {
    const onLogin = jest.fn();
    render(<Login onLogin={onLogin} />);

    const usernameInput = screen.getByPlaceholderText(/المستخدم|username|الاسم/i);
    const passwordInput = screen.getByPlaceholderText(/المرور|password|الكلمة/i);

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpass' } });

    expect(usernameInput.value).toBe('testuser');
    expect(passwordInput.value).toBe('testpass');
  });

  test('renders submit button', () => {
    const onLogin = jest.fn();
    render(<Login onLogin={onLogin} />);

    const submitBtn = screen.getByRole('button');
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn.type).toBe('submit');
  });

  test('calls API on form submission', async () => {
    apiClient.post.mockResolvedValue({
      data: { token: 'test-token', user: { id: '1' } },
    });

    const onLogin = jest.fn();
    render(<Login onLogin={onLogin} />);

    const usernameInput = screen.getByPlaceholderText(/المستخدم|username|الاسم/i);
    const passwordInput = screen.getByPlaceholderText(/المرور|password|الكلمة/i);

    fireEvent.change(usernameInput, { target: { value: 'user' } });
    fireEvent.change(passwordInput, { target: { value: 'pass' } });

    const submitBtn = screen.getByRole('button');
    fireEvent.click(submitBtn);

    // The async behavior is tested via the mock
    expect(apiClient.post).toHaveBeenCalled();
  });

  test('has correct form structure and styling', () => {
    const onLogin = jest.fn();
    const { container } = render(<Login onLogin={onLogin} />);

    const form = container.querySelector('form');
    expect(form).toBeInTheDocument();
    expect(form.style.maxWidth).toBe('320px');
    expect(form.style.borderRadius).toBe('8px');
  });
});
