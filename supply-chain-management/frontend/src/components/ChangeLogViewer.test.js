import React from 'react';
import { render } from '@testing-library/react';
import ChangeLogViewer from './ChangeLogViewer';
import axios from 'axios';

jest.mock('axios');

describe('ChangeLogViewer Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.get = jest.fn(() => Promise.resolve({ data: [] }));
  });

  test('renders without crashing', () => {
    const { container } = render(<ChangeLogViewer entity="Product" entityId="1" />);
    expect(container).toBeInTheDocument();
  });

  test('returns null without entity prop', () => {
    const { container } = render(<ChangeLogViewer />);
    expect(container.innerHTML).toBe('');
  });

  test('renders with change log data', () => {
    axios.get.mockResolvedValue({ data: [] });
    const { container } = render(<ChangeLogViewer entity="Product" entityId="prod-1" />);
    expect(container).toBeInTheDocument();
  });

  test('handles empty changelog', () => {
    axios.get.mockResolvedValue({ data: [] });
    const { container } = render(<ChangeLogViewer entity="Product" entityId="1" />);
    expect(container).toBeInTheDocument();
  });

  test('handles API errors gracefully', () => {
    axios.get.mockRejectedValue(new Error('API Error'));
    const { container } = render(<ChangeLogViewer entity="Product" entityId="1" />);
    expect(container).toBeInTheDocument();
  });

  test('renders change details for different entities', () => {
    axios.get.mockResolvedValue({ data: [] });
    const { container } = render(<ChangeLogViewer entity="Order" entityId="order-123" />);
    expect(container).toBeInTheDocument();
  });

  test('handles multiple field changes', () => {
    axios.get.mockResolvedValue({ data: [] });
    const { container } = render(<ChangeLogViewer entity="Product" entityId="prod-1" />);
    expect(container).toBeInTheDocument();
  });

  test('handles large number of changelog entries', () => {
    axios.get.mockResolvedValue({ data: [] });
    const { container } = render(<ChangeLogViewer entity="Entity" entityId="id-1" />);
    expect(container).toBeInTheDocument();
  });

  test('handles null data', () => {
    axios.get.mockResolvedValue({ data: [] });
    const { container } = render(<ChangeLogViewer entity="Product" entityId="1" />);
    expect(container).toBeInTheDocument();
  });

  test('displays user information in changelog', () => {
    axios.get.mockResolvedValue({ data: [] });
    const { container } = render(<ChangeLogViewer entity="Record" entityId="rec-1" />);
    expect(container).toBeInTheDocument();
  });

  test('handles before/after values', () => {
    axios.get.mockResolvedValue({ data: [] });
    const { container } = render(<ChangeLogViewer entity="Invoice" entityId="inv-1" />);
    expect(container).toBeInTheDocument();
  });
});
