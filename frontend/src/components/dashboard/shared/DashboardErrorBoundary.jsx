/**
 * 🛡️ DashboardErrorBoundary — Graceful Error Handling for Dashboard
 * حدود خطأ لالتقاط أعطال المكونات ومنع تعطل لوحة التحكم بالكامل
 */

import { Component } from 'react';
import logger from '../../../utils/logger';
import { statusColors, gradients } from '../../../theme/palette';
import {
  Box,
  Button,
  Paper,
  Typography
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';

class DashboardErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('[DashboardErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 5,
              borderRadius: 4,
              textAlign: 'center',
              maxWidth: 480,
              border: '1px solid rgba(244,67,54,0.15)',
              background: 'rgba(244,67,54,0.02)',
            }}
          >
            <ErrorOutlineIcon
              sx={{ fontSize: 56, color: statusColors.error, mb: 2, opacity: 0.8 }}
            />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              حدث خطأ غير متوقع
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              تعذّر عرض لوحة التحكم. يمكنك المحاولة مرة أخرى أو التواصل مع الدعم الفني.
            </Typography>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Typography
                variant="caption"
                component="pre"
                sx={{
                  textAlign: 'left',
                  direction: 'ltr',
                  background: 'rgba(0,0,0,0.04)',
                  p: 1.5,
                  borderRadius: 2,
                  mb: 2,
                  overflow: 'auto',
                  maxHeight: 120,
                  fontSize: '0.7rem',
                  color: statusColors.errorDark,
                }}
              >
                {this.state.error.toString()}
              </Typography>
            )}
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={this.handleReset}
              sx={{
                borderRadius: 3,
                px: 4,
                fontWeight: 700,
                background: gradients.primary,
                '&:hover': {
                  background: gradients.primaryReversed,
                },
              }}
            >
              إعادة المحاولة
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default DashboardErrorBoundary;
