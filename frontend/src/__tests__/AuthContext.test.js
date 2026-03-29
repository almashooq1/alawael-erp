/**
 * AuthContext.js — Unit Tests
 * اختبارات وحدة لسياق المصادقة
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from 'contexts/AuthContext';

// Mock the api module (AuthContext imports from '../services/api')
const mockApi = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    get: (...args) => mockApi.get(...args),
    post: (...args) => mockApi.post(...args),
    put: (...args) => mockApi.put(...args),
    delete: (...args) => mockApi.delete(...args),
  },
}));

// Test component that exposes AuthContext values
function TestConsumer() {
  const { currentUser, login, logout, hasPermission, error } = useAuth();
  return (
    <div>
      <span data-testid="user">{currentUser ? JSON.stringify(currentUser) : 'null'}</span>
      <span data-testid="error">{error || 'none'}</span>
      <button data-testid="login-btn" onClick={() => login('admin@test.com', 'Admin@123')}>
        Login
      </button>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
      <span data-testid="perm">{String(hasPermission('users', 'read'))}</span>
    </div>
  );
}

function renderWithAuth() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  // Default: no stored token → skip fetchUser
  mockApi.get.mockResolvedValue(null);
});

// ═══════════════════════════════════════════════════════════════════
// Initial State
// ═══════════════════════════════════════════════════════════════════
describe('AuthProvider initial state', () => {
  test('renders children when no stored token', async () => {
    renderWithAuth();
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  test('fetches user when authToken exists in localStorage', async () => {
    localStorage.setItem('authToken', 'stored-token');
    mockApi.get.mockResolvedValue({ data: { id: 1, name: 'أحمد', role: 'admin' } });

    renderWithAuth();

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/auth/me');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// Login
// ═══════════════════════════════════════════════════════════════════
describe('login', () => {
  test('successful login stores token and sets user', async () => {
    const user = userEvent.setup();
    mockApi.post.mockResolvedValue({
      data: {
        accessToken: 'new-token',
        refreshToken: 'ref-token',
        user: { id: 1, name: 'أحمد', role: 'admin' },
      },
    });

    renderWithAuth();

    await user.click(screen.getByTestId('login-btn'));

    await waitFor(() => {
      expect(localStorage.getItem('authToken')).toBe('new-token');
    });

    expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
      email: 'admin@test.com',
      password: 'Admin@123',
    });
  });

  test('failed login sets error message', async () => {
    const user = userEvent.setup();
    mockApi.post.mockRejectedValue({
      status: 401,
      data: { message: 'بيانات غير صحيحة' },
    });

    renderWithAuth();
    await user.click(screen.getByTestId('login-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('error')).not.toHaveTextContent('none');
    });
  });

  test('network error shows connection message', async () => {
    const user = userEvent.setup();
    mockApi.post.mockRejectedValue({
      message: 'Network Error',
      code: 'ERR_NETWORK',
    });

    renderWithAuth();
    await user.click(screen.getByTestId('login-btn'));

    await waitFor(() => {
      const errorText = screen.getByTestId('error').textContent;
      expect(errorText).not.toBe('none');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// Logout
// ═══════════════════════════════════════════════════════════════════
describe('logout', () => {
  test('clears token and user', async () => {
    const user = userEvent.setup();
    // First login
    mockApi.post.mockResolvedValue({
      data: { accessToken: 'tok', user: { id: 1 } },
    });

    renderWithAuth();
    await user.click(screen.getByTestId('login-btn'));

    await waitFor(() => {
      expect(localStorage.getItem('authToken')).toBe('tok');
    });

    // Now logout
    await user.click(screen.getByTestId('logout-btn'));

    await waitFor(() => {
      expect(localStorage.getItem('authToken')).toBeNull();
      expect(screen.getByTestId('user')).toHaveTextContent('null');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// Permissions
// ═══════════════════════════════════════════════════════════════════
describe('hasPermission', () => {
  test('returns false when no user', () => {
    renderWithAuth();
    expect(screen.getByTestId('perm')).toHaveTextContent('false');
  });
});
