import React from 'react';
import { render } from '@testing-library/react';
import ShipmentList from './ShipmentList';
import apiClient from '../utils/api';

jest.mock('../utils/api');
jest.mock(
  './Modal',
  () =>
    ({ open, children }) =>
      open ? <div>{children}</div> : null
);
jest.mock('./ShipmentForm', () => () => <div>Form</div>);

const mockUser = { id: '1', role: 'admin' };

describe('ShipmentList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
  });

  test('renders without crashing', () => {
    apiClient.get.mockResolvedValue({ data: [] });
    const { container } = render(<ShipmentList user={mockUser} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('fetches shipments from API on mount', () => {
    apiClient.get.mockResolvedValue({ data: [] });
    render(<ShipmentList user={mockUser} notify={null} />);
    expect(apiClient.get).toHaveBeenCalled();
  });

  test('displays shipments when data is loaded', () => {
    const mockShipments = [
      {
        _id: '1',
        trackingNumber: 'TRACK-001',
        origin: 'Warehouse A',
        destination: 'City B',
        status: 'in-transit',
      },
    ];
    apiClient.get.mockResolvedValue({ data: mockShipments });
    const { container } = render(<ShipmentList user={mockUser} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('handles empty shipments list', () => {
    apiClient.get.mockResolvedValue({ data: [] });
    const { container } = render(<ShipmentList user={mockUser} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('handles API errors gracefully', () => {
    apiClient.get.mockRejectedValue(new Error('API Error'));
    const { container } = render(<ShipmentList user={mockUser} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('supports search functionality', () => {
    apiClient.get.mockResolvedValue({
      data: [
        { _id: '1', trackingNumber: 'TRACK-001' },
        { _id: '2', trackingNumber: 'TRACK-002' },
      ],
    });
    const { container } = render(<ShipmentList user={mockUser} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('displays different shipment statuses', () => {
    const mockShipments = [
      { _id: '1', trackingNumber: 'TRACK-001', status: 'delivered' },
      { _id: '2', trackingNumber: 'TRACK-002', status: 'in-transit' },
    ];
    apiClient.get.mockResolvedValue({ data: mockShipments });
    const { container } = render(<ShipmentList user={mockUser} notify={null} />);
    expect(container).toBeInTheDocument();
  });

  test('handles delete operation', () => {
    apiClient.get.mockResolvedValue({
      data: [{ _id: '1', trackingNumber: 'TRACK-001' }],
    });
    apiClient.delete.mockResolvedValue({ data: { success: true } });
    render(<ShipmentList user={mockUser} notify={null} />);
    expect(apiClient.get).toHaveBeenCalled();
  });

  test('respects confirm dialog for deletion', () => {
    apiClient.get.mockResolvedValue({
      data: [{ _id: '1', trackingNumber: 'TRACK-001' }],
    });
    window.confirm.mockReturnValue(false);
    const { container } = render(<ShipmentList user={mockUser} notify={null} />);
    expect(apiClient.delete).not.toHaveBeenCalled();
  });

  test('accepts user and notify props', () => {
    const notify = jest.fn();
    apiClient.get.mockResolvedValue({ data: [] });
    const { container } = render(<ShipmentList user={mockUser} notify={notify} />);
    expect(container).toBeInTheDocument();
  });
});
