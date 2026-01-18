/**
 * Integration Tests
 * اختبارات التكامل الشاملة
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import App from '../src/App';

jest.mock('axios');

describe('Full Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('User Authentication Flow', () => {
    test('يجب أن يتم تسجيل المستخدم بنجاح', async () => {
      const user = userEvent.setup();

      // Mock API
      axios.post.mockResolvedValue({
        data: {
          token: 'test-jwt-token',
          user: { id: '1', name: 'Test User', email: 'test@example.com' },
        },
      });

      render(<App />);

      // ملء نموذج التسجيل
      const emailInput = await screen.findByPlaceholderText(/البريد الإلكتروني/i);
      const passwordInput = screen.getByPlaceholderText(/كلمة المرور/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      // إرسال النموذج
      const submitButton = screen.getByText(/تسجيل الدخول/i);
      await user.click(submitButton);

      // التحقق من النجاح
      await waitFor(() => {
        expect(localStorage.getItem('token')).toBe('test-jwt-token');
      });
    });

    test('يجب أن يعرض رسالة خطأ عند فشل التسجيل', async () => {
      const user = userEvent.setup();

      // Mock API لرجوع خطأ
      axios.post.mockRejectedValue(new Error('Invalid credentials'));

      render(<App />);

      const emailInput = await screen.findByPlaceholderText(/البريد الإلكتروني/i);
      const passwordInput = screen.getByPlaceholderText(/كلمة المرور/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');

      const submitButton = screen.getByText(/تسجيل الدخول/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/فشل التسجيل/i)).toBeInTheDocument();
      });
    });
  });

  describe('Document Management Flow', () => {
    test('يجب أن يتم تحميل المستندات من قائمة المستندات', async () => {
      // Mock API
      axios.get.mockResolvedValue({
        data: {
          documents: [
            {
              _id: '1',
              title: 'Test Doc',
              category: 'تقارير',
              fileSize: 1024,
              createdAt: new Date(),
            },
          ],
        },
      });

      render(<App />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/documents'));
      });
    });

    test('يجب أن يتم إنشاء مستند جديد', async () => {
      const user = userEvent.setup();

      axios.post.mockResolvedValue({
        data: { success: true, document: { _id: '1', title: 'New Document' } },
      });

      render(<App />);

      // ابحث عن زر رفع المستند
      const uploadButton = await screen.findByText(/رفع مستند/i);
      await user.click(uploadButton);

      // ملء النموذج
      const titleInput = screen.getByPlaceholderText(/العنوان/i);
      await user.type(titleInput, 'New Document');

      // ارسل النموذج
      const submitButton = screen.getByText(/حفظ/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/documents'), expect.any(Object));
      });
    });

    test('يجب أن يتم حذف المستند', async () => {
      const user = userEvent.setup();

      axios.delete.mockResolvedValue({ data: { success: true } });

      // محاكاة حالة لديها مستند
      axios.get.mockResolvedValue({
        data: {
          documents: [
            {
              _id: '1',
              title: 'Test Doc',
              category: 'تقارير',
              fileSize: 1024,
              createdAt: new Date(),
            },
          ],
        },
      });

      render(<App />);

      // ابحث عن زر الحذف
      const deleteButton = await screen.findByLabelText(/حذف/i);
      await user.click(deleteButton);

      // تأكيد الحذف
      const confirmButton = screen.getByText(/تأكيد/i);
      await user.click(confirmButton);

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalled();
      });
    });
  });

  describe('Search and Filter Flow', () => {
    test('يجب أن يتم البحث عن المستندات والتصفية', async () => {
      const user = userEvent.setup();

      axios.get.mockResolvedValue({
        data: {
          documents: [
            {
              _id: '1',
              title: 'Important Report',
              category: 'تقارير',
              fileSize: 1024,
              createdAt: new Date(),
            },
          ],
        },
      });

      render(<App />);

      // ابحث عن مربع البحث
      const searchInput = await screen.findByPlaceholderText(/البحث/i);
      await user.type(searchInput, 'Important');

      // تحقق من استدعاء API
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('q=Important'), expect.any(Object));
      });
    });
  });

  describe('Error Handling', () => {
    test('يجب أن يتم معالجة خطأ الشبكة بشكل صحيح', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/خطأ في الاتصال/i)).toBeInTheDocument();
      });
    });

    test('يجب أن يتم معالجة خطأ التفويض', async () => {
      axios.get.mockRejectedValue({
        response: { status: 401, data: { message: 'Unauthorized' } },
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/يجب تسجيل الدخول/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    test('يجب أن يتم تحميل الصفحة بسرعة', async () => {
      const startTime = performance.now();

      axios.get.mockResolvedValue({
        data: { documents: [] },
      });

      render(<App />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(3000); // يجب أن تكون أقل من 3 ثواني
    });
  });

  describe('Local Storage', () => {
    test('يجب أن يتم حفظ البيانات في localStorage', async () => {
      const user = userEvent.setup();

      axios.post.mockResolvedValue({
        data: {
          token: 'test-token',
          user: { id: '1', name: 'Test User' },
        },
      });

      render(<App />);

      const emailInput = await screen.findByPlaceholderText(/البريد الإلكتروني/i);
      const passwordInput = screen.getByPlaceholderText(/كلمة المرور/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password');

      const submitButton = screen.getByText(/تسجيل الدخول/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(localStorage.getItem('token')).toBeTruthy();
        expect(localStorage.getItem('user')).toBeTruthy();
      });
    });
  });

  describe('Responsive Design', () => {
    test('يجب أن تكون الواجهة متجاوبة على الأجهزة الصغيرة', () => {
      // تعيين حجم النافذة
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(max-width: 600px)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      render(<App />);

      // تحقق من وجود الواجهة
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });
});
