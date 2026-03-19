/**
 * React Component Tests for Disability Rehabilitation Frontend
 * Jest + React Testing Library
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from '../components/DisabilityRehabilitation/Dashboard';
import CreateProgram from '../components/DisabilityRehabilitation/CreateProgram';
import ProgramDetails from '../components/DisabilityRehabilitation/ProgramDetails';
import axios from 'axios';

jest.mock('axios');

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render dashboard with statistics', async () => {
    const mockData = {
      stats: {
        totalPrograms: 25,
        activePrograms: 15,
        completedPrograms: 8,
        successRate: 92,
      },
      programs: [],
    };

    axios.get.mockResolvedValue({ data: { data: mockData } });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/البرامج الإجمالية/i)).toBeInTheDocument();
    });
  });

  it('should load programs from API', async () => {
    const mockPrograms = [
      {
        _id: '1',
        program_info: { name_ar: 'برنامج 1', status: 'active' },
        disability_info: { primary_disability: 'physical' },
      },
    ];

    axios.get.mockResolvedValue({
      data: {
        data: mockPrograms,
        pagination: { page: 1, limit: 10, total: 1 }
      }
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });
  });

  it('should display error message on API failure', async () => {
    axios.get.mockRejectedValue(new Error('API Error'));

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/خطأ في تحميل البيانات/i)).toBeInTheDocument();
    });
  });

  it('should filter programs by disability type', async () => {
    axios.get.mockResolvedValue({
      data: {
        data: [],
        pagination: { page: 1, limit: 10, total: 0 }
      }
    });

    render(<Dashboard />);

    const filterButton = screen.getByText(/نوع الإعاقة/i);
    fireEvent.click(filterButton);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('disability_type'),
        expect.any(Object)
      );
    });
  });
});

describe('CreateProgram Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render form with all sections', () => {
    render(<CreateProgram />);

    expect(screen.getByText(/معلومات البرنامج/i)).toBeInTheDocument();
    expect(screen.getByText(/بيانات المستفيد/i)).toBeInTheDocument();
    expect(screen.getByText(/معلومات الإعاقة/i)).toBeInTheDocument();
    expect(screen.getByText(/الأهداف التأهيلية/i)).toBeInTheDocument();
    expect(screen.getByText(/الخدمات/i)).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    const { getByRole } = render(<CreateProgram />);

    const submitButton = getByRole('button', { name: /إنشاء البرنامج/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/هذا الحقل مطلوب/i)).toBeInTheDocument();
    });
  });

  it('should submit form with valid data', async () => {
    axios.post.mockResolvedValue({
      data: {
        success: true,
        data: { _id: '123' }
      }
    });

    render(<CreateProgram />);

    // Fill form fields
    const programNameInput = screen.getByLabelText(/اسم البرنامج \(عربي\)/i);
    await userEvent.type(programNameInput, 'برنامج تجريبي');

    const submitButton = screen.getByRole('button', { name: /إنشاء البرنامج/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/programs'),
        expect.any(Object)
      );
    });
  });

  it('should add dynamic goals', async () => {
    render(<CreateProgram />);

    const addGoalButton = screen.getByText(/إضافة هدف/i);
    fireEvent.click(addGoalButton);

    await waitFor(() => {
      const goalInputs = screen.getAllByLabelText(/وصف الهدف/i);
      expect(goalInputs.length).toBeGreaterThan(0);
    });
  });

  it('should add dynamic services', async () => {
    render(<CreateProgram />);

    const addServiceButton = screen.getByText(/إضافة خدمة/i);
    fireEvent.click(addServiceButton);

    await waitFor(() => {
      const serviceSelects = screen.getAllByLabelText(/نوع الخدمة/i);
      expect(serviceSelects.length).toBeGreaterThan(0);
    });
  });
});

describe('ProgramDetails Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockProgram = {
    _id: '123',
    program_info: {
      name_ar: 'برنامج التفاصيل',
      status: 'active',
    },
    beneficiary: {
      name_ar: 'مستفيد',
      date_of_birth: '2000-01-01',
    },
    disability_info: {
      primary_disability: 'physical',
    },
    rehabilitation_goals: [
      {
        goal_id: 'goal1',
        description_ar: 'هدف 1',
        status: 'in_progress',
        progress_percentage: 50,
      },
    ],
    therapy_sessions: [
      {
        session_id: 'ses1',
        session_date: new Date(),
        duration_minutes: 60,
      },
    ],
    assessments: [],
    rehabilitation_services: [],
  };

  it('should render program details', async () => {
    axios.get.mockResolvedValue({ data: { data: mockProgram } });

    render(<ProgramDetails programId="123" />);

    await waitFor(() => {
      expect(screen.getByText(/برنامج التفاصيل/i)).toBeInTheDocument();
    });
  });

  it('should display tabs for different sections', async () => {
    axios.get.mockResolvedValue({ data: { data: mockProgram } });

    render(<ProgramDetails programId="123" />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /الأهداف/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /الجلسات/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /التقييمات/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /الخدمات/i })).toBeInTheDocument();
    });
  });

  it('should switch between tabs', async () => {
    axios.get.mockResolvedValue({ data: { data: mockProgram } });

    render(<ProgramDetails programId="123" />);

    const sessionsTab = await screen.findByRole('tab', { name: /الجلسات/i });
    fireEvent.click(sessionsTab);

    await waitFor(() => {
      expect(sessionsTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('should open modal to add session', async () => {
    axios.get.mockResolvedValue({ data: { data: mockProgram } });

    render(<ProgramDetails programId="123" />);

    const addSessionButton = await screen.findByText(/إضافة جلسة/i);
    fireEvent.click(addSessionButton);

    await waitFor(() => {
      expect(screen.getByText(/تفاصيل الجلسة/i)).toBeInTheDocument();
    });
  });

  it('should display progress percentage', async () => {
    axios.get.mockResolvedValue({ data: { data: mockProgram } });

    render(<ProgramDetails programId="123" />);

    await waitFor(() => {
      expect(screen.getByText(/نسبة التقدم/i)).toBeInTheDocument();
    });
  });

  it('should complete program', async () => {
    axios.get.mockResolvedValue({ data: { data: mockProgram } });
    axios.put.mockResolvedValue({ data: { success: true } });

    render(<ProgramDetails programId="123" />);

    const completeButton = await screen.findByText(/إنهاء البرنامج/i);
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        expect.stringContaining('/complete'),
        expect.any(Object)
      );
    });
  });
});

describe('Accessibility Tests', () => {
  it('Dashboard should be keyboard navigable', () => {
    render(<Dashboard />);

    const filterButton = screen.getByRole('button', { name: /تصفية/i });
    filterButton.focus();

    fireEvent.keyDown(filterButton, { key: 'Enter', code: 'Enter' });

    expect(filterButton).toHaveFocus();
  });

  it('Forms should have proper labels', () => {
    render(<CreateProgram />);

    const inputs = screen.getAllByRole('textbox');
    inputs.forEach(input => {
      expect(input).toHaveAccessibleName();
    });
  });
});

describe('Responsive Design Tests', () => {
  it('Dashboard should be responsive', () => {
    // Set mobile viewport
    global.innerWidth = 375;
    global.innerHeight = 667;

    render(<Dashboard />);

    const dashboard = screen.getByTestId('dashboard-container');
    expect(dashboard).toHaveClass('dashboard-mobile');
  });
});
