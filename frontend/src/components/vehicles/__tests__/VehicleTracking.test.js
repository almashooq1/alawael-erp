import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import VehicleTracking from '../VehicleTracking';

// Mock axios
jest.mock('axios');

// Mock react-router-dom
const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
  useParams: () => ({ id: '123' }),
}));

// Mock Google Maps
const mockMap = {
  setCenter: jest.fn(),
};

const mockMarker = {
  setPosition: jest.fn(),
};

const mockInfoWindow = {
  open: jest.fn(),
  setContent: jest.fn(),
};

global.google = {
  maps: {
    Map: jest.fn(() => mockMap),
    Marker: jest.fn(() => mockMarker),
    InfoWindow: jest.fn(() => mockInfoWindow),
  },
};

const mockVehicle = {
  _id: '123',
  type: 'bus',
  plateNumber: 'ABC-123',
  make: 'Mercedes',
  model: 'Sprinter',
  status: 'active',
  fuelLevel: 80,
  mileage: 50000,
  gpsLocation: {
    latitude: 24.7136,
    longitude: 46.6753,
    lastUpdate: '2024-01-20T10:30:00Z',
    speed: 45,
  },
};

describe('VehicleTracking Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <VehicleTracking />
      </BrowserRouter>
    );
  };

  test('renders tracking component', async () => {
    axios.get.mockResolvedValueOnce({ data: mockVehicle });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/تتبع المركبة/i)).toBeInTheDocument();
    });
  });

  test('loads vehicle data on mount', async () => {
    axios.get.mockResolvedValueOnce({ data: mockVehicle });

    renderComponent();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/vehicles/123'),
        expect.any(Object)
      );
    });

    expect(screen.getByText('ABC-123')).toBeInTheDocument();
  });

  test('initializes Google Map with vehicle location', async () => {
    axios.get.mockResolvedValueOnce({ data: mockVehicle });

    renderComponent();

    await waitFor(() => {
      expect(global.google.maps.Map).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          center: {
            lat: 24.7136,
            lng: 46.6753,
          },
          zoom: 14,
        })
      );
    });
  });

  test('displays vehicle status information', async () => {
    axios.get.mockResolvedValueOnce({ data: mockVehicle });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('نشط')).toBeInTheDocument();
      expect(screen.getByText(/80%/)).toBeInTheDocument(); // Fuel level
      expect(screen.getByText(/45 كم\/س/)).toBeInTheDocument(); // Speed
    });
  });

  test('displays GPS coordinates', async () => {
    axios.get.mockResolvedValueOnce({ data: mockVehicle });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/24.7136/)).toBeInTheDocument();
      expect(screen.getByText(/46.6753/)).toBeInTheDocument();
    });
  });

  test('enables auto-refresh by default', async () => {
    axios.get.mockResolvedValue({ data: mockVehicle });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('ABC-123')).toBeInTheDocument();
    });

    // Advance timer by 10 seconds
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2); // Initial + auto-refresh
    });
  });

  test('toggles auto-refresh on button click', async () => {
    axios.get.mockResolvedValue({ data: mockVehicle });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('ABC-123')).toBeInTheDocument();
    });

    const toggleButton = screen.getByText(/إيقاف التحديث التلقائي/i);
    fireEvent.click(toggleButton);

    expect(screen.getByText(/تفعيل التحديث التلقائي/i)).toBeInTheDocument();

    // Advance timer - should not trigger refresh
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // Should still be only 1 call (initial load)
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  test('manually refreshes data on button click', async () => {
    axios.get.mockResolvedValue({ data: mockVehicle });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('ABC-123')).toBeInTheDocument();
    });

    const refreshButton = screen.getByLabelText(/تحديث/i);
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2);
    });
  });

  test('updates marker position when location changes', async () => {
    const updatedVehicle = {
      ...mockVehicle,
      gpsLocation: {
        ...mockVehicle.gpsLocation,
        latitude: 25.0,
        longitude: 47.0,
      },
    };

    axios.get
      .mockResolvedValueOnce({ data: mockVehicle })
      .mockResolvedValueOnce({ data: updatedVehicle });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('ABC-123')).toBeInTheDocument();
    });

    // Trigger refresh
    const refreshButton = screen.getByLabelText(/تحديث/i);
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockMarker.setPosition).toHaveBeenCalledWith({
        lat: 25.0,
        lng: 47.0,
      });
    });
  });

  test('displays error message when GPS is not available', async () => {
    const vehicleWithoutGPS = {
      ...mockVehicle,
      gpsLocation: null,
    };

    axios.get.mockResolvedValueOnce({ data: vehicleWithoutGPS });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/GPS غير متاح/i)).toBeInTheDocument();
    });
  });

  test('displays last update time', async () => {
    axios.get.mockResolvedValueOnce({ data: mockVehicle });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/آخر تحديث/i)).toBeInTheDocument();
    });
  });

  test('displays emergency alerts if present', async () => {
    const vehicleWithAlerts = {
      ...mockVehicle,
      emergencyAlerts: [
        { type: 'low-fuel', message: 'وقود منخفض' },
        { type: 'maintenance-due', message: 'صيانة مستحقة' },
      ],
    };

    axios.get.mockResolvedValueOnce({ data: vehicleWithAlerts });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/وقود منخفض/i)).toBeInTheDocument();
      expect(screen.getByText(/صيانة مستحقة/i)).toBeInTheDocument();
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
      expect(screen.getByText(/فشل تحميل بيانات المركبة/i)).toBeInTheDocument();
    });
  });

  test('navigates back to vehicle details', async () => {
    axios.get.mockResolvedValueOnce({ data: mockVehicle });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('ABC-123')).toBeInTheDocument();
    });

    const backButton = screen.getByText(/رجوع/i);
    fireEvent.click(backButton);

    expect(mockedNavigate).toHaveBeenCalledWith('/vehicles/123');
  });

  test('cleans up interval on unmount', async () => {
    axios.get.mockResolvedValue({ data: mockVehicle });

    const { unmount } = renderComponent();

    await waitFor(() => {
      expect(screen.getByText('ABC-123')).toBeInTheDocument();
    });

    unmount();

    // Advance timer - should not trigger refresh after unmount
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(axios.get).toHaveBeenCalledTimes(1); // Only initial call
  });

  test('displays mileage information', async () => {
    axios.get.mockResolvedValueOnce({ data: mockVehicle });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/50000/)).toBeInTheDocument();
    });
  });

  test('opens info window on marker click', async () => {
    axios.get.mockResolvedValueOnce({ data: mockVehicle });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('ABC-123')).toBeInTheDocument();
    });

    // Verify info window was created
    expect(global.google.maps.InfoWindow).toHaveBeenCalled();
  });
});
