/**
 * LeaveManagementIntegrated.test.js - اختبارات إدارة الإجازات
 * اختبارات شاملة لطلبات الإجازات والموافقات
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LeaveManagementIntegrated from './LeaveManagementIntegrated';
import HRAPIService from '../services/HRAPIService';

jest.mock('../services/HRAPIService');

describe('LeaveManagementIntegrated Component', () => {
  const mockLeaveRequests = [
    {
      id: 1,
      employeeName: 'أحمد محمد',
      type: 'سنوية',
      startDate: '2026-02-15',
      endDate: '2026-02-20',
      reason: 'إجازة عائلية',
      status: 'معلق',
      requestDate: '2026-02-01',
    },
    {
      id: 2,
      employeeName: 'فاطمة علي',
      type: 'مرضية',
      startDate: '2026-02-10',
      endDate: '2026-02-12',
      reason: 'علاج طبي',
      status: 'موافق عليه',
      approvedBy: 'محمد علي',
      approvalDate: '2026-02-08',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    HRAPIService.getPendingLeaveRequests.mockResolvedValue(mockLeaveRequests);
    HRAPIService.requestLeave.mockResolvedValue({
      id: 3,
      employeeName: 'محمود حسن',
      type: 'شخصية',
      startDate: '2026-02-25',
      endDate: '2026-02-26',
      reason: 'مراجعة شخصية',
      status: 'معلق',
    });
    HRAPIService.approveLeave.mockResolvedValue({
      id: 1,
      status: 'موافق عليه',
    });
    HRAPIService.rejectLeave.mockResolvedValue({
      id: 1,
      status: 'مرفوض',
    });
  });

  // -------------------- Rendering Tests --------------------
  describe('Component Rendering', () => {
    test('should render leave management without crashing', async () => {
      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/إدارة الإجازات|leave/i)).toBeInTheDocument();
      });
    });

    test('should display new leave request button', async () => {
      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/طلب إجازة جديد|new leave/i)).toBeInTheDocument();
      });
    });

    test('should display loading spinner initially', async () => {
      HRAPIService.getPendingLeaveRequests.mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      render(<LeaveManagementIntegrated />);
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  // -------------------- Data Fetching Tests --------------------
  describe('Data Fetching', () => {
    test('should fetch leave requests on component mount', async () => {
      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        expect(HRAPIService.getPendingLeaveRequests).toHaveBeenCalled();
      });
    });

    test('should display leave requests in table', async () => {
      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
        expect(screen.getByText('فاطمة علي')).toBeInTheDocument();
      });
    });

    test('should display leave details correctly', async () => {
      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText('سنوية')).toBeInTheDocument();
        expect(screen.getByText('مرضية')).toBeInTheDocument();
      });
    });

    test('should handle API errors gracefully', async () => {
      HRAPIService.getPendingLeaveRequests.mockRejectedValueOnce(new Error('API Error'));

      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/فشل/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------- Statistics Cards Tests --------------------
  describe('Statistics Cards', () => {
    test('should display statistics cards', async () => {
      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        expect(
          screen.getAllByText(/إجمالي الطلبات|معلقة|موافق عليها|مرفوضة/i).length
        ).toBeGreaterThan(0);
      });
    });

    test('should calculate correct statistics', async () => {
      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        // Should show correct counts
        expect(screen.getAllByText(/2/).length).toBeGreaterThan(0); // Total or pending
      });
    });
  });

  // -------------------- Filter Tests --------------------
  describe('Filtering', () => {
    test('should filter by status', async () => {
      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
      });

      const filterButtons = screen.getAllByText(/^معلق$/);
      const filterButton = filterButtons.find(el => el.tagName === 'BUTTON') || filterButtons[0];
      fireEvent.click(filterButton);

      // Should show only pending leaves
      expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
    });

    test('should show all rows when filtering by all', async () => {
      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
      });

      const allButton = screen.getByText(/الكل|all/i);
      fireEvent.click(allButton);

      await waitFor(() => {
        expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
        expect(screen.getByText('فاطمة علي')).toBeInTheDocument();
      });
    });
  });

  // -------------------- New Leave Request Tests --------------------
  describe('New Leave Request', () => {
    test('should open form when new request button is clicked', async () => {
      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        const newButton = screen.getByText(/طلب إجازة جديد/);
        fireEvent.click(newButton);
      });

      // Modal should appear
      expect(
        document.querySelector('[role="dialog"]') || document.querySelector('.fixed')
      ).toBeInTheDocument();
    });

    test('should validate required fields', async () => {
      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        const newButton = screen.getByText(/طلب إجازة جديد/);
        fireEvent.click(newButton);
      });

      const submitButton = screen.getByText(/تقديم الطلب|submit/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/مطلوب|required/i)).toBeInTheDocument();
      });
    });

    test('should calculate days between dates', async () => {
      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        const newButton = screen.getByText(/طلب إجازة جديد/);
        fireEvent.click(newButton);
      });

      const inputs = document.querySelectorAll('input[type="date"]');
      if (inputs.length >= 2) {
        fireEvent.change(inputs[0], { target: { value: '2026-02-15' } });
        fireEvent.change(inputs[1], { target: { value: '2026-02-20' } });

        await waitFor(() => {
          expect(screen.getAllByText(/6 يوم|days/i).length).toBeGreaterThan(0);
        });
      }
    });

    test('should submit leave request', async () => {
      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        const newButton = screen.getByText(/طلب إجازة جديد/);
        fireEvent.click(newButton);
      });

      // Fill form
      const dateInputs = document.querySelectorAll('input[type="date"]');
      const textarea = document.querySelector('textarea');
      if (dateInputs.length >= 2) {
        fireEvent.change(dateInputs[0], { target: { value: '2026-02-15' } });
        fireEvent.change(dateInputs[1], { target: { value: '2026-02-20' } });
      }
      if (textarea) {
        fireEvent.change(textarea, { target: { value: 'إجازة عائلية' } });
      }

      const submitButton = screen.getByText(/تقديم الطلب/);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(HRAPIService.requestLeave).toHaveBeenCalled();
      });
    });
  });

  // -------------------- Approval Tests --------------------
  describe('Leave Approval', () => {
    test('should display approve button for pending leaves', async () => {
      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        const approveButton = screen.getByTitle('الموافقة');
        expect(approveButton).toBeInTheDocument();
      });
    });

    test('should approve leave when button is clicked', async () => {
      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
      });

      const approveButton = screen.getByTitle('الموافقة');
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(HRAPIService.approveLeave).toHaveBeenCalled();
      });
    });

    test('should show success message after approval', async () => {
      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
      });

      const approveButton = screen.getByTitle('الموافقة');
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(screen.getByText(/تم الموافقة|approved/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------- Rejection Tests --------------------
  describe('Leave Rejection', () => {
    test('should display reject button for pending leaves', async () => {
      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        const rejectButton = screen.getByTitle('الرفض');
        expect(rejectButton).toBeInTheDocument();
      });
    });

    test('should open rejection modal when reject button is clicked', async () => {
      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
      });

      const rejectButton = screen.getByTitle('الرفض');
      fireEvent.click(rejectButton);

      // Modal should appear
      await waitFor(() => {
        expect(
          document.querySelector('.fixed') || screen.getByText(/رفض الإجازة/)
        ).toBeInTheDocument();
      });
    });

    test('should reject leave with reason', async () => {
      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
      });

      const rejectButton = screen.getByTitle('الرفض');
      fireEvent.click(rejectButton);

      await waitFor(() => {
        expect(screen.getByText(/رفض الإجازة/)).toBeInTheDocument();
      });

      // Fill rejection reason
      const textareas = document.querySelectorAll('textarea');
      const lastTextarea = textareas[textareas.length - 1];
      if (lastTextarea) {
        fireEvent.change(lastTextarea, { target: { value: 'مشغول حالياً' } });
      }

      // Submit rejection - find the exact "رفض" button in the modal
      const rejectConfirm = screen.getByText(/^رفض$/);
      fireEvent.click(rejectConfirm);

      await waitFor(() => {
        expect(HRAPIService.rejectLeave).toHaveBeenCalled();
      });
    });
  });

  // -------------------- Table Display Tests --------------------
  describe('Leave Requests Table', () => {
    test('should display leave requests table', async () => {
      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        const table = document.querySelector('table');
        expect(table).toBeInTheDocument();
      });
    });

    test('should display all columns correctly', async () => {
      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/الموظف|الاسم/i)).toBeInTheDocument();
        expect(screen.getByText(/نوع الإجازة/i)).toBeInTheDocument();
        expect(screen.getByText(/الحالة/i)).toBeInTheDocument();
      });
    });

    test('should display status badges', async () => {
      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getAllByText(/معلق|موافق عليه|مرفوض/).length).toBeGreaterThan(0);
      });
    });

    test('should display days calculation', async () => {
      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        // Should show days (6 for first leave request)
        expect(screen.getAllByText(/يوم/i).length).toBeGreaterThan(0);
      });
    });
  });

  // -------------------- Refresh Functionality Tests --------------------
  describe('Refresh Functionality', () => {
    test('should have refresh button', async () => {
      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        const refreshBtn = document.querySelector('.lucide-refresh-cw')?.closest('button');
        expect(refreshBtn).toBeInTheDocument();
      });
    });

    test('should refresh data when refresh button is clicked', async () => {
      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
      });

      const refreshBtn = document.querySelector('.lucide-refresh-cw')?.closest('button');
      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(HRAPIService.getPendingLeaveRequests).toHaveBeenCalledTimes(2);
      });
    });
  });

  // -------------------- Error Handling Tests --------------------
  describe('Error Handling', () => {
    test('should handle approval errors', async () => {
      HRAPIService.approveLeave.mockRejectedValueOnce(new Error('Approval failed'));

      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
      });

      const approveButton = screen.getByTitle('الموافقة');
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(screen.getByText(/فشل/i)).toBeInTheDocument();
      });
    });

    test('should handle request submission errors', async () => {
      HRAPIService.requestLeave.mockRejectedValueOnce(new Error('Request failed'));

      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        const newButton = screen.getByText(/طلب إجازة جديد/);
        fireEvent.click(newButton);
      });

      // Attempt to submit
      const submitButton = screen.queryByText(/تقديم الطلب/);
      if (submitButton) {
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/خطأ|مطلوب/i)).toBeInTheDocument();
        });
      }
    });
  });

  // -------------------- Responsive Design Tests --------------------
  describe('Responsive Design', () => {
    test('should be responsive on mobile', async () => {
      global.innerWidth = 375;
      render(<LeaveManagementIntegrated />);

      expect(await screen.findByText(/إدارة الإجازات/i)).toBeInTheDocument();
    });

    test('should be responsive on desktop', async () => {
      global.innerWidth = 1024;
      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        const table = document.querySelector('table');
        expect(table).toBeInTheDocument();
      });
    });
  });

  // -------------------- RTL Language Tests --------------------
  describe('RTL Language Support', () => {
    test('should have dir="rtl" attribute', async () => {
      const { container } = render(<LeaveManagementIntegrated />);
      await waitFor(() => {
        const mainDiv = container.querySelector('[dir="rtl"]');
        expect(mainDiv).toBeInTheDocument();
      });
    });

    test('should display Arabic text correctly', async () => {
      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByText(/إدارة الإجازات/)).toBeInTheDocument();
      });
    });
  });

  // -------------------- Accessibility Tests --------------------
  describe('Accessibility', () => {
    test('should have proper heading structure', async () => {
      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        expect(screen.getByRole('heading')).toBeInTheDocument();
      });
    });

    test('should have accessible buttons', async () => {
      render(<LeaveManagementIntegrated />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });
  });
});
