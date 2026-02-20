import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import TripList from '../TripList';

// Mock axios
jest.mock('axios');

// Mock react-router-dom
const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
}));

const mockTrips = [
  {
    _id: '1',
    route: { _id: 'r1', name: 'طريق المدارس', startPoint: 'الرياض', endPoint: 'الدمام' },
    vehicle: { _id: 'v1', plateNumber: 'ABC-123', make: 'Mercedes' },
    driver: { _id: 'd1', name: 'أحمد محمد' },
    status: 'scheduled',
    scheduledStartTime: '2024-01-25T07:00:00Z',
    passengers: {
      current: 0,
      capacity: 25,
    },
  },
  {
    _id: '2',
    route: { _id: 'r2', name: 'طريق الموظفين', startPoint: 'جدة', endPoint: 'مكة' },
    vehicle: { _id: 'v2', plateNumber: 'XYZ-789', make: 'Toyota' },
    driver: { _id: 'd2', name: 'محمد علي' },
    status: 'in-progress',
    scheduledStartTime: '2024-01-25T08:00:00Z',
    actualStartTime: '2024-01-25T08:05:00Z',
    passengers: {
      current: 15,
      capacity: 30,
    },
  },
  {
    _id: '3',
    route: { _id: 'r3', name: 'طريق المستشفيات', startPoint: 'الخبر', endPoint: 'الظهران' },
    vehicle: { _id: 'v3', plateNumber: 'DEF-456', make: 'Ford' },
    driver: { _id: 'd3', name: 'خالد أحمد' },
    status: 'completed',
    scheduledStartTime: '2024-01-24T09:00:00Z',
    actualStartTime: '2024-01-24T09:10:00Z',
    actualEndTime: '2024-01-24T11:30:00Z',
    passengers: {
      current: 20,
      capacity: 35,
    },
  },
  {
    _id: '4',
    route: { _id: 'r4', name: 'طريق الجامعات', startPoint: 'أبها', endPoint: 'خميس مشيط' },
    vehicle: { _id: 'v4', plateNumber: 'GHI-789', make: 'Hyundai' },
    driver: { _id: 'd4', name: 'عبدالله سعد' },
    status: 'cancelled',
    scheduledStartTime: '2024-01-25T10:00:00Z',
    cancellationReason: 'عطل في المركبة',
    passengers: {
      current: 0,
      capacity: 40,
    },
  },
];

