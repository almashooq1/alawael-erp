/**
 * 🛡️ SectionErrorFallback — Per-section Error Boundary
 * حدود خطأ خفيفة لكل قسم — تعزل العطل دون تعطيل بقية لوحة التحكم
 */

import { Component } from 'react';
import { Box, Typography, Button, Collapse } from '@mui/material';
import logger from '../../../utils/logger';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

class SectionErrorFallback extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorTime: null, errorMessage: '', showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorTime: new Date(), errorMessage: error?.message || 'خطأ غير معروف' };
  }

  componentDidCatch(error, info) {
    logger.warn(`[SectionError] ${this.props.label || 'Unknown'}:`, error, info);
  }

  handleRetry = () => this.setState({ hasError: false, errorTime: null, errorMessage: '', showDetails: false });

  toggleDetails = () => this.setState(prev => ({ showDetails: !prev.showDetails }));

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            p: 3,
            borderRadius: 4,
            border: '1px dashed rgba(244,67,54,0.3)',
            background: 'rgba(244,67,54,0.02)',
            textAlign: 'center',
            my: 1,
            animation: 'fadeInError 0.4s ease-out',
            '@keyframes fadeInError': {
              '0%': { opacity: 0, transform: 'scale(0.97)' },
              '100%': { opacity: 1, transform: 'scale(1)' },
            },
          }}
        >
          <ErrorOutlineIcon sx={{ fontSize: 32, color: '#f44336', opacity: 0.6, mb: 0.5 }} />
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            تعذّر تحميل قسم {this.props.label || 'غير معروف'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
            بقية الأقسام تعمل بشكل طبيعي
          </Typography>
          {this.state.errorTime && (
            <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 1, fontSize: '0.65rem' }}>
              وقت الخطأ: {this.state.errorTime.toLocaleTimeString('ar-SA')}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={this.handleRetry}
              sx={{
                fontWeight: 700,
                fontSize: '0.75rem',
                borderRadius: 2,
                color: '#667eea',
              }}
            >
              إعادة المحاولة
            </Button>
            <Button
              size="small"
              endIcon={<ExpandMoreIcon sx={{ transform: this.state.showDetails ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />}
              onClick={this.toggleDetails}
              sx={{
                fontWeight: 600,
                fontSize: '0.7rem',
                borderRadius: 2,
                color: 'text.disabled',
              }}
            >
              تفاصيل
            </Button>
          </Box>
          <Collapse in={this.state.showDetails}>
            <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, background: 'rgba(0,0,0,0.03)', textAlign: 'right' }}>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.68rem', color: 'text.secondary', wordBreak: 'break-word' }}>
                {this.state.errorMessage}
              </Typography>
            </Box>
          </Collapse>
        </Box>
      );
    }
    return (
      <section role={this.props.role || 'region'} aria-labelledby={this.props['aria-labelledby']}>
        {this.props.children}
      </section>
    );
  }
}

export default SectionErrorFallback;
