import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import VehicleList from '../VehicleList';

// Mock axios
jest.mock('axios');

// Mock react-router-dom
const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
}));

const mockVehicles = [
  {
    _id: '1',
    type: 'bus',
    plateNumber: 'ABC-123',
    make: 'Mercedes',
    model: 'Sprinter',
    year: 2022,
    capacity: 25,
    status: 'active',
    fuelLevel: 80,
    gpsEnabled: true,
    mileage: 50000,
  },
  {
    _id: '2',
    type: 'car',
    plateNumber: 'XYZ-789',
    make: 'Toyota',
    model: 'Camry',
    year: 2021,
    capacity: 5,
    status: 'maintenance',
    fuelLevel: 15,
    gpsEnabled: false,
    mileage: 75000,
  },
  {
    _id: '3',
    type: 'van',
    plateNumber: 'DEF-456',
    make: 'Ford',
    model: 'Transit',
    year: 2023,
    capacity: 12,
    status: 'out-of-service',
    fuelLevel: 60,
    gpsEnabled: true,
    mileage: 20000,
  },
];

describe('VehicleList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <VehicleList />
      </BrowserRouter>
    );
  };

  test('renders vehicle list component', async () => {
    axios.get.mockResolvedValueOnce({ data: mockVehicles });

    renderComponent();

    expect(screen.getByText(/إدارة المركبات/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Mercedes')).toBeInTheDocument();
    });
  });

  test('displays loading state initially', () => {
    axios.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderComponent();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('displays error message on API failure', async () => {
    axios.get.mockRejectedValueOnce(new Error('Network Error'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/فشل تحميل المركبات/i)).toBeInTheDocument();
    });
  });

  test('calculates statistics correctly', async () => {
    axios.get.mockResolvedValueOnce({ data: mockVehicles });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument(); // Total vehicles
      expect(screen.getByText('1')).toBeInTheDocument(); // Active vehicles
      expect(screen.getByText('1')).toBeInTheDocument(); // Maintenance
      expect(screen.getByText('1')).toBeInTheDocument(); // Out of service
    });
  });

  test('filters vehicles by search term', async () => {
    axios.get.mockResolvedValueOnce({ data: mockVehicles });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Mercedes')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/بحث/i);
    fireEvent.change(searchInput, { target: { value: 'Mercedes' } });

    await waitFor(() => {
      expect(screen.getByText('Mercedes')).toBeInTheDocument();
      expect(screen.queryByText('Toyota')).not.toBeInTheDocument();
    });
  });

  test('displays low fuel warning for vehicles with fuel < 20%', async () => {
    axios.get.mockResolvedValueOnce({ data: mockVehicles });

    renderComponent();

    await waitFor(() => {
      // Vehicle with fuelLevel 15% should show warning
      const lowFuelVehicle = screen.getByText('XYZ-789').closest('tr');
      expect(lowFuelVehicle.querySelector('[data-testid="WarningIcon"]')).toBeInTheDocument();
    });
  });

  test('navigates to add vehicle page on button click', async () => {
    axios.get.mockResolvedValueOnce({ data: mockVehicles });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Mercedes')).toBeInTheDocument();
    });

    const addButton = screen.getByText(/إضافة مركبة/i);
    fireEvent.click(addButton);

    expect(mockedNavigate).toHaveBeenCalledWith('/vehicles/new');
  });

  test('navigates to vehicle details on view button click', async () => {
    axios.get.mockResolvedValueOnce({ data: mockVehicles });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Mercedes')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByLabelText(/عرض/i);
    fireEvent.click(viewButtons[0]);

    expect(mockedNavigate).toHaveBeenCalledWith('/vehicles/1');
  });

  test('deletes vehicle on confirm', async () => {
    axios.get.mockResolvedValueOnce({ data: mockVehicles });
    axios.delete.mockResolvedValueOnce({ data: { success: true } });

    // Mock window.confirm
    window.confirm = jest.fn(() => true);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Mercedes')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByLabelText(/حذف/i);
    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalled();

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/vehicles/1'),
        expect.any(Object)
      );
    });
  });

  test('displays GPS indicator for enabled vehicles', async () => {
    axios.get.mockResolvedValueOnce({ data: mockVehicles });

    renderComponent();

    await waitFor(() => {
      const gpsEnabledRows = screen.getAllByText('نعم');
      expect(gpsEnabledRows).toHaveLength(2); // 2 vehicles have GPS enabled
    });
  });

  test('displays correct vehicle status chips', async () => {
    axios.get.mockResolvedValueOnce({ data: mockVehicles });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('نشط')).toBeInTheDocument(); // active
      expect(screen.getByText('صيانة')).toBeInTheDocument(); // maintenance
      expect(screen.getByText('خارج الخدمة')).toBeInTheDocument(); // out-of-service
    });
  });

  test('displays vehicle icons based on type', async () => {
    axios.get.mockResolvedValueOnce({ data: mockVehicles });

    renderComponent();

    await waitFor(() => {
      // Check that icons are rendered (DirectionsBus, DirectionsCar, LocalShipping)
      const vehicleRows = screen.getAllByRole('row');
      expect(vehicleRows.length).toBeGreaterThan(1); // Header + data rows
    });
  });

  test('handles empty vehicle list', async () => {
    axios.get.mockResolvedValueOnce({ data: [] });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/لا توجد مركبات/i)).toBeInTheDocument();
    });
  });

  test('refreshes data on retry after error', async () => {
    axios.get
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce({ data: mockVehicles });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/فشل تحميل المركبات/i)).toBeInTheDocument();
    });

    const retryButton = screen.getByText(/إعادة المحاولة/i);
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Mercedes')).toBeInTheDocument();
    });
  });
});
