import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, Login as LoginIcon } from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setValidationError('');
    clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    // Basic validation
    if (!formData.email || !formData.password) {
      setValidationError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={10}
          sx={{
            p: 4,
            borderRadius: 2,
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom fontWeight="bold" color="primary">
            نظام الأوائل ERP
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            مرحباً بك! الرجاء تسجيل الدخول للمتابعة
          </Typography>

          {(error || validationError) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error || validationError}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              fullWidth
              label="البريد الإلكتروني"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="email"
              autoFocus
              disabled={isLoading}
            />

            <TextField
              fullWidth
              label="كلمة المرور"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="current-password"
              disabled={isLoading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disabled={isLoading}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : <LoginIcon />}
              sx={{ mt: 3, mb: 2, py: 1.5 }}
            >
              {isLoading ? 'جاري التسجيل...' : 'تسجيل الدخول'}
            </Button>
          </Box>

          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>تجربة النظام:</strong>
              <br />
              البريد: admin@alawael.com
              <br />
              كلمة المرور: Admin@123456
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
