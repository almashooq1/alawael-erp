import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import VehicleForm from '../VehicleForm';

// Mock axios
jest.mock('axios');

// Mock react-router-dom
const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
  useParams: jest.fn(),
}));

const mockVehicle = {
  _id: '123',
  type: 'bus',
  plateNumber: 'ABC-123',
  make: 'Mercedes',
  model: 'Sprinter',
  year: 2022,
  capacity: 25,
  fuelType: 'diesel',
  fuelCapacity: 100,
  fuelLevel: 80,
  mileage: 50000,
  status: 'active',
  gpsEnabled: true,
  insuranceExpiry: '2025-12-31',
  registrationExpiry: '2025-12-31',
  notes: 'Test vehicle',
};

describe('VehicleForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (isEditMode = false) => {
    const { useParams } = require('react-router-dom');
    useParams.mockReturnValue(isEditMode ? { id: '123' } : {});

    return render(
      <BrowserRouter>
        <VehicleForm />
      </BrowserRouter>
    );
  };

  test('renders form in create mode', () => {
    renderComponent();

    expect(screen.getByText(/إضافة مركبة جديدة/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/نوع المركبة/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/رقم اللوحة/i)).toBeInTheDocument();
  });

  test('loads vehicle data in edit mode', async () => {
    axios.get.mockResolvedValueOnce({ data: mockVehicle });

    renderComponent(true);

    await waitFor(() => {
      expect(screen.getByDisplayValue('ABC-123')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Mercedes')).toBeInTheDocument();
    });
  });

  test('validates required fields', async () => {
    renderComponent();

    const saveButton = screen.getByText(/حفظ/i);
    fireEvent.click(saveButton);

    await waitFor(() => {
      // Form validation should prevent submission
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  test('submits form with valid data in create mode', async () => {
    axios.post.mockResolvedValueOnce({ data: mockVehicle });

    renderComponent();

    // Fill form fields
    fireEvent.change(screen.getByLabelText(/رقم اللوحة/i), {
      target: { value: 'ABC-123' },
    });
    fireEvent.change(screen.getByLabelText(/الصنع/i), {
      target: { value: 'Mercedes' },
    });
    fireEvent.change(screen.getByLabelText(/الطراز/i), {
      target: { value: 'Sprinter' },
    });
    fireEvent.change(screen.getByLabelText(/السنة/i), {
      target: { value: '2022' },
    });
    fireEvent.change(screen.getByLabelText(/السعة/i), {
      target: { value: '25' },
    });

    const saveButton = screen.getByText(/حفظ/i);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/vehicles'),
        expect.objectContaining({
          plateNumber: 'ABC-123',
          make: 'Mercedes',
          model: 'Sprinter',
        }),
        expect.any(Object)
      );
    });
  });

  test('submits form with valid data in edit mode', async () => {
    axios.get.mockResolvedValueOnce({ data: mockVehicle });
    axios.put.mockResolvedValueOnce({ data: mockVehicle });

    renderComponent(true);

    await waitFor(() => {
      expect(screen.getByDisplayValue('ABC-123')).toBeInTheDocument();
    });

    const makeInput = screen.getByDisplayValue('Mercedes');
    fireEvent.change(makeInput, { target: { value: 'BMW' } });

    const saveButton = screen.getByText(/حفظ/i);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        expect.stringContaining('/vehicles/123'),
        expect.objectContaining({
          make: 'BMW',
        }),
        expect.any(Object)
      );
    });
  });

  test('displays success message after save', async () => {
    axios.post.mockResolvedValueOnce({ data: mockVehicle });

    renderComponent();

    // Fill required fields
    fireEvent.change(screen.getByLabelText(/رقم اللوحة/i), {
      target: { value: 'ABC-123' },
    });
    fireEvent.change(screen.getByLabelText(/الصنع/i), {
      target: { value: 'Mercedes' },
    });

    const saveButton = screen.getByText(/حفظ/i);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/تم حفظ المركبة بنجاح/i)).toBeInTheDocument();
    });
  });

  test('navigates back after successful save', async () => {
    axios.post.mockResolvedValueOnce({ data: mockVehicle });

    renderComponent();

    // Fill required fields and submit
    fireEvent.change(screen.getByLabelText(/رقم اللوحة/i), {
      target: { value: 'ABC-123' },
    });

    const saveButton = screen.getByText(/حفظ/i);
    fireEvent.click(saveButton);

    await waitFor(
      () => {
        expect(mockedNavigate).toHaveBeenCalledWith('/vehicles');
      },
      { timeout: 3000 }
    );
  });

  test('validates year field range', async () => {
    renderComponent();

    const yearInput = screen.getByLabelText(/السنة/i);

    // Test invalid year
    fireEvent.change(yearInput, { target: { value: '1900' } });
    fireEvent.blur(yearInput);

    // Form should show validation error
    const saveButton = screen.getByText(/حفظ/i);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  test('validates capacity field range', async () => {
    renderComponent();

    const capacityInput = screen.getByLabelText(/السعة/i);

    // Test invalid capacity (0)
    fireEvent.change(capacityInput, { target: { value: '0' } });
    fireEvent.blur(capacityInput);

    const saveButton = screen.getByText(/حفظ/i);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  test('validates fuel level percentage', async () => {
    renderComponent();

    const fuelLevelInput = screen.getByLabelText(/مستوى الوقود/i);

    // Test invalid fuel level (> 100)
    fireEvent.change(fuelLevelInput, { target: { value: '150' } });
    fireEvent.blur(fuelLevelInput);

    const saveButton = screen.getByText(/حفظ/i);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  test('displays error message on API failure', async () => {
    axios.post.mockRejectedValueOnce(new Error('Server Error'));

    renderComponent();

    // Fill required fields
    fireEvent.change(screen.getByLabelText(/رقم اللوحة/i), {
      target: { value: 'ABC-123' },
    });

    const saveButton = screen.getByText(/حفظ/i);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/فشل حفظ المركبة/i)).toBeInTheDocument();
    });
  });

  test('cancels and navigates back', () => {
    renderComponent();

    const cancelButton = screen.getByText(/إلغاء/i);
    fireEvent.click(cancelButton);

    expect(mockedNavigate).toHaveBeenCalledWith('/vehicles');
  });

  test('renders all vehicle type options', () => {
    renderComponent();

    const typeSelect = screen.getByLabelText(/نوع المركبة/i);
    fireEvent.mouseDown(typeSelect);

    expect(screen.getByText(/حافلة/i)).toBeInTheDocument();
    expect(screen.getByText(/سيارة/i)).toBeInTheDocument();
    expect(screen.getByText(/فان/i)).toBeInTheDocument();
    expect(screen.getByText(/شاحنة/i)).toBeInTheDocument();
  });

  test('renders all fuel type options', () => {
    renderComponent();

    const fuelTypeSelect = screen.getByLabelText(/نوع الوقود/i);
    fireEvent.mouseDown(fuelTypeSelect);

    expect(screen.getByText(/بنزين/i)).toBeInTheDocument();
    expect(screen.getByText(/ديزل/i)).toBeInTheDocument();
    expect(screen.getByText(/كهربائي/i)).toBeInTheDocument();
    expect(screen.getByText(/هجين/i)).toBeInTheDocument();
  });

  test('renders all status options', () => {
    renderComponent();

    const statusSelect = screen.getByLabelText(/الحالة/i);
    fireEvent.mouseDown(statusSelect);

    expect(screen.getByText(/نشط/i)).toBeInTheDocument();
    expect(screen.getByText(/صيانة/i)).toBeInTheDocument();
    expect(screen.getByText(/خارج الخدمة/i)).toBeInTheDocument();
  });

  test('handles GPS toggle', () => {
    renderComponent();

    const gpsCheckbox = screen.getByLabelText(/GPS مفعل/i);

    expect(gpsCheckbox).not.toBeChecked();

    fireEvent.click(gpsCheckbox);

    expect(gpsCheckbox).toBeChecked();
  });

  test('displays loading state while fetching data in edit mode', () => {
    axios.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderComponent(true);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
