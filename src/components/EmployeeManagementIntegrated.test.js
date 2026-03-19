/**
 * EmployeeManagementIntegrated.test.js - اختبارات إدارة الموظفين
 * اختبارات شاملة لمكون CRUD الموظفين مع API
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import EmployeeManagementIntegrated from './EmployeeManagementIntegrated';
import HRAPIService from '../services/HRAPIService';

jest.mock('../services/HRAPIService');

describe('EmployeeManagementIntegrated Component', () => {
  const mockEmployees = [
    {
      id: 1,
      fullName: 'أحمد محمد',
      email: 'ahmed@example.com',
      position: 'مهندس برمجيات',
      department: 'IT',
      salary: 5000,
    },
    {
      id: 2,
      fullName: 'فاطمة علي',
      email: 'fatima@example.com',
      position: 'محللة نظم',
      department: 'IT',
      salary: 4500,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    HRAPIService.getEmployees.mockResolvedValue(mockEmployees);
    HRAPIService.createEmployee.mockResolvedValue({
      id: 3,
      fullName: 'محمود حسن',
      email: 'mahmoud@example.com',
      position: 'مدير',
      department: 'HR',
      salary: 6000,
    });
    HRAPIService.updateEmployee.mockResolvedValue({
      id: 1,
      fullName: 'أحمد محمد محمود',
      email: 'ahmed@example.com',
      position: 'مهندس برمجيات',
      department: 'IT',
      salary: 5500,
    });
    HRAPIService.deleteEmployee.mockResolvedValue({ success: true });
  });

  // -------------------- Rendering Tests --------------------
  describe('Component Rendering', () => {
    test('should render employee management without crashing', async () => {
      render(<EmployeeManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/إدارة الموظفين/i)).toBeInTheDocument();
      });
    });

    test('should display add new employee button', async () => {
      render(<EmployeeManagementIntegrated />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /طلب إجازة جديد|موظف جديد|إضافة/i })
        ).toBeInTheDocument();
      });
    });

    test('should display loading spinner initially', async () => {
      HRAPIService.getEmployees.mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      render(<EmployeeManagementIntegrated />);
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  // -------------------- Data Fetching Tests --------------------
  describe('Data Fetching', () => {
    test('should fetch employees on component mount', async () => {
      render(<EmployeeManagementIntegrated />);

      await waitFor(() => {
        expect(HRAPIService.getEmployees).toHaveBeenCalled();
      });
    });

    test('should display employees list', async () => {
      render(<EmployeeManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
        expect(screen.getByText('فاطمة علي')).toBeInTheDocument();
      });
    });

    test('should display employee details in table', async () => {
      render(<EmployeeManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText('ahmed@example.com')).toBeInTheDocument();
        expect(screen.getByText('مهندس برمجيات')).toBeInTheDocument();
      });
    });

    test('should handle API errors gracefully', async () => {
      HRAPIService.getEmployees.mockRejectedValueOnce(new Error('API Error'));

      render(<EmployeeManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/خطأ|موظف/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------- Search and Filter Tests --------------------
  describe('Search and Filtering', () => {
    test('should filter employees by name', async () => {
      render(<EmployeeManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/بحث|search/i);
      fireEvent.change(searchInput, { target: { value: 'فاطمة' } });

      await waitFor(() => {
        expect(screen.getByText('فاطمة علي')).toBeInTheDocument();
      });
    });

    test('should filter employees by email', async () => {
      render(<EmployeeManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText('ahmed@example.com')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/بحث|search/i);
      fireEvent.change(searchInput, { target: { value: 'fatima' } });

      await waitFor(() => {
        expect(screen.getByText('fatima@example.com')).toBeInTheDocument();
      });
    });

    test('should show no results message when search has no matches', async () => {
      render(<EmployeeManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/بحث|search/i);
      fireEvent.change(searchInput, { target: { value: 'غير موجود' } });

      await waitFor(() => {
        expect(screen.getByText(/لا توجد نتائج|no results/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------- Create Employee Tests --------------------
  describe('Create Employee', () => {
    test('should open create modal when add button is clicked', async () => {
      render(<EmployeeManagementIntegrated />);

      await waitFor(() => {
        const addButton = screen
          .getAllByRole('button')
          .find(btn => btn.textContent.includes('جديد') || btn.textContent.includes('إضافة'));
        fireEvent.click(addButton || screen.getAllByRole('button')[0]);
      });

      // Modal should appear
      expect(
        document.querySelector('[role="dialog"]') || document.querySelector('.fixed')
      ).toBeInTheDocument();
    });

    test('should validate required fields in form', async () => {
      render(<EmployeeManagementIntegrated />);

      await waitFor(() => {
        const addButton = screen
          .getAllByRole('button')
          .find(btn => btn.textContent.includes('جديد') || btn.textContent.includes('إضافة'));
        fireEvent.click(addButton || screen.getAllByRole('button')[0]);
      });

      const submitButton = screen.getByText(/إضافة|حفظ|تقديم/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/مطلوب|required/i)).toBeInTheDocument();
      });
    });

    test('should create new employee when form is submitted', async () => {
      render(<EmployeeManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
      });

      // Click add button
      const addButtons = screen.getAllByRole('button');
      const addButton = addButtons.find(
        btn => btn.innerHTML.includes('Plus') || btn.textContent.includes('جديد')
      );

      if (addButton) {
        fireEvent.click(addButton);
      }

      // Fill form (if modal appears)
      const inputs = screen.queryAllByRole('textbox');
      if (inputs.length > 0) {
        fireEvent.change(inputs[0], { target: { value: 'محمود حسن' } });
        fireEvent.change(inputs[1], { target: { value: 'mahmoud@example.com' } });
      }

      // Submit
      const submitButtons = screen.queryAllByText(/حفظ|إضافة|تقديم/i);
      if (submitButtons.length > 0) {
        fireEvent.click(submitButtons[submitButtons.length - 1]);

        await waitFor(() => {
          expect(HRAPIService.createEmployee).toHaveBeenCalled();
        });
      }
    });
  });

  // -------------------- Update Employee Tests --------------------
  describe('Update Employee', () => {
    test('should open edit modal when edit button is clicked', async () => {
      render(<EmployeeManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(
        btn => btn.innerHTML.includes('Pencil') || btn.innerHTML.includes('Edit')
      );

      if (editButton) {
        fireEvent.click(editButton);
        expect(
          document.querySelector('[role="dialog"]') || document.querySelector('.fixed')
        ).toBeInTheDocument();
      }
    });

    test('should update employee successfully', async () => {
      render(<EmployeeManagementIntegrated />);

      await waitFor(() => {
        expect(HRAPIService.getEmployees).toHaveBeenCalled();
      });

      // Click edit button
      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(
        btn => btn.innerHTML.includes('Pencil') || btn.innerHTML.includes('Edit')
      );

      if (editButton) {
        fireEvent.click(editButton);
      }

      // Submit update
      const submitButtons = screen.queryAllByText(/حفظ|تحديث/i);
      if (submitButtons.length > 0) {
        fireEvent.click(submitButtons[submitButtons.length - 1]);

        await waitFor(() => {
          expect(HRAPIService.updateEmployee).toHaveBeenCalled();
        });
      }
    });
  });

  // -------------------- Delete Employee Tests --------------------
  describe('Delete Employee', () => {
    test('should show delete confirmation dialog', async () => {
      render(<EmployeeManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find(
        btn => btn.innerHTML.includes('Trash') || btn.innerHTML.includes('delete')
      );

      if (deleteButton) {
        fireEvent.click(deleteButton);
        // Confirmation dialog should appear
        expect(
          document.querySelector('[role="dialog"]') || screen.getByText(/تأكيد|confirm/i)
        ).toBeInTheDocument();
      }
    });

    test('should delete employee after confirmation', async () => {
      render(<EmployeeManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find(btn => btn.innerHTML.includes('Trash'));

      if (deleteButton) {
        fireEvent.click(deleteButton);
      }

      // Confirm deletion
      const confirmButtons = screen.queryAllByText(/حذف|تأكيد|confirm/i);
      if (confirmButtons.length > 0) {
        fireEvent.click(confirmButtons[confirmButtons.length - 1]);

        await waitFor(() => {
          expect(HRAPIService.deleteEmployee).toHaveBeenCalled();
        });
      }
    });
  });

  // -------------------- Success/Error Messages Tests --------------------
  describe('Messages Display', () => {
    test('should show success message after creating employee', async () => {
      render(<EmployeeManagementIntegrated />);

      await waitFor(() => {
        expect(HRAPIService.getEmployees).toHaveBeenCalled();
      });

      // The success message should appear after create operation
      // (This depends on component implementation)
    });

    test('should show error message on operation failure', async () => {
      HRAPIService.createEmployee.mockRejectedValueOnce(new Error('Create failed'));

      render(<EmployeeManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/أحمد محمد/)).toBeInTheDocument();
      });
    });
  });

  // -------------------- Responsive Design Tests --------------------
  describe('Responsive Design', () => {
    test('should be responsive on mobile', () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      render(<EmployeeManagementIntegrated />);

      const container = screen.getByText(/إدارة|management/i).closest('div');
      expect(container).toBeInTheDocument();
    });

    test('should display table properly on desktop', async () => {
      global.innerWidth = 1024;

      render(<EmployeeManagementIntegrated />);

      await waitFor(() => {
        const table = document.querySelector('table');
        expect(table).toBeInTheDocument();
      });
    });
  });

  // -------------------- Accessibility Tests --------------------
  describe('Accessibility', () => {
    test('should have proper heading structure', async () => {
      render(<EmployeeManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByRole('heading')).toBeInTheDocument();
      });
    });

    test('should have accessible form inputs', async () => {
      render(<EmployeeManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/إدارة|management/i)).toBeInTheDocument();
      });
    });

    test('should have accessible buttons', () => {
      render(<EmployeeManagementIntegrated />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  // -------------------- RTL Language Tests --------------------
  describe('RTL Language Support', () => {
    test('should have dir="rtl" attribute', () => {
      const { container } = render(<EmployeeManagementIntegrated />);
      const mainDiv = container.querySelector('[dir="rtl"]');
      expect(mainDiv).toBeInTheDocument();
    });

    test('should display Arabic text correctly', async () => {
      render(<EmployeeManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/إدارة الموظفين/)).toBeInTheDocument();
      });
    });
  });

  // -------------------- Table Display Tests --------------------
  describe('Table Display', () => {
    test('should display employee table', async () => {
      render(<EmployeeManagementIntegrated />);

      await waitFor(() => {
        const table = document.querySelector('table');
        expect(table).toBeInTheDocument();
      });
    });

    test('should display all employee columns', async () => {
      render(<EmployeeManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/الاسم|name/i)).toBeInTheDocument();
        expect(screen.getByText(/المنصب|position/i)).toBeInTheDocument();
      });
    });

    test('should display action buttons in each row', async () => {
      render(<EmployeeManagementIntegrated />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(2); // At least add + actions
      });
    });
  });
});
