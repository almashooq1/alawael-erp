/**
 * اختبارات مكون Login
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import Login from '../pages/Auth/Login';

const mockStore = configureMockStore();

describe('Login Component', () => {
  let store;

  beforeEach(() => {
    store = mockStore({
      auth: {
        loading: false,
        error: null,
        user: null,
      },
    });
  });

  const renderLogin = () => {
    return render(
      <Provider store={store}>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </Provider>,
    );
  };

  test('يجب أن يعرض نموذج تسجيل الدخول', () => {
    renderLogin();
    expect(screen.getByText(/تسجيل الدخول/i)).toBeInTheDocument();
  });

  test('يجب أن يحتوي على حقل البريد الإلكتروني', () => {
    renderLogin();
    const emailInput = screen.getByPlaceholderText(/البريد الإلكتروني/i);
    expect(emailInput).toBeInTheDocument();
  });

  test('يجب أن يحتوي على حقل كلمة المرور', () => {
    renderLogin();
    const passwordInput = screen.getByPlaceholderText(/كلمة المرور/i);
    expect(passwordInput).toBeInTheDocument();
  });

  test('يجب أن يحتوي على زر تسجيل الدخول', () => {
    renderLogin();
    const loginButton = screen.getByRole('button', { name: /تسجيل الدخول/i });
    expect(loginButton).toBeInTheDocument();
  });

  test('يجب تحديث قيمة البريد الإلكتروني عند الكتابة', async () => {
    renderLogin();
    const emailInput = screen.getByPlaceholderText(/البريد الإلكتروني/i);

    await userEvent.type(emailInput, 'test@example.com');
    expect(emailInput.value).toBe('test@example.com');
  });

  test('يجب تحديث قيمة كلمة المرور عند الكتابة', async () => {
    renderLogin();
    const passwordInput = screen.getByPlaceholderText(/كلمة المرور/i);

    await userEvent.type(passwordInput, 'password123');
    expect(passwordInput.value).toBe('password123');
  });

  test('يجب عدم السماح بتسجيل دخول برسالة فارغة', async () => {
    renderLogin();
    const loginButton = screen.getByRole('button', { name: /تسجيل الدخول/i });

    fireEvent.click(loginButton);

    // يجب أن يكون الزر معطل أو يظهر رسالة خطأ
    await waitFor(() => {
      expect(screen.getByText(/يرجى إدخال بيانات صحيحة/i)).toBeInTheDocument();
    });
  });

  test('يجب عدم السماح بتسجيل دخول برقم سري قصير', async () => {
    renderLogin();
    const emailInput = screen.getByPlaceholderText(/البريد الإلكتروني/i);
    const passwordInput = screen.getByPlaceholderText(/كلمة المرور/i);
    const loginButton = screen.getByRole('button', { name: /تسجيل الدخول/i });

    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, '123');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/كلمة المرور قصيرة جداً/i)).toBeInTheDocument();
    });
  });

  test('يجب أن يعرض حالة التحميل أثناء التسجيل', () => {
    store = mockStore({
      auth: {
        loading: true,
        error: null,
        user: null,
      },
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </Provider>,
    );

    const loginButton = screen.getByRole('button');
    expect(loginButton).toBeDisabled();
  });

  test('يجب أن يعرض رسالة خطأ', () => {
    store = mockStore({
      auth: {
        loading: false,
        error: 'بيانات الدخول غير صحيحة',
        user: null,
      },
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </Provider>,
    );

    expect(screen.getByText(/بيانات الدخول غير صحيحة/i)).toBeInTheDocument();
  });
});