describe('TripList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <TripList />
      </BrowserRouter>
    );
  };

  test('renders trip list component', async () => {
    axios.get.mockResolvedValueOnce({ data: mockTrips });

    renderComponent();

    expect(screen.getByText(/إدارة الرحلات/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('طريق المدارس')).toBeInTheDocument();
    });
  });

  test('displays loading state initially', () => {
    axios.get.mockImplementation(() => new Promise(() => {}));

    renderComponent();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('displays error message on API failure', async () => {
    axios.get.mockRejectedValueOnce(new Error('Network Error'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/فشل تحميل الرحلات/i)).toBeInTheDocument();
    });
  });

  test('calculates statistics correctly', async () => {
    axios.get.mockResolvedValueOnce({ data: mockTrips });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('4')).toBeInTheDocument(); // Total trips
      expect(screen.getByText('1')).toBeInTheDocument(); // In-progress
      expect(screen.getByText('1')).toBeInTheDocument(); // Completed
      expect(screen.getByText('1')).toBeInTheDocument(); // Scheduled
    });
  });

  test('filters trips by tab - All', async () => {
    axios.get.mockResolvedValueOnce({ data: mockTrips });

    renderComponent();

    await waitFor(() => {
      const allTab = screen.getByRole('tab', { name: /الكل/i });
      fireEvent.click(allTab);
    });

    await waitFor(() => {
      expect(screen.getByText('طريق المدارس')).toBeInTheDocument();
      expect(screen.getByText('طريق الموظفين')).toBeInTheDocument();
      expect(screen.getByText('طريق المستشفيات')).toBeInTheDocument();
    });
  });

  test('filters trips by tab - Active', async () => {
    axios.get.mockResolvedValueOnce({ data: mockTrips });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('طريق المدارس')).toBeInTheDocument();
    });

    const activeTab = screen.getByRole('tab', { name: /النشطة/i });
    fireEvent.click(activeTab);

    await waitFor(() => {
      expect(screen.getByText('طريق الموظفين')).toBeInTheDocument();
      expect(screen.queryByText('طريق المستشفيات')).not.toBeInTheDocument();
    });
  });

  test('filters trips by tab - Completed', async () => {
    axios.get.mockResolvedValueOnce({ data: mockTrips });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('طريق المدارس')).toBeInTheDocument();
    });

    const completedTab = screen.getByRole('tab', { name: /المكتملة/i });
    fireEvent.click(completedTab);

    await waitFor(() => {
      expect(screen.getByText('طريق المستشفيات')).toBeInTheDocument();
      expect(screen.queryByText('طريق الموظفين')).not.toBeInTheDocument();
    });
  });

  test('filters trips by tab - Cancelled', async () => {
    axios.get.mockResolvedValueOnce({ data: mockTrips });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('طريق المدارس')).toBeInTheDocument();
    });

    const cancelledTab = screen.getByRole('tab', { name: /الملغاة/i });
    fireEvent.click(cancelledTab);

    await waitFor(() => {
      expect(screen.getByText('طريق الجامعات')).toBeInTheDocument();
      expect(screen.queryByText('طريق المدارس')).not.toBeInTheDocument();
    });
  });

  test('searches trips by route name', async () => {
    axios.get.mockResolvedValueOnce({ data: mockTrips });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('طريق المدارس')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/بحث/i);
    fireEvent.change(searchInput, { target: { value: 'المدارس' } });

    await waitFor(() => {
      expect(screen.getByText('طريق المدارس')).toBeInTheDocument();
      expect(screen.queryByText('طريق الموظفين')).not.toBeInTheDocument();
    });
  });

  test('searches trips by vehicle plate number', async () => {
    axios.get.mockResolvedValueOnce({ data: mockTrips });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('طريق المدارس')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/بحث/i);
    fireEvent.change(searchInput, { target: { value: 'ABC-123' } });

    await waitFor(() => {
      expect(screen.getByText('طريق المدارس')).toBeInTheDocument();
      expect(screen.queryByText('طريق الموظفين')).not.toBeInTheDocument();
    });
  });

  test('starts a scheduled trip', async () => {
    axios.get.mockResolvedValueOnce({ data: mockTrips });
    axios.post.mockResolvedValueOnce({ data: { success: true } });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('طريق المدارس')).toBeInTheDocument();
    });

    const startButtons = screen.getAllByText(/بدء الرحلة/i);
    fireEvent.click(startButtons[0]);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/trips/1/start'),
        expect.anything(),
        expect.any(Object)
      );
    });
  });

  test('completes an in-progress trip with confirmation', async () => {
    axios.get.mockResolvedValueOnce({ data: mockTrips });
    axios.post.mockResolvedValueOnce({ data: { success: true } });

    window.confirm = jest.fn(() => true);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('طريق الموظفين')).toBeInTheDocument();
    });

    const completeButtons = screen.getAllByText(/إنهاء الرحلة/i);
    fireEvent.click(completeButtons[0]);

    expect(window.confirm).toHaveBeenCalled();

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/trips/2/complete'),
        expect.anything(),
        expect.any(Object)
      );
    });
  });

  test('does not complete trip when confirmation is cancelled', async () => {
    axios.get.mockResolvedValueOnce({ data: mockTrips });

    window.confirm = jest.fn(() => false);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('طريق الموظفين')).toBeInTheDocument();
    });

    const completeButtons = screen.getAllByText(/إنهاء الرحلة/i);
    fireEvent.click(completeButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('displays passenger count', async () => {
    axios.get.mockResolvedValueOnce({ data: mockTrips });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/15 \/ 30/)).toBeInTheDocument(); // In-progress trip
      expect(screen.getByText(/20 \/ 35/)).toBeInTheDocument(); // Completed trip
    });
  });

  test('displays correct status chips', async () => {
    axios.get.mockResolvedValueOnce({ data: mockTrips });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('مجدولة')).toBeInTheDocument();
      expect(screen.getByText('قيد التنفيذ')).toBeInTheDocument();
      expect(screen.getByText('مكتملة')).toBeInTheDocument();
      expect(screen.getByText('ملغاة')).toBeInTheDocument();
    });
  });

  test('navigates to trip details on view button click', async () => {
    axios.get.mockResolvedValueOnce({ data: mockTrips });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('طريق المدارس')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByLabelText(/عرض التفاصيل/i);
    fireEvent.click(viewButtons[0]);

    expect(mockedNavigate).toHaveBeenCalledWith('/trips/1');
  });

  test('shows edit button only for scheduled and in-progress trips', async () => {
    axios.get.mockResolvedValueOnce({ data: mockTrips });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('طريق المدارس')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByLabelText(/تعديل/i);
    // Should have 2 edit buttons (scheduled + in-progress)
    expect(editButtons).toHaveLength(2);
  });

  test('displays driver names', async () => {
    axios.get.mockResolvedValueOnce({ data: mockTrips });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
      expect(screen.getByText('محمد علي')).toBeInTheDocument();
      expect(screen.getByText('خالد أحمد')).toBeInTheDocument();
    });
  });

  test('displays vehicle information', async () => {
    axios.get.mockResolvedValueOnce({ data: mockTrips });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/ABC-123/)).toBeInTheDocument();
      expect(screen.getByText(/Mercedes/)).toBeInTheDocument();
    });
  });

  test('handles empty trip list', async () => {
    axios.get.mockResolvedValueOnce({ data: [] });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/لا توجد رحلات/i)).toBeInTheDocument();
    });
  });

  test('refreshes data after successful trip start', async () => {
    axios.get.mockResolvedValue({ data: mockTrips });
    axios.post.mockResolvedValueOnce({ data: { success: true } });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('طريق المدارس')).toBeInTheDocument();
    });

    const startButtons = screen.getAllByText(/بدء الرحلة/i);
    fireEvent.click(startButtons[0]);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2); // Initial + refresh
    });
  });

  test('displays error alert on API failure for trip actions', async () => {
    axios.get.mockResolvedValueOnce({ data: mockTrips });
    axios.post.mockRejectedValueOnce(new Error('Server Error'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('طريق المدارس')).toBeInTheDocument();
    });

    const startButtons = screen.getAllByText(/بدء الرحلة/i);
    fireEvent.click(startButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/فشل تنفيذ العملية/i)).toBeInTheDocument();
    });
  });

  test('formats scheduled time correctly', async () => {
    axios.get.mockResolvedValueOnce({ data: mockTrips });

    renderComponent();

    await waitFor(() => {
      // Should display formatted date/time
      const timeElements = screen.getAllByText(/\d{4}-\d{2}-\d{2}/);
      expect(timeElements.length).toBeGreaterThan(0);
    });
  });

  test('navigates to add trip page', async () => {
    axios.get.mockResolvedValueOnce({ data: mockTrips });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('طريق المدارس')).toBeInTheDocument();
    });

    const addButton = screen.getByText(/إضافة رحلة/i);
    fireEvent.click(addButton);

    expect(mockedNavigate).toHaveBeenCalledWith('/trips/new');
  });
});
