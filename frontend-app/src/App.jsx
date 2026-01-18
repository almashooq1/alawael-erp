import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import HRPage from './pages/HRPage';
import CRMPage from './pages/CRMPage';
import ELearningPage from './pages/ELearningPage';
import DocumentsPage from './pages/DocumentsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import MainLayout from './layouts/MainLayout';

// RTL Theme for Arabic
const theme = createTheme({
  direction: 'rtl',
  typography: {
    fontFamily: '"Cairo", "Roboto", "Arial", sans-serif',
  },
  palette: {
    primary: {
      main: '#667eea',
      light: '#8b9cf7',
      dark: '#4c63d2',
    },
    secondary: {
      main: '#764ba2',
      light: '#9b6ec6',
      dark: '#5a3780',
    },
  },
});

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="hr" element={<HRPage />} />
            <Route path="crm" element={<CRMPage />} />
            <Route path="elearning" element={<ELearningPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <ToastContainer position="bottom-left" rtl />
    </ThemeProvider>
  );
}

export default App;
