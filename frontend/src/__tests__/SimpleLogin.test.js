/**
 * SimpleLogin.jsx — Component Tests
 * اختبارات مكون صفحة تسجيل الدخول
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── Mocks ─────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockLogin = jest.fn();
jest.mock('contexts/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

const mockShowSnackbar = jest.fn();
jest.mock('contexts/SnackbarContext', () => ({
  useSnackbar: () => mockShowSnackbar,
}));

jest.mock('utils/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

jest.mock('theme/palette', () => ({
  gradients: { primary: 'linear-gradient(135deg, #667eea, #764ba2)' },
}));

jest.mock('utils/lazyLoader', () => ({
  prefetchRoutes: jest.fn(),
}));

// Import after mocks
import SimpleLogin from 'pages/common/SimpleLogin';

beforeEach(() => {
  jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════
// Rendering
// ═══════════════════════════════════════════════════════════════════
// Helper: password field needs selector:'input' because MUI visibility toggle
// button also has aria-label containing "كلمة المرور"
const getPasswordField = () =>
  screen.getByLabelText(/كلمة المرور/i, { selector: 'input' });

describe('SimpleLogin rendering', () => {
  test('renders email and password fields', () => {
    render(<SimpleLogin />);
    expect(screen.getByLabelText(/البريد الإلكتروني/i)).toBeInTheDocument();
    expect(getPasswordField()).toBeInTheDocument();
  });

  test('renders login button', () => {
    render(<SimpleLogin />);
    expect(screen.getByRole('button', { name: /تسجيل الدخول/i })).toBeInTheDocument();
  });

  test('renders branding text', () => {
    render(<SimpleLogin />);
    expect(screen.getByRole('heading', { name: /نظام مراكز الأوائل/i })).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════
// Form interaction
// ═══════════════════════════════════════════════════════════════════
describe('SimpleLogin form interaction', () => {
  test('allows typing in email and password fields', async () => {
    const user = userEvent.setup();
    render(<SimpleLogin />);

    const emailField = screen.getByLabelText(/البريد الإلكتروني/i);
    const passwordField = getPasswordField();

    await user.clear(emailField);
    await user.type(emailField, 'test@example.com');
    expect(emailField).toHaveValue('test@example.com');

    await user.clear(passwordField);
    await user.type(passwordField, 'MyP@ss123');
    expect(passwordField).toHaveValue('MyP@ss123');
  });

  test('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<SimpleLogin />);

    const passwordField = getPasswordField();
    expect(passwordField).toHaveAttribute('type', 'password');

    const toggleBtn = screen.getByLabelText(/إظهار كلمة المرور/i);
    await user.click(toggleBtn);
    expect(passwordField).toHaveAttribute('type', 'text');
  });
});

// ═══════════════════════════════════════════════════════════════════
// Login flow
// ═══════════════════════════════════════════════════════════════════
describe('SimpleLogin submit', () => {
  test('successful login navigates to /dashboard', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: true });

    render(<SimpleLogin />);

    const emailField = screen.getByLabelText(/البريد الإلكتروني/i);
    const passwordField = getPasswordField();

    await user.clear(emailField);
    await user.type(emailField, 'admin@test.com');
    await user.clear(passwordField);
    await user.type(passwordField, 'Admin@123');

    await user.click(screen.getByRole('button', { name: /تسجيل الدخول/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@test.com', 'Admin@123');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      expect(mockShowSnackbar).toHaveBeenCalledWith('تم تسجيل الدخول بنجاح!', 'success');
    });
  });

  test('failed login shows error alert', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: false, error: 'بيانات غير صحيحة' });

    render(<SimpleLogin />);

    const emailField = screen.getByLabelText(/البريد الإلكتروني/i);
    const passwordField = getPasswordField();

    await user.clear(emailField);
    await user.type(emailField, 'wrong@test.com');
    await user.clear(passwordField);
    await user.type(passwordField, 'wrongpass');

    await user.click(screen.getByRole('button', { name: /تسجيل الدخول/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  test('shows loading state during submission', async () => {
    const user = userEvent.setup();
    // Make login hang until we resolve
    let resolveLogin;
    mockLogin.mockReturnValue(
      new Promise(resolve => {
        resolveLogin = resolve;
      }),
    );

    render(<SimpleLogin />);

    const emailField = screen.getByLabelText(/البريد الإلكتروني/i);
    const passwordField = getPasswordField();

    await user.clear(emailField);
    await user.type(emailField, 'a@b.com');
    await user.clear(passwordField);
    await user.type(passwordField, 'pass');

    await user.click(screen.getByRole('button', { name: /تسجيل الدخول/i }));

    // Button should show loading text
    await waitFor(() => {
      expect(screen.getByText(/جاري تسجيل الدخول/i)).toBeInTheDocument();
    });

    // Resolve the login
    resolveLogin({ success: true });

    await waitFor(() => {
      expect(screen.queryByText(/جاري تسجيل الدخول/i)).not.toBeInTheDocument();
    });
  });
});
