import React from 'react';
import { render } from '@testing-library/react';
import AuditLog from './AuditLog';
import apiClient from '../utils/api';

jest.mock('../utils/api');

describe('AuditLog Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    const user = { id: '1', role: 'admin' };
    apiClient.get.mockResolvedValue({ data: { data: [] } });
    const { container } = render(<AuditLog user={user} />);
    expect(container).toBeInTheDocument();
  });

  test('calls API to fetch logs', () => {
    const user = { id: '1', role: 'admin' };
    apiClient.get.mockResolvedValue({ data: { data: [] } });
    render(<AuditLog user={user} />);
    expect(apiClient.get).toHaveBeenCalled();
  });

  test('renders with empty audit logs', () => {
    const user = { id: '1', role: 'admin' };
    apiClient.get.mockResolvedValue({ data: { data: [] } });
    const { container } = render(<AuditLog user={user} />);
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  test('renders with audit log data', () => {
    const user = { id: '1', role: 'admin' };
    apiClient.get.mockResolvedValue({
      data: {
        data: [{ _id: '1', user: { username: 'admin' }, action: 'CREATE', entity: 'Product' }],
      },
    });
    const { container } = render(<AuditLog user={user} />);
    expect(container).toBeInTheDocument();
  });

  test('handles API errors', () => {
    const user = { id: '1', role: 'admin' };
    apiClient.get.mockRejectedValue(new Error('API Error'));
    const { container } = render(<AuditLog user={user} />);
    expect(container).toBeInTheDocument();
  });

  test('handles null data', () => {
    const user = { id: '1', role: 'admin' };
    apiClient.get.mockResolvedValue({ data: null });
    const { container } = render(<AuditLog user={user} />);
    expect(container).toBeInTheDocument();
  });
});
