import React from 'react';
import {
  Container, Paper, TextField, Button, Box, Typography, FormControlLabel,
  Checkbox, Card, CardContent, CircularProgress, Alert, Grid, Select, MenuItem
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import authService from '../services/auth.service';

const useStyles = makeStyles((theme) => ({
  root: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  container: {
    maxWidth: 400,
  },
  paper: {
    padding: theme.spacing(4),
    borderRadius: theme.spacing(2),
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
  },
  title: {
    marginBottom: theme.spacing(3),
    textAlign: 'center',
    fontWeight: 600,
    color: theme.palette.primary.main,
  },
  field: {
    marginBottom: theme.spacing(2),
  },
  button: {
    marginTop: theme.spacing(3),
    padding: theme.spacing(1.5),
    fontSize: '1rem',
    fontWeight: 500,
  },
  portalSection: {
    marginBottom: theme.spacing(3),
    padding: theme.spacing(2),
    backgroundColor: '#f5f5f5',
    borderRadius: theme.spacing(1),
  },
  errorAlert: {
    marginBottom: theme.spacing(2),
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  registerLink: {
    marginTop: theme.spacing(2),
    textAlign: 'center',
    '& a': {
      color: theme.palette.primary.main,
      textDecoration: 'none',
      fontWeight: 500,
      '&:hover': {
        textDecoration: 'underline',
      },
    },
  },
}));

const LoginPage = () => {
  const classes = useStyles();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
    rememberMe: false,
    portal: 'beneficiary',
  });

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate inputs
      if (!formData.email || !formData.password) {
        setError(t('login.validation.required'));
        setLoading(false);
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        setError(t('login.validation.invalidEmail'));
        setLoading(false);
        return;
      }

      // Call login service
      const response = await authService.login({
        email: formData.email,
        password: formData.password,
        portal: formData.portal,
      });

      if (response.error) {
        setError(response.error);
        setLoading(false);
        return;
      }

      // Save remember me preference
      if (formData.rememberMe) {
        localStorage.setItem('rememberedEmail', formData.email);
        localStorage.setItem('rememberedPortal', formData.portal);
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPortal');
      }

      // Dispatch login action to Redux
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: response.user,
          token: response.token,
          portal: formData.portal,
        },
      });

      // Store in localStorage for persistence
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('userPortal', formData.portal);
      localStorage.setItem('user', JSON.stringify(response.user));

      // Navigate to appropriate dashboard
      const dashboardPath = formData.portal === 'beneficiary' ? '/beneficiary' : '/guardian';
      navigate(dashboardPath);
    } catch (err) {
      console.error('Login error:', err);
      setError(t('login.error.generic') || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load remembered credentials
  React.useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    const rememberedPortal = localStorage.getItem('rememberedPortal');
    if (rememberedEmail) {
      setFormData((prev) => ({
        ...prev,
        email: rememberedEmail,
        portal: rememberedPortal || 'beneficiary',
        rememberMe: true,
      }));
    }
  }, []);

  if (loading) {
    return (
      <Box className={classes.root}>
        <Box className={classes.loadingContainer}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box className={classes.root}>
      <Container maxWidth="sm" className={classes.container}>
        <Paper className={classes.paper}>
          <Typography variant="h4" className={classes.title}>
            {t('login.title')}
          </Typography>

          {error && (
            <Alert severity="error" className={classes.errorAlert}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            {/* Portal Selection */}
            <Box className={classes.portalSection}>
              <Typography variant="subtitle2" gutterBottom>
                {t('login.portalType')}
              </Typography>
              <Select
                fullWidth
                name="portal"
                value={formData.portal}
                onChange={handleChange}
              >
                <MenuItem value="beneficiary">
                  {t('login.portal.beneficiary')}
                </MenuItem>
                <MenuItem value="guardian">
                  {t('login.portal.guardian')}
                </MenuItem>
              </Select>
            </Box>

            {/* Email Field */}
            <TextField
              fullWidth
              type="email"
              name="email"
              label={t('login.email')}
              value={formData.email}
              onChange={handleChange}
              placeholder={t('login.emailPlaceholder')}
              className={classes.field}
              variant="outlined"
              autoComplete="email"
              required
            />

            {/* Password Field */}
            <TextField
              fullWidth
              type="password"
              name="password"
              label={t('login.password')}
              value={formData.password}
              onChange={handleChange}
              placeholder={t('login.passwordPlaceholder')}
              className={classes.field}
              variant="outlined"
              autoComplete="current-password"
              required
            />

            {/* Remember Me & Forgot Password */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="rememberMe"
                    color="primary"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                  />
                }
                label={t('login.rememberMe')}
              />
              <Typography>
                <a href="/forgot-password" style={{ color: '#667eea', textDecoration: 'none' }}>
                  {t('login.forgotPassword')}
                </a>
              </Typography>
            </Box>

            {/* Login Button */}
            <Button
              fullWidth
              variant="contained"
              color="primary"
              className={classes.button}
              type="submit"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : t('login.button')}
            </Button>

            {/* Register Link */}
            <Box className={classes.registerLink}>
              <Typography variant="body2">
                {t('login.noAccount')}{' '}
                <a href="/register">
                  {t('login.registerHere')}
                </a>
              </Typography>
            </Box>
          </Box>

          {/* Demo Credentials Card */}
          <Card style={{ marginTop: 24, backgroundColor: '#f5f5f5' }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                {t('login.demoCredentials')}
              </Typography>
              <Typography variant="body2">
                <strong>{t('login.student')}:</strong>
              </Typography>
              <Typography variant="caption">
                Email: student@example.com<br />
                Password: demo123
              </Typography>
              <Typography variant="body2" style={{ marginTop: 8 }}>
                <strong>{t('login.parent')}:</strong>
              </Typography>
              <Typography variant="caption">
                Email: parent@example.com<br />
                Password: demo123
              </Typography>
            </CardContent>
          </Card>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage;
