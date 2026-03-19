import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import logger from 'utils/logger';
import { captureException } from 'utils/sentry';

/**
 * Global Error Boundary
 * Catches unhandled render errors and shows a fallback UI
 * Automatically reports errors to Sentry when configured
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Auto-reload on ChunkLoadError (stale build)
    const isChunkError =
      error && (error.name === 'ChunkLoadError' || /loading chunk/i.test(error.message));
    if (isChunkError && !sessionStorage.getItem('chunk_boundary_reload')) {
      sessionStorage.setItem('chunk_boundary_reload', '1');
      window.location.reload();
      return;
    }
    sessionStorage.removeItem('chunk_boundary_reload');

    // Report to Sentry
    captureException(error, {
      componentStack: errorInfo?.componentStack,
      boundary: this.props.name || 'GlobalErrorBoundary',
    });
    logger.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="100vh"
          p={3}
          textAlign="center"
        >
          <Typography variant="h4" gutterBottom>
            حدث خطأ غير متوقع
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={3}>
            نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى.
          </Typography>
          <Box display="flex" gap={2}>
            <Button variant="contained" color="primary" onClick={this.handleReset}>
              حاول مرة أخرى
            </Button>
            <Button variant="outlined" onClick={() => (window.location.href = '/')}>
              العودة للرئيسية
            </Button>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
