/**
 * 🛡️ RouteErrorBoundary — Route-Level Error Isolation
 * حاجز أخطاء على مستوى المسار — يحافظ على القائمة الجانبية والتنقل
 * عند حدوث خطأ في أي صفحة
 *
 * Resets automatically when the user navigates to a different route.
 * Must receive `locationKey` prop to detect navigation changes.
 */

import { Component } from 'react';
import logger from '../../utils/logger';
import { gradients, statusColors, brandColors } from '../../theme/palette';

class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('[RouteErrorBoundary]', error, errorInfo);
  }

  /**
   * Auto-reset when the user navigates away (locationKey changes).
   * This ensures the error state clears without a full page reload.
   */
  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.locationKey !== this.props.locationKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: '50vh',
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
              maxWidth: 520,
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
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.8 }}>
              تعذّر عرض هذه الصفحة. يمكنك المحاولة مرة أخرى أو الانتقال
              إلى الصفحة الرئيسية.
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

            <Stack direction="row" spacing={1.5} justifyContent="center">
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={this.handleReset}
                sx={{
                  borderRadius: 3,
                  px: 3,
                  fontWeight: 700,
                  background: gradients.primary,
                  '&:hover': {
                    background: gradients.primaryReversed,
                  },
                }}
              >
                إعادة المحاولة
              </Button>
              <Button
                variant="outlined"
                startIcon={<HomeIcon />}
                href="/home"
                sx={{
                  borderRadius: 3,
                  px: 3,
                  fontWeight: 700,
                  borderColor: 'rgba(102,126,234,0.3)',
                  color: brandColors.primaryStart,
                  '&:hover': {
                    borderColor: brandColors.primaryStart,
                    background: 'rgba(102,126,234,0.04)',
                  },
                }}
              >
                الصفحة الرئيسية
              </Button>
            </Stack>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default RouteErrorBoundary;
