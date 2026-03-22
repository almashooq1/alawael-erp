import React from 'react';
import { Box, Typography, Button, Paper, Collapse } from '@mui/material';
import logger from 'utils/logger';
import { captureException } from 'utils/sentry';

/**
 * Global Error Boundary
 * Catches unhandled render errors and shows a fallback UI
 *
 * Enhanced with:
 *  - Auto-recovery with retry countdown
 *  - ChunkLoadError auto-reload (stale build)
 *  - Collapsible error details for debugging
 *  - Error history tracking
 *  - Sentry reporting with component stack
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      showDetails: false,
      retryCountdown: 0,
    };
    this._retryTimer = null;
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const newCount = this.state.errorCount + 1;
    this.setState({ errorInfo, errorCount: newCount });

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
      errorCount: newCount,
    });
    logger.error('[ErrorBoundary]', error, errorInfo);

    // Auto-retry after 10 seconds if first occurrence
    if (newCount <= 2) {
      this.startRetryCountdown(10);
    }
  }

  componentWillUnmount() {
    if (this._retryTimer) clearInterval(this._retryTimer);
  }

  startRetryCountdown = (seconds) => {
    this.setState({ retryCountdown: seconds });
    this._retryTimer = setInterval(() => {
      this.setState(prev => {
        if (prev.retryCountdown <= 1) {
          clearInterval(this._retryTimer);
          this.handleReset();
          return { retryCountdown: 0 };
        }
        return { retryCountdown: prev.retryCountdown - 1 };
      });
    }, 1000);
  };

  handleReset = () => {
    if (this._retryTimer) clearInterval(this._retryTimer);
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false, retryCountdown: 0 });
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorCount, showDetails, retryCountdown } = this.state;

      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="100vh"
          p={3}
          textAlign="center"
          dir="rtl"
        >
          <Paper elevation={3} sx={{ p: 4, maxWidth: 500, width: '100%' }}>
            <Typography variant="h4" gutterBottom color="error.main">
              ⚠️ حدث خطأ غير متوقع
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={2}>
              نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى.
            </Typography>

            {errorCount > 2 && (
              <Typography variant="body2" color="warning.main" mb={2}>
                تكرر هذا الخطأ {errorCount} مرات. قد تحتاج لتحديث الصفحة بالكامل.
              </Typography>
            )}

            {retryCountdown > 0 && (
              <Typography variant="body2" color="info.main" mb={2}>
                إعادة المحاولة تلقائياً خلال {retryCountdown} ثانية...
              </Typography>
            )}

            <Box display="flex" gap={2} justifyContent="center" mb={2}>
              <Button variant="contained" color="primary" onClick={this.handleReset}>
                حاول مرة أخرى
              </Button>
              <Button variant="outlined" onClick={() => (window.location.href = '/')}>
                العودة للرئيسية
              </Button>
              <Button
                variant="text"
                size="small"
                onClick={() => window.location.reload()}
              >
                تحديث الصفحة
              </Button>
            </Box>

            {process.env.NODE_ENV !== 'production' && (
              <>
                <Button
                  variant="text"
                  size="small"
                  onClick={this.toggleDetails}
                  sx={{ textDecoration: 'underline' }}
                >
                  {showDetails ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                </Button>
                <Collapse in={showDetails}>
                  <Box
                    mt={2}
                    p={2}
                    sx={{
                      backgroundColor: 'grey.100',
                      borderRadius: 1,
                      textAlign: 'left',
                      direction: 'ltr',
                      maxHeight: 300,
                      overflow: 'auto',
                      fontSize: 12,
                      fontFamily: 'monospace',
                    }}
                  >
                    <Typography variant="caption" component="pre" display="block">
                      {error?.toString()}
                    </Typography>
                    {errorInfo?.componentStack && (
                      <Typography variant="caption" component="pre" display="block" mt={1} color="text.secondary">
                        {errorInfo.componentStack}
                      </Typography>
                    )}
                  </Box>
                </Collapse>
              </>
            )}
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
