import React, { useState } from 'react';
import { OrgBrandingProvider, useOrgBranding } from '../components/OrgBrandingContext';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Link as MuiLink,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';

const OrgBrandingHeader = () => {
  const { branding } = useOrgBranding();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
      {branding.logo && (
        <img
          src={branding.logo}
          alt={branding.name || 'شعار المؤسسة'}
          style={{
            maxHeight: 60,
            maxWidth: 160,
            borderRadius: 4,
            background: '#fff',
            border: '1px solid #eee',
            marginBottom: 8,
          }}
        />
      )}
      <Typography variant="h5" sx={{ color: branding.color, fontWeight: 700, mb: 1 }}>
        {branding.name}
      </Typography>
    </Box>
  );
};

const LoginContent = () => {
  const navigate = useNavigate();
  const { login, error } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validationSchema = Yup.object().shape({
    email: Yup.string().email('Invalid email address').required('Email is required'),
    password: Yup.string()
      .required('Password is required')
      .min(6, 'Password must be at least 6 characters'),
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      setIsSubmitting(true);
      const { success } = await login(values.email, values.password);
      if (success) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsSubmitting(false);
      setSubmitting(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <OrgBrandingHeader />
        <Typography component="h1" variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
          Welcome back
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Log in to your Splitwise account
        </Typography>
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ errors, touched }) => (
              <Form>
                <Field
                  as={TextField}
                  margin="normal"
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  error={touched.email && Boolean(errors.email)}
                  helperText={touched.email && errors.email}
                  sx={{ mb: 2 }}
                />
                <Field
                  as={TextField}
                  margin="normal"
                  fullWidth
                  name="password"
                  label="Password"
                  type="password"
                  id="password"
                  autoComplete="current-password"
                  error={touched.password && Boolean(errors.password)}
                  helperText={touched.password && errors.password}
                  sx={{ mb: 3 }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={isSubmitting}
                  sx={{ py: 1.5, mb: 2 }}
                >
                  {isSubmitting ? <CircularProgress size={24} /> : 'Log In'}
                </Button>
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <MuiLink
                    component={Link}
                    to="/forgot-password"
                    variant="body2"
                    sx={{ textDecoration: 'none' }}
                  >
                    Forgot password?
                  </MuiLink>
                </Box>
              </Form>
            )}
          </Formik>
        </Paper>
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Don't have an account?{' '}
            <MuiLink
              component={Link}
              to="/register"
              variant="body2"
              sx={{ textDecoration: 'none', fontWeight: 'medium' }}
            >
              Sign up
            </MuiLink>
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

const Login = () => {
  const orgId = window.ORG_ID || localStorage.getItem('orgId') || 'default-org';
  return (
    <OrgBrandingProvider orgId={orgId}>
      <LoginContent />
    </OrgBrandingProvider>
  );
};

export default Login;
